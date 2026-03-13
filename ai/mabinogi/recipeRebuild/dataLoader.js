const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')

const DATA_DIR = path.join(__dirname, '..', 'data', 'IT')
const parser = new xml2js.Parser()

// ====== 缓存 ======
let _allItems = null        // Map<id, {id, name, category, invImage}>
let _recipesByProduct = null // Map<productId, recipe[]>
let _nameToIds = null        // Map<name, id[]>

// ====== 工具函数 ======

/** 读取 UTF-16LE 编码的XML文件并解析 */
const readXmlParse = filePath => new Promise((resolve, reject) => {
  const file = fs.readFileSync(filePath, 'utf-16le')
  parser.parseString(file, (err, result) => {
    if (err) reject(err)
    else resolve(result)
  })
})

/** 读取 .china.txt 翻译文件并构建翻译表 */
const loadTranslation = (filePath, xmlTag) => {
  const txt = fs.readFileSync(filePath, 'utf-8')
  const transform = {}
  txt.split('\n').forEach(line => {
    const sp = line.split('\t')
    if (sp[0] && sp[1]) {
      transform[`_LT[xml.${xmlTag}.${sp[0].trim()}]`] = sp[1].trim()
    }
  })
  return transform
}

/** 将 Essentials 中的分类路径匹配到实际物品 */
const matchCategory = (categoryPattern, itemCategory = '') => {
  if (!categoryPattern) return false
  const newReg = categoryPattern.replace(/\*/g, '.*')
  // 不使用^锚定开头，因为物品分类路径可能有不同前缀
  // 如 pattern="/material/tailor/leather/04/*" 需匹配 category="/stack_item/material/tailor/leather/04/"
  return new RegExp(`${newReg}$`).test(itemCategory)
}

// ====== 物品加载 ======

const ITEM_DB_FILES = [
  { xml: 'itemdb.xml', txt: 'itemdb.china.txt', tag: 'itemdb' },
  { xml: 'itemdb_etc.xml', txt: 'itemdb_etc.china.txt', tag: 'itemdb_etc' },
  { xml: 'itemdb_weapon.xml', txt: 'itemdb_weapon.china.txt', tag: 'itemdb_weapon' },
  { xml: 'itemdb_mainequip.xml', txt: 'itemdb_mainequip.china.txt', tag: 'itemdb_mainequip' },
  { xml: 'itemdb_subequip.xml', txt: 'itemdb_subequip.china.txt', tag: 'itemdb_subequip' },
]

/** 加载所有物品数据库，返回 Map<id, itemInfo> */
const loadAllItems = async () => {
  if (_allItems) return _allItems

  const itemMap = new Map()   // id → {id, name, category, invImage}
  const nameMap = new Map()   // name → [id, ...]

  for (const dbFile of ITEM_DB_FILES) {
    const xmlPath = path.join(DATA_DIR, dbFile.xml)
    const txtPath = path.join(DATA_DIR, dbFile.txt)

    if (!fs.existsSync(xmlPath) || !fs.existsSync(txtPath)) continue

    const xmlData = await readXmlParse(xmlPath)
    const transform = loadTranslation(txtPath, dbFile.tag)

    const items = xmlData.Items.Mabi_Item || []
    for (const item of items) {
      const $ = item.$
      const id = parseInt($.ID)
      const name = transform[$.Text_Name1] || $.Text_Name0 || ''
      const category = $.Category || ''
      const invImage = $.File_InvImage || ''

      if (!name) continue

      // 跳过带 feature 限制的重复条目（同ID不同feature取第一个有名字的）
      if (!itemMap.has(id)) {
        itemMap.set(id, { id, name, category, invImage })
      }

      // 名称索引
      if (!nameMap.has(name)) {
        nameMap.set(name, [])
      }
      if (!nameMap.get(name).includes(id)) {
        nameMap.get(name).push(id)
      }
    }
  }

  _allItems = itemMap
  _nameToIds = nameMap
  console.log(`[dataLoader] 物品数据库加载完成，共 ${itemMap.size} 个物品`)
  return itemMap
}

