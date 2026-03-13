const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')

// ====== 路径常量 ======
const DATA_DIR = path.join(__dirname, '..', 'data', 'IT')
const CACHE_DIR = path.join(__dirname, 'cache')
const CACHE_FILE = path.join(CACHE_DIR, 'recipe_cache.json')
const parser = new xml2js.Parser()

// ====== 内存单例缓存 ======
let _cache = null   // { allItems: Map, recipesByProduct: Map, nameToIds: Map, productIndex: Map }
let _initPromise = null  // 防止并发初始化

// ====== 版本检测 ======

/** 从 IT 目录获取数据版本（基于 VERSION_MARK 文件名） */
const getDataVersion = () => {
  try {
    const files = fs.readdirSync(DATA_DIR)
    const versionFile = files.find(f => f.startsWith('VERSION_MARK_'))
    if (versionFile) return versionFile
  } catch (e) { /* ignore */ }
  try {
    return ['production.xml', 'manualform.xml', 'cookingrecipe.xml']
      .map(f => {
        try { return fs.statSync(path.join(DATA_DIR, f)).mtimeMs } catch (e) { return 0 }
      }).join('_')
  } catch (e) { return 'unknown' }
}

// ====== XML 工具函数 ======

/** 读取 UTF-16LE 编码的XML文件并解析 */
const readXmlParse = filePath => new Promise((resolve, reject) => {
  try {
    const file = fs.readFileSync(filePath, 'utf-16le')
    parser.parseString(file, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  } catch (e) { reject(e) }
})

/** 读取 .china.txt 翻译文件，返回翻译表 */
const loadTranslation = (filePath, xmlTag) => {
  const map = {}
  try {
    const txt = fs.readFileSync(filePath, 'utf-8')
    const lines = txt.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const tab = lines[i].indexOf('\t')
      if (tab > 0) {
        const key = lines[i].substring(0, tab).trim()
        const val = lines[i].substring(tab + 1).trim()
        if (key && val) {
          map[`_LT[xml.${xmlTag}.${key}]`] = val
        }
      }
    }
  } catch (e) { /* ignore */ }
  return map
}

// ====== 材料路径匹配 ======

/**
 * 匹配分类路径模式与物品分类
 * 例如: pattern="/material/tailor/leather/04/*" 匹配 category="/stack_item/material/tailor/leather/04/cheap_leather"
 */
const matchCategory = (pattern, category) => {
  if (!pattern || !category) return false
  const segments = pattern.split('*')
  let pos = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.length === 0) continue
    const idx = category.indexOf(seg, pos)
    if (idx === -1) return false
    pos = idx + seg.length
  }
  return true
}

// ====== 物品数据库配置 ======
const ITEM_DB_FILES = [
  { xml: 'itemdb.xml', txt: 'itemdb.china.txt', tag: 'itemdb' },
  { xml: 'itemdb_etc.xml', txt: 'itemdb_etc.china.txt', tag: 'itemdb_etc' },
  { xml: 'itemdb_weapon.xml', txt: 'itemdb_weapon.china.txt', tag: 'itemdb_weapon' },
  { xml: 'itemdb_mainequip.xml', txt: 'itemdb_mainequip.china.txt', tag: 'itemdb_mainequip' },
  { xml: 'itemdb_subequip.xml', txt: 'itemdb_subequip.china.txt', tag: 'itemdb_subequip' },
]

// ====== 物品加载 ======

/** 从XML加载所有物品数据，返回 { itemMap, nameMap } */
const loadAllItemsFromXml = async () => {
  const itemMap = new Map()  // id → { id, name, category }
  const nameMap = new Map()  // name → [id, ...]

  for (const dbFile of ITEM_DB_FILES) {
    const xmlPath = path.join(DATA_DIR, dbFile.xml)
    const txtPath = path.join(DATA_DIR, dbFile.txt)
    if (!fs.existsSync(xmlPath) || !fs.existsSync(txtPath)) continue

    const xmlData = await readXmlParse(xmlPath)
    const transform = loadTranslation(txtPath, dbFile.tag)
    const items = (xmlData.Items && xmlData.Items.Mabi_Item) || []

    for (let i = 0; i < items.length; i++) {
      const $ = items[i].$
      const id = parseInt($.ID)
      if (!id) continue
      const name = transform[$.Text_Name1] || $.Text_Name0 || ''
      if (!name) continue

      // 同ID不同feature取第一个有名字的
      if (!itemMap.has(id)) {
        itemMap.set(id, { id, name, category: $.Category || '' })
      }
      // 名称索引
      if (!nameMap.has(name)) nameMap.set(name, [])
      const arr = nameMap.get(name)
      if (!arr.includes(id)) arr.push(id)
    }
  }

  return { itemMap, nameMap }
}

