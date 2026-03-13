const fs = require('fs')
const path = require('path')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// 确保输出目录存在
const OUTPUT_DIR = path.join(IMAGE_DATA, 'mabi_recipe')
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// ====== 浏览器实例池（复用，减少CPU开销） ======
let _browser = null
let _browserCloseTimer = null
const BROWSER_IDLE_TIMEOUT = 60000

const getBrowser = async () => {
  if (_browserCloseTimer) {
    clearTimeout(_browserCloseTimer)
    _browserCloseTimer = null
  }

  if (_browser) {
    try {
      await _browser.version()
      return _browser
    } catch (e) {
      _browser = null
    }
  }

  const puppeteer = require('puppeteer')
  _browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  })
  console.log('[renderRecipe] 浏览器实例已创建')
  return _browser
}

const scheduleBrowserClose = () => {
  if (_browserCloseTimer) clearTimeout(_browserCloseTimer)
  _browserCloseTimer = setTimeout(async () => {
    if (_browser) {
      try {
        await _browser.close()
        console.log('[renderRecipe] 浏览器实例已关闭（空闲超时）')
      } catch (e) { /* ignore */ }
      _browser = null
    }
    _browserCloseTimer = null
  }, BROWSER_IDLE_TIMEOUT)
}

// ====== 模板路径 & 图片路径 ======
const TEMPLATE_PATH = 'file:///' + path.join(__dirname, 'template.html').replace(/\\/g, '/')
const SKILL_ICON_BASE = 'file:///' + path.join(__dirname, 'img', 'Skill').replace(/\\/g, '/') + '/'
const ITEM_ICON_DIR = path.join(__dirname, 'img', 'item')
const ITEM_ICON_BASE = 'file:///' + ITEM_ICON_DIR.replace(/\\/g, '/') + '/'
const ITEM_IMAGE_REMOTE = 'https://mabires2.pril.cc/invimage/kr'

// 确保图片缓存目录存在
if (!fs.existsSync(ITEM_ICON_DIR)) {
  fs.mkdirSync(ITEM_ICON_DIR, { recursive: true })
}

// ====== 图片下载缓存 ======
const https = require('https')
const http = require('http')

/** 下载单张图片到本地缓存，若已存在则跳过 */
const downloadItemIcon = (itemId) => new Promise((resolve) => {
  if (itemId <= 0) return resolve(false)
  const localPath = path.join(ITEM_ICON_DIR, `${itemId}.png`)
  if (fs.existsSync(localPath)) return resolve(true)

  const url = `${ITEM_IMAGE_REMOTE}/${itemId}/${itemId}.png`
  const client = url.startsWith('https') ? https : http

  const req = client.get(url, { timeout: 5000 }, (res) => {
    if (res.statusCode !== 200) {
      res.resume()
      return resolve(false)
    }
    const chunks = []
    res.on('data', c => chunks.push(c))
    res.on('end', () => {
      try {
        fs.writeFileSync(localPath, Buffer.concat(chunks))
        resolve(true)
      } catch (e) { resolve(false) }
    })
  })
  req.on('error', () => resolve(false))
  req.on('timeout', () => { req.destroy(); resolve(false) })
})

/** 批量下载物品图片（并发控制） */
const downloadItemIcons = async (itemIds) => {
  const unique = [...new Set(itemIds.filter(id => id > 0))]
  // 过滤已缓存的
  const toDownload = unique.filter(id => !fs.existsSync(path.join(ITEM_ICON_DIR, `${id}.png`)))
  if (toDownload.length === 0) return

  console.log(`[renderRecipe] 下载 ${toDownload.length} 张物品图片...`)
  // 并发下载，限制并发数
  const CONCURRENCY = 8
  for (let i = 0; i < toDownload.length; i += CONCURRENCY) {
    const batch = toDownload.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(id => downloadItemIcon(id)))
  }
}

/**
 * 构建子配方数据（mbd模式：展示材料的制作配方）
 */
const buildSubRecipes = (recipes, allItems, recipesByProduct) => {
  const subRecipeMap = {} // materialId -> [{...recipe}]
  const seen = new Set()

  for (const recipe of recipes) {
    const allMats = [...(recipe.materials || []), ...(recipe.completeMaterials || [])]
    for (const mat of allMats) {
      if (mat.id <= 0 || seen.has(mat.id)) continue
      seen.add(mat.id)

      const matRecipes = recipesByProduct.get(mat.id)
      if (matRecipes && matRecipes.length > 0) {
        // 只取第一个配方的简要信息
        subRecipeMap[mat.id] = matRecipes.map(r => ({
          type: r.type,
          skillName: r.skillName,
          skillId: r.skillId || 0,
          title: r.title || '',
          difficulty: r.difficulty || 0,
          level: r.level || 0,
          materials: (r.materials || []).map(m => ({
            id: m.id,
            name: m.name,
            count: m.count,
          })),
          completeMaterials: (r.completeMaterials || []).map(m => ({
            id: m.id,
            name: m.name,
            count: m.count,
          })),
        }))
      }
    }
  }

  return subRecipeMap
}