/** 将材料分类路径解析为 [{id, name, count}] */
const resolveEssentials = (essentialsStr, allItems) => {
  if (!essentialsStr) return []

  const materials = []
  const parts = essentialsStr.split(';')
    .map(x => x.split(',').map(s => s.trim()).filter(s => s))
    .filter(x => x.length)

  for (const part of parts) {
    let [pattern, countStr] = part
    const count = parseInt(countStr) || 0

    // 在所有物品中查找匹配分类路径的物品
    let bestMatch = null
    for (const [, item] of allItems) {
      if (matchCategory(pattern, item.category)) {
        bestMatch = item
        // 优先选择名称不包含"活动"的物品
        if (!item.name.includes('活动')) break
      }
    }

    if (bestMatch) {
      materials.push({ id: bestMatch.id, name: bestMatch.name, count })
    } else {
      // 未匹配到，保留路径作为名称
      const simpleName = pattern.split('/').filter(s => s && s !== '*').pop() || pattern
      materials.push({ id: 0, name: simpleName, count })
    }
  }

  return materials
}

/** 解析 ManualForm 的 CompleteEssentials（完成材料，带括号） */
const resolveCompleteEssentials = (str, allItems) => {
  if (!str) return []
  // 去掉外层括号
  let cleaned = str.trim()
  if (cleaned.startsWith('(')) cleaned = cleaned.substring(1)
  if (cleaned.endsWith(')')) cleaned = cleaned.substring(0, cleaned.length - 1)
  return resolveEssentials(cleaned, allItems)
}

// ====== 配方加载 ======

/** production.xml 中的分区到技能名称映射 */
const PRODUCTION_SKILL_MAP = {
  'Spinning': { skillName: '纺织', skillCode: 'Spinning', skillId: 10014 },
  'Weaving': { skillName: '纺织', skillCode: 'Weaving', skillId: 10014 },
  'Refine': { skillName: '冶炼', skillCode: 'Refine', skillId: 10015 },
  'Milling': { skillName: '碾磨', skillCode: 'Milling', skillId: 10012 },
  'PotionMaking': { skillName: '药剂制作', skillCode: 'PotionMaking', skillId: 10022 },
  'Handicraft': { skillName: '手艺', skillCode: 'Handicraft', skillId: 10013 },
  'ManaForming': { skillName: '魔法组合', skillCode: 'ManaForming', skillId: 35001 },
  'CrystalMaking': { skillName: '结晶制作', skillCode: 'CrystalMaking', skillId: 0 },
  'MetalExtraction': { skillName: '金属转换', skillCode: 'MetalExtraction', skillId: 35012 },
  'Carpentry': { skillName: '木工', skillCode: 'Carpentry', skillId: 10033 },
  'StageTicket': { skillName: '制作戏剧任务通行证', skillCode: 'StageTicket', skillId: 10036 },
  'PerfumeMaking': { skillName: '调香', skillCode: 'PerfumeMaking', skillId: 0 },
  'HeulwenEngineering': { skillName: '希尔文工学', skillCode: 'HeulwenEngineering', skillId: 10040 },
  'MagicCraft': { skillName: '魔法工艺', skillCode: 'MagicCraft', skillId: 10041 },
  'FynnsCraft': { skillName: '菲恩工艺制作', skillCode: 'FynnsCraft', skillId: 27103 },
  'StationaryCraft': { skillName: '书写用具工艺', skillCode: 'StationaryCraft', skillId: 10104 },
  'StellarCraft': { skillName: '星光工艺', skillCode: 'StellarCraft', skillId: 0 },
}

const MANUAL_SKILL_MAP = {
  'Tailoring': { skillName: '衣物制作', skillCode: 'Tailoring', skillId: 10001 },
  'Tailoring_Arbeit': { skillName: '衣物制作(兼职)', skillCode: 'Tailoring', skillId: 10001 },
  'BlackSmith': { skillName: '打铁', skillCode: 'BlackSmith', skillId: 10016 },
  'BlackSmith_Arbeit': { skillName: '打铁(兼职)', skillCode: 'BlackSmith', skillId: 10016 },
}