// ====== 材料解析（带备忘录缓存） ======

/** 
 * 将单个 pattern 匹配到物品（带备忘录缓存）
 * 许多配方共享相同的材料 pattern，缓存避免重复全表扫描
 */
const _patternCache = new Map()

const resolvePattern = (pattern, allItems) => {
  if (_patternCache.has(pattern)) return _patternCache.get(pattern)

  let bestMatch = null
  for (const [, item] of allItems) {
    if (matchCategory(pattern, item.category)) {
      bestMatch = item
      // 优先选非活动物品
      if (!item.name.includes('活动')) break
    }
  }

  const result = bestMatch
    ? { id: bestMatch.id, name: bestMatch.name }
    : null
  _patternCache.set(pattern, result)
  return result
}

/** 将 Essentials 字符串解析为材料数组 */
const resolveEssentials = (str, allItems) => {
  if (!str) return []
  const materials = []
  const parts = str.split(';')

  for (let i = 0; i < parts.length; i++) {
    const sub = parts[i].split(',')
    const pattern = (sub[0] || '').trim()
    const count = parseInt(sub[1]) || 0
    if (!pattern) continue

    const match = resolvePattern(pattern, allItems)
    if (match) {
      materials.push({ id: match.id, name: match.name, count })
    } else {
      const seg = pattern.split('/').filter(s => s && s !== '*')
      materials.push({ id: 0, name: seg.pop() || pattern, count })
    }
  }
  return materials
}

/** 解析 CompleteEssentials（带括号，可能有多种变体） */
const resolveCompleteEssentials = (str, allItems) => {
  if (!str) return { materials: [], hasVariants: false }

  const variants = str.trim().split('\n').map(v => {
    let s = v.trim()
    if (s.startsWith('(')) s = s.substring(1)
    if (s.endsWith(')')) s = s.substring(0, s.length - 1)
    return s
  }).filter(v => v)

  if (!variants.length) return { materials: [], hasVariants: false }

  // 取最短的变体作为默认展示
  variants.sort((a, b) => a.length - b.length)
  const materials = resolveEssentials(variants[0], allItems)

  return { materials, hasVariants: variants.length > 1, variantCount: variants.length }
}

// ====== 配方映射表 ======

const PRODUCTION_SKILL_MAP = {
  'Spinning':            { skillName: '纺织',         skillCode: 'Spinning',            skillId: 10014 },
  'Weaving':             { skillName: '纺织',         skillCode: 'Weaving',             skillId: 10014 },
  'Refine':              { skillName: '冶炼',         skillCode: 'Refine',              skillId: 10015 },
  'Milling':             { skillName: '碾磨',         skillCode: 'Milling',             skillId: 10012 },
  'PotionMaking':        { skillName: '药剂制作',     skillCode: 'PotionMaking',        skillId: 10022 },
  'Handicraft':          { skillName: '手艺',         skillCode: 'Handicraft',          skillId: 10013 },
  'ManaForming':         { skillName: '魔法组合',     skillCode: 'ManaForming',         skillId: 35001 },
  'CrystalMaking':       { skillName: '结晶制作',     skillCode: 'CrystalMaking',       skillId: 0 },
  'MetalExtraction':     { skillName: '金属转换',     skillCode: 'MetalExtraction',     skillId: 35012 },
  'Carpentry':           { skillName: '木工',         skillCode: 'Carpentry',           skillId: 10033 },
  'StageTicket':         { skillName: '制作戏剧任务通行证', skillCode: 'StageTicket',   skillId: 10036 },
  'PerfumeMaking':       { skillName: '调香',         skillCode: 'PerfumeMaking',       skillId: 0 },
  'HeulwenEngineering':  { skillName: '希尔文工学',   skillCode: 'HeulwenEngineering',  skillId: 10040 },
  'MagicCraft':          { skillName: '魔法工艺',     skillCode: 'MagicCraft',          skillId: 10041 },
  'FynnsCraft':          { skillName: '菲恩工艺制作', skillCode: 'FynnsCraft',          skillId: 27103 },
  'StationaryCraft':     { skillName: '书写用具工艺', skillCode: 'StationaryCraft',     skillId: 10104 },
  'StellarCraft':        { skillName: '星光工艺',     skillCode: 'StellarCraft',        skillId: 0 },
}