/**
 * 渲染配方图片
 * @param {Object} product - {id, name}
 * @param {Array} recipes - 配方数组
 * @param {Map} allItems - 所有物品数据
 * @param {Map} recipesByProduct - 所有配方索引
 * @param {boolean} showDesc - 是否显示详情（mbd模式）
 * @param {Function} callback - 回调
 * @param {string} msg - 附加消息
 * @param {string} order - 消息顺序 'IF'=图片优先, 'MF'=消息优先
 */
const renderRecipeImage = async (product, recipes, allItems, recipesByProduct, showDesc, callback, msg = '', order = 'IF') => {
  let page = null
  try {
    // 收集所有需要的物品图片ID
    const allItemIds = [product.id]
    for (const r of recipes) {
      for (const m of (r.materials || [])) allItemIds.push(m.id)
      for (const m of (r.completeMaterials || [])) allItemIds.push(m.id)
    }
    // 子配方材料图片
    if (showDesc) {
      const subR = buildSubRecipes(recipes, allItems, recipesByProduct)
      for (const subs of Object.values(subR)) {
        for (const s of subs) {
          for (const m of (s.materials || [])) allItemIds.push(m.id)
          for (const m of (s.completeMaterials || [])) allItemIds.push(m.id)
        }
      }
    }
    // 批量下载缺失图片
    await downloadItemIcons(allItemIds)

    const browser = await getBrowser()
    page = await browser.newPage()
    await page.setViewport({ width: 560, height: 600, deviceScaleFactor: 2 })

    // 加载模板
    await page.goto(TEMPLATE_PATH, { waitUntil: 'domcontentloaded' })

    // 准备数据 - 将配方数据序列化
    const recipeData = recipes.map(r => ({
      type: r.type,
      skillName: r.skillName,
      skillId: r.skillId || 0,
      title: r.title || '',
      desc: r.desc || '',
      essentialDesc: r.essentialDesc || '',
      difficulty: r.difficulty || 0,
      level: r.level || 0,
      maxProgress: r.maxProgress || 0,
      price: r.price || 0,
      productCount: r.productCount || 1,
      action: r.action || '',
      actionCn: r.actionCn || '',
      specialTalent: r.specialTalent || '',
      requiresSightOfOtherSide: r.requiresSightOfOtherSide || false,
      materials: (r.materials || []).map(m => ({
        id: m.id,
        name: m.name,
        count: m.count,
      })),
      completeMaterials: (r.completeMaterials || []).map(m => ({
        id: m.id,
        name: m.name,
        count: m.count,
      })),
      successRates: r.successRates || {},
      merchantExp: r.merchantExp || 0,
      rainBonus: r.rainBonus || 0,
      cookExp: r.cookExp || 0,
    }))

    // mbd 模式：构建子配方
    const subRecipes = showDesc ? buildSubRecipes(recipes, allItems, recipesByProduct) : {}

    const renderData = {
      product: { id: product.id, name: product.name },
      recipes: recipeData,
      showDesc,
      subRecipes,
      skillIconBase: SKILL_ICON_BASE,
      itemIconBase: ITEM_ICON_BASE,
    }

    // 注入数据并渲染
    await page.evaluate((data) => {
      renderRecipes(data)
    }, renderData)

    // 等待所有图片加载完成，最多等待3秒
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const imgs = document.querySelectorAll('img')
        if (imgs.length === 0) return resolve()

        let loaded = 0
        const total = imgs.length
        const check = () => { if (++loaded >= total) resolve() }

        for (const img of imgs) {
          if (img.complete) { check(); continue }
          img.addEventListener('load', check)
          img.addEventListener('error', check)
        }

        // 最长等待3秒
        setTimeout(resolve, 3000)
      })
    })

    // 额外等待一小段时间确保渲染完成
    await delay(100)

    // 截图
    const container = await page.$('#recipe-container')
    if (!container) {
      console.error('[renderRecipe] 容器未找到')
      callback('渲染失败：容器未找到')
      return
    }

    const boundingBox = await container.boundingBox()
    if (!boundingBox) {
      console.error('[renderRecipe] 容器不可见')
      callback('渲染失败：容器不可见')
      return
    }

    const safeName = product.name.replace(/[<>:"/\\|?*@]/g, '_')
    const outputFile = path.join(OUTPUT_DIR, `${safeName}.png`)

    await page.screenshot({
      path: outputFile,
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    })

    console.log(`[renderRecipe] 保存 ${safeName}.png 成功`)

    const imgMsg = `[CQ:image,file=${path.join('send', 'mabi_recipe', `${safeName}.png`)}]`
    let mixMsg = ''
    switch (order) {
      case 'IF':
        mixMsg = `${imgMsg}${msg.length ? `\n${msg}` : ''}`
        break
      case 'MF':
        mixMsg = `${msg.length ? `${msg}\n` : ''}${imgMsg}`
        break
      default:
        mixMsg = imgMsg
    }

    callback(mixMsg)
  } catch (err) {
    console.error('[renderRecipe] 渲染错误:', err)
    callback('配方图片渲染失败，请稍后再试')
  } finally {
    if (page) {
      try { await page.close() } catch (e) { /* ignore */ }
    }
    scheduleBrowserClose()
  }
}

module.exports = {
  renderRecipeImage,
}