const COOKING_ACTION_MAP = {
  'mix': '拌',
  'boil': '煮',
  'bake': '烤',
  'fry': '炸',
  'knead': '揉面',
  'make_noodle': '制面',
  'make_pasta': '意面',
  'make_jam': '果酱',
  'make_pie': '派',
  'make_pizza': '披萨',
  'steam': '蒸',
  'steamed_dish': '蒸菜',
  'cook_with_strong_fire': '大火烤',
  'fry_with_much_oil': '油炸',
  'ferment': '发酵',
  'fillet': '切片',
  'sousvide': '低温烹饪',
}

/** 加载 production.xml 配方 */
const loadProductionRecipes = async (allItems) => {
  const recipes = []
  const xmlPath = path.join(DATA_DIR, 'production.xml')
  const txtPath = path.join(DATA_DIR, 'production.china.txt')

  if (!fs.existsSync(xmlPath)) return recipes

  const xmlData = await readXmlParse(xmlPath)
  const transform = loadTranslation(txtPath, 'production')
  const root = xmlData.Production

  for (const [sectionName, skillInfo] of Object.entries(PRODUCTION_SKILL_MAP)) {
    if (!root[sectionName] || !root[sectionName][0] || !root[sectionName][0].Production) continue

    const productions = root[sectionName][0].Production
    for (const prod of productions) {
      const $ = prod.$
      const productId = parseInt($.ProductItemId)
      if (!productId || productId === 0) continue

      // 跳过练习条目（ProductionId=10000 通常是练习）
      if (parseInt($.ProductionId) >= 10000) continue

      const title = $.Title ? (transform[$.Title] || $.Title) : ''
      const desc = $.Desc ? (transform[$.Desc] || '') : ''
      const essentialDesc = $.EssentialDesc ? (transform[$.EssentialDesc] || '') : ''
      const difficulty = parseInt($.Difficulty) || 0

      // 解析成功率
      const successRates = {}
      for (let i = 0; i <= 18; i++) {
        const key = `SuccessRate_${i}`
        if ($[key] !== undefined) {
          successRates[i] = parseInt($[key])
        }
      }

      // 解析材料
      const materials = resolveEssentials($.Essentials, allItems)

      const productItem = allItems.get(productId)
      const productName = productItem ? productItem.name : title

      recipes.push({
        type: 'production',
        productId,
        productName,
        productCount: parseInt($.ProductionCount) || 1,
        skillName: skillInfo.skillName,
        skillCode: skillInfo.skillCode,
        skillId: skillInfo.skillId,
        section: sectionName,
        title,
        desc,
        essentialDesc,
        difficulty,
        materials,
        successRates,
        merchantExp: parseInt($.MerchantExp) || 0,
        rainBonus: parseInt($.SuccessRateBonusInRain) || 0,
      })
    }
  }

  return recipes
}

/** 加载 manualform.xml 配方 */
const loadManualFormRecipes = async (allItems) => {
  const recipes = []
  const xmlPath = path.join(DATA_DIR, 'manualform.xml')
  const txtPath = path.join(DATA_DIR, 'manualform.china.txt')

  if (!fs.existsSync(xmlPath)) return recipes

  const xmlData = await readXmlParse(xmlPath)
  const transform = loadTranslation(txtPath, 'manualform')
  const root = xmlData.ManualForm

  for (const [sectionName, skillInfo] of Object.entries(MANUAL_SKILL_MAP)) {
    if (!root[sectionName] || !root[sectionName][0] || !root[sectionName][0].ManualForm) continue

    const manuals = root[sectionName][0].ManualForm
    for (const manual of manuals) {
      const $ = manual.$
      const productId = parseInt($.ProductItemID)
      if (!productId) continue

      const manualName = $.ManualNameLocal ? (transform[$.ManualNameLocal] || '') : ''
      const title = $.Title ? (transform[$.Title] || '') : ''
      const desc = $.Desc ? (transform[$.Desc] || '') : ''
      const essentialDesc = $.EssentialDesc ? (transform[$.EssentialDesc] || '') : ''
      const completeDesc = $.CompleteDesc ? (transform[$.CompleteDesc] || '') : ''
      const level = parseInt($.Level) || 0
      const maxProgress = parseFloat($.MaxProgress) || 0

      // 解析材料
      const materials = resolveEssentials($.Essentials, allItems)
      const completeMaterials = resolveCompleteEssentials($.CompleteEssentials, allItems)

      const productItem = allItems.get(productId)
      let productName = productItem ? productItem.name : ''
      if (!productName && manualName) {
        // 从样本名称中提取产品名 "衣物样本- XXX" → "XXX"
        const parts = manualName.split('-')
        productName = parts.length > 1 ? parts[1].trim() : manualName
      }

      recipes.push({
        type: 'manual',
        productId,
        productName,
        productCount: 1,
        skillName: skillInfo.skillName,
        skillCode: skillInfo.skillCode,
        skillId: skillInfo.skillId,
        section: sectionName,
        manualName,
        title,
        desc,
        essentialDesc,
        completeDesc,
        level,
        maxProgress,
        materials,
        completeMaterials,
        manualItemId: parseInt($.ManualItemID) || 0,
        formId: parseInt($.FormID) || 0,
        price: parseInt($.Price) || 0,
      })
    }
  }

  return recipes
}