const MANUAL_SKILL_MAP = {
  'Tailoring':         { skillName: '衣物制作',       skillCode: 'Tailoring',   skillId: 10001 },
  'Tailoring_Arbeit':  { skillName: '衣物制作(兼职)', skillCode: 'Tailoring',   skillId: 10001 },
  'BlackSmith':        { skillName: '打铁',           skillCode: 'BlackSmith',  skillId: 10016 },
  'BlackSmith_Arbeit': { skillName: '打铁(兼职)',     skillCode: 'BlackSmith',  skillId: 10016 },
}

const COOKING_ACTION_MAP = {
  'mix': '拌', 'boil': '煮', 'bake': '烤', 'fry': '炸',
  'knead': '揉面', 'make_noodle': '制面', 'make_pasta': '意面',
  'make_jam': '果酱', 'make_pie': '派', 'make_pizza': '披萨',
  'steam': '蒸', 'steamed_dish': '蒸菜',
  'cook_with_strong_fire': '大火烤', 'fry_with_much_oil': '油炸',
  'ferment': '发酵', 'fillet': '切片', 'sousvide': '低温烹饪',
}

// ====== 配方加载 ======

/** 加载 production.xml */
const loadProductionRecipes = async (allItems) => {
  const recipes = []
  const xmlPath = path.join(DATA_DIR, 'production.xml')
  const txtPath = path.join(DATA_DIR, 'production.china.txt')
  if (!fs.existsSync(xmlPath)) return recipes

  const xmlData = await readXmlParse(xmlPath)
  const transform = loadTranslation(txtPath, 'production')
  const root = xmlData.Production

  for (const [section, skillInfo] of Object.entries(PRODUCTION_SKILL_MAP)) {
    if (!root[section] || !root[section][0] || !root[section][0].Production) continue

    const prods = root[section][0].Production
    for (let i = 0; i < prods.length; i++) {
      const $ = prods[i].$
      const productId = parseInt($.ProductItemId)
      if (!productId) continue
      // 跳过练习条目
      if (parseInt($.ProductionId) >= 10000) continue

      const title = $.Title ? (transform[$.Title] || $.Title) : ''
      const desc = $.Desc ? (transform[$.Desc] || '') : ''
      const essentialDesc = $.EssentialDesc ? (transform[$.EssentialDesc] || '') : ''
      const difficulty = parseInt($.Difficulty) || 0

      // 成功率
      const successRates = {}
      for (let r = 0; r <= 18; r++) {
        if ($[`SuccessRate_${r}`] !== undefined) {
          successRates[r] = parseInt($[`SuccessRate_${r}`])
        }
      }

      const materials = resolveEssentials($.Essentials, allItems)
      const productItem = allItems.get(productId)

      recipes.push({
        type: 'production',
        productId,
        productName: productItem ? productItem.name : title,
        productCount: parseInt($.ProductionCount) || 1,
        skillName: skillInfo.skillName,
        skillCode: skillInfo.skillCode,
        section,
        title, desc, essentialDesc, difficulty,
        materials, successRates,
        merchantExp: parseInt($.MerchantExp) || 0,
        rainBonus: parseInt($.SuccessRateBonusInRain) || 0,
      })
    }
  }
  return recipes
}

/** 加载 manualform.xml */
const loadManualFormRecipes = async (allItems) => {
  const recipes = []
  const xmlPath = path.join(DATA_DIR, 'manualform.xml')
  const txtPath = path.join(DATA_DIR, 'manualform.china.txt')
  if (!fs.existsSync(xmlPath)) return recipes

  const xmlData = await readXmlParse(xmlPath)
  const transform = loadTranslation(txtPath, 'manualform')
  const root = xmlData.ManualForm

  for (const [section, skillInfo] of Object.entries(MANUAL_SKILL_MAP)) {
    if (!root[section] || !root[section][0] || !root[section][0].ManualForm) continue

    const manuals = root[section][0].ManualForm
    for (let i = 0; i < manuals.length; i++) {
      const $ = manuals[i].$
      const productId = parseInt($.ProductItemID)
      if (!productId) continue

      const manualName = $.ManualNameLocal ? (transform[$.ManualNameLocal] || '') : ''
      const title = $.Title ? (transform[$.Title] || '') : ''
      const desc = $.Desc ? (transform[$.Desc] || '') : ''
      const essentialDesc = $.EssentialDesc ? (transform[$.EssentialDesc] || '') : ''
      const completeDesc = $.CompleteDesc ? (transform[$.CompleteDesc] || '') : ''
      const level = parseInt($.Level) || 0
      const maxProgress = parseFloat($.MaxProgress) || 0

      const materials = resolveEssentials($.Essentials, allItems)
      const completeResult = resolveCompleteEssentials($.CompleteEssentials, allItems)
      const productItem = allItems.get(productId)

      let productName = productItem ? productItem.name : ''
      if (!productName && manualName) {
        const parts = manualName.split('-')
        productName = parts.length > 1 ? parts[parts.length - 1].trim() : manualName
      }

      recipes.push({
        type: 'manual',
        productId,
        productName,
        productCount: 1,
        skillName: skillInfo.skillName,
        skillCode: skillInfo.skillCode,
        section,
        manualName, title, desc, essentialDesc, completeDesc,
        level, maxProgress,
        materials,
        completeMaterials: completeResult.materials,
        hasCompleteVariants: completeResult.hasVariants,
        completeVariantCount: completeResult.variantCount || 0,
        manualItemId: parseInt($.ManualItemID) || 0,
        formId: parseInt($.FormID) || 0,
        price: parseInt($.Price) || 0,
      })
    }
  }
  return recipes
}

/** 加载 cookingrecipe.xml */
const loadCookingRecipes = async (allItems) => {
  const recipes = []
  const xmlPath = path.join(DATA_DIR, 'cookingrecipe.xml')
  const txtPath = path.join(DATA_DIR, 'cookingrecipe.china.txt')
  if (!fs.existsSync(xmlPath)) return recipes

  const xmlData = await readXmlParse(xmlPath)
  const transform = loadTranslation(txtPath, 'cookingrecipe')
  const recipeList = (xmlData.CookingRecipe && xmlData.CookingRecipe.recipe) || []

  for (let i = 0; i < recipeList.length; i++) {
    const $ = recipeList[i].$
    const productId = parseInt($.result_item)
    if (!productId) continue

    const localName = $.localname ? (transform[$.localname] || $.localname) : ''
    const action = $.action || ''

    const materials = []
    const essentials = recipeList[i].essential || []
    for (let j = 0; j < essentials.length; j++) {
      const sources = essentials[j].source || []
      for (let k = 0; k < sources.length; k++) {
        const s$ = sources[k].$
        const itemId = parseInt(s$.item_id)
        const amount = parseInt(s$.amount) || 0
        const sourceItem = allItems.get(itemId)
        materials.push({
          id: itemId,
          name: sourceItem ? sourceItem.name : (s$.desc || `\u7269\u54C1${itemId}`),
          count: amount,
        })
      }
    }

    const productItem = allItems.get(productId)
    recipes.push({
      type: 'cooking',
      productId,
      productName: productItem ? productItem.name : localName,
      productCount: 1,
      skillName: '料理',
      skillCode: 'Cooking',
      section: action,
      title: localName,
      action,
      actionCn: COOKING_ACTION_MAP[action] || action,
      materials,
      cookExp: parseInt($.cookexp) || 0,
    })
  }
  return recipes
}

// ====== 缓存管理 ======

/** 保存缓存到JSON文件 */
const saveCache = (version, itemMap, nameMap, allRecipes) => {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

    const itemsArr = []
    for (const [id, item] of itemMap) {
      itemsArr.push([id, item.name, item.category])
    }

    const namesArr = []
    for (const [name, ids] of nameMap) {
      namesArr.push([name, ids])
    }

    const cacheData = {
      version,
      timestamp: Date.now(),
      items: itemsArr,
      names: namesArr,
      recipes: allRecipes,
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData), 'utf-8')
    console.log(`[dataLoader] \u7F13\u5B58\u5DF2\u4FDD\u5B58 (${(fs.statSync(CACHE_FILE).size / 1024).toFixed(1)} KB)`)
  } catch (e) {
    console.error('[dataLoader] \u7F13\u5B58\u4FDD\u5B58\u5931\u8D25:', e.message)
  }
}

/** 从JSON缓存文件加载 */
const loadCacheFile = (expectedVersion) => {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
    const data = JSON.parse(raw)
    if (data.version !== expectedVersion) {
      console.log(`[dataLoader] \u7F13\u5B58\u7248\u672C\u4E0D\u5339\u914D (${data.version} vs ${expectedVersion})`)
      return null
    }
    return data
  } catch (e) {
    console.error('[dataLoader] \u7F13\u5B58\u8BFB\u53D6\u5931\u8D25:', e.message)
    return null
  }
}