/** 加载 cookingrecipe.xml 配方 */
const loadCookingRecipes = async (allItems) => {
  const recipes = []
  const xmlPath = path.join(DATA_DIR, 'cookingrecipe.xml')
  const txtPath = path.join(DATA_DIR, 'cookingrecipe.china.txt')

  if (!fs.existsSync(xmlPath)) return recipes

  const xmlData = await readXmlParse(xmlPath)
  const transform = loadTranslation(txtPath, 'cookingrecipe')
  const recipeList = xmlData.CookingRecipe.recipe || []

  for (const recipe of recipeList) {
    const $ = recipe.$
    const productId = parseInt($.result_item)
    if (!productId) continue

    const localName = $.localname ? (transform[$.localname] || $.localname) : ''
    const action = $.action || ''
    const actionCn = COOKING_ACTION_MAP[action] || action

    // 解析料理材料
    const materials = []
    const essentials = recipe.essential || []
    for (const essential of essentials) {
      const sources = essential.source || []
      for (const source of sources) {
        const s$ = source.$
        const itemId = parseInt(s$.item_id)
        const amount = parseInt(s$.amount) || 0
        const sourceItem = allItems.get(itemId)
        materials.push({
          id: itemId,
          name: sourceItem ? sourceItem.name : (s$.desc || `物品${itemId}`),
          count: amount,
        })
      }
    }

    const productItem = allItems.get(productId)
    const productName = productItem ? productItem.name : localName

    recipes.push({
      type: 'cooking',
      productId,
      productName,
      productCount: 1,
      skillName: '料理',
      skillCode: 'Cooking',
      skillId: 10020,
      section: action,
      title: localName,
      action,
      actionCn,
      materials,
      cookExp: parseInt($.cookexp) || 0,
    })
  }

  return recipes
}

// ====== 主加载函数 ======

/** 加载所有配方数据，返回按产品ID索引的Map */
const loadAllRecipes = async () => {
  if (_recipesByProduct) return _recipesByProduct

  const allItems = await loadAllItems()

  console.log('[dataLoader] 开始加载配方数据...')
  const [productionRecipes, manualRecipes, cookingRecipes] = await Promise.all([
    loadProductionRecipes(allItems),
    loadManualFormRecipes(allItems),
    loadCookingRecipes(allItems),
  ])

  const allRecipes = [...productionRecipes, ...manualRecipes, ...cookingRecipes]
  const byProduct = new Map()

  for (const recipe of allRecipes) {
    if (!byProduct.has(recipe.productId)) {
      byProduct.set(recipe.productId, [])
    }
    byProduct.get(recipe.productId).push(recipe)
  }

  _recipesByProduct = byProduct
  console.log(`[dataLoader] 配方加载完成: 生产${productionRecipes.length}, 手工${manualRecipes.length}, 料理${cookingRecipes.length}`)
  console.log(`[dataLoader] 共涉及 ${byProduct.size} 种产品`)
  return byProduct
}

/** 获取物品名称到ID的映射 */
const getNameToIds = async () => {
  if (!_nameToIds) await loadAllItems()
  return _nameToIds
}

/** 获取所有物品数据 */
const getAllItems = async () => {
  if (!_allItems) await loadAllItems()
  return _allItems
}

module.exports = {
  loadAllItems,
  loadAllRecipes,
  getNameToIds,
  getAllItems,
  resolveEssentials,
  matchCategory,
}