/** 从缓存数据重建内存索引 */
const buildFromCache = (cacheData) => {
  const allItems = new Map()
  for (let i = 0; i < cacheData.items.length; i++) {
    const [id, name, category] = cacheData.items[i]
    allItems.set(id, { id, name, category })
  }

  const nameToIds = new Map()
  for (let i = 0; i < cacheData.names.length; i++) {
    const [name, ids] = cacheData.names[i]
    nameToIds.set(name, ids)
  }

  const recipesByProduct = new Map()
  const productIndex = new Map()
  for (let i = 0; i < cacheData.recipes.length; i++) {
    const r = cacheData.recipes[i]
    if (!recipesByProduct.has(r.productId)) {
      recipesByProduct.set(r.productId, [])
    }
    recipesByProduct.get(r.productId).push(r)
    if (r.productName && !productIndex.has(r.productName)) {
      productIndex.set(r.productName, r.productId)
    }
  }

  return { allItems, recipesByProduct, nameToIds, productIndex }
}

// ====== 主加载流程 ======

/** 内部加载（仅被 ensureData 调用） */
const _doLoad = async () => {
  const version = getDataVersion()
  console.log(`[dataLoader] \u6570\u636E\u7248\u672C: ${version}`)

  // 尝试从缓存加载
  const cached = loadCacheFile(version)
  if (cached) {
    const t0 = Date.now()
    _cache = buildFromCache(cached)
    console.log(`[dataLoader] \u4ECE\u7F13\u5B58\u52A0\u8F7D\u5B8C\u6210 (${Date.now() - t0}ms) - ${_cache.allItems.size}\u4E2A\u7269\u54C1, ${_cache.recipesByProduct.size}\u79CD\u4EA7\u54C1`)
    return _cache
  }

  // 完整加载
  console.log('[dataLoader] \u5F00\u59CB\u4ECEXML\u52A0\u8F7D\u6570\u636E...')
  const t0 = Date.now()

  const { itemMap, nameMap } = await loadAllItemsFromXml()
  console.log(`[dataLoader] \u7269\u54C1\u52A0\u8F7D\u5B8C\u6210: ${itemMap.size}\u4E2A (${Date.now() - t0}ms)`)

  // 清空 pattern 缓存（确保使用最新物品数据）
  _patternCache.clear()

  const t1 = Date.now()
  const [prodRecipes, manualRecipes, cookingRecipes] = await Promise.all([
    loadProductionRecipes(itemMap),
    loadManualFormRecipes(itemMap),
    loadCookingRecipes(itemMap),
  ])
  const allRecipes = [...prodRecipes, ...manualRecipes, ...cookingRecipes]
  console.log(`[dataLoader] \u914D\u65B9\u52A0\u8F7D\u5B8C\u6210: \u751F\u4EA7${prodRecipes.length}, \u624B\u5DE5${manualRecipes.length}, \u6599\u7406${cookingRecipes.length} (${Date.now() - t1}ms) [\u552F\u4E00pattern\u6570: ${_patternCache.size}]`)

  // 清空 pattern 缓存释放内存
  _patternCache.clear()

  // 保存缓存
  saveCache(version, itemMap, nameMap, allRecipes)

  // 构建内存索引
  const recipesByProduct = new Map()
  const productIndex = new Map()
  for (let i = 0; i < allRecipes.length; i++) {
    const r = allRecipes[i]
    if (!recipesByProduct.has(r.productId)) {
      recipesByProduct.set(r.productId, [])
    }
    recipesByProduct.get(r.productId).push(r)
    if (r.productName && !productIndex.has(r.productName)) {
      productIndex.set(r.productName, r.productId)
    }
  }

  _cache = { allItems: itemMap, recipesByProduct, nameToIds: nameMap, productIndex }
  console.log(`[dataLoader] \u5168\u90E8\u5C31\u7EEA (${Date.now() - t0}ms) - ${recipesByProduct.size}\u79CD\u4EA7\u54C1\u914D\u65B9`)
  return _cache
}

/** 确保数据已加载（使用 Promise 锁防止并发） */
const ensureData = () => {
  if (_cache) return Promise.resolve(_cache)
  if (!_initPromise) {
    _initPromise = _doLoad().catch(err => {
      _initPromise = null // 失败后允许重试
      throw err
    })
  }
  return _initPromise
}

// ====== 导出 API ======

const loadAllRecipes = async () => (await ensureData()).recipesByProduct
const getAllItems = async () => (await ensureData()).allItems
const getNameToIds = async () => (await ensureData()).nameToIds
const getProductIndex = async () => (await ensureData()).productIndex

// 模块加载时自动预热（不阻塞require）
ensureData().catch(err => {
  console.error('[dataLoader] \u9884\u70ED\u5931\u8D25:', err.message)
})

module.exports = {
  loadAllRecipes,
  getAllItems,
  getNameToIds,
  getProductIndex,
  matchCategory,
  resolveEssentials,
}
