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
const BROWSER_IDLE_TIMEOUT = 60000 // 60秒无请求则关闭浏览器

const getBrowser = async () => {
  // 延长关闭计时器
  if (_browserCloseTimer) {
    clearTimeout(_browserCloseTimer)
    _browserCloseTimer = null
  }

  if (_browser) {
    try {
      // 检测浏览器是否仍然活跃
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

// ====== 模板路径 ======
const TEMPLATE_PATH = 'file:///' + path.join(__dirname, 'template.html').replace(/\\/g, '/')

/**
 * 渲染配方图片
 * @param {Object} product - {id, name}
 * @param {Array} recipes - 配方数组
 * @param {Map} allItems - 所有物品数据
 * @param {boolean} showDesc - 是否显示详情
 * @param {Function} callback - 回调
 * @param {string} msg - 附加消息
 * @param {string} order - 消息顺序 'IF'=图片优先, 'MF'=消息优先
 */
const renderRecipeImage = async (product, recipes, allItems, showDesc, callback, msg = '', order = 'IF') => {
  let page = null
  try {
    const browser = await getBrowser()
    page = await browser.newPage()
    await page.setViewport({ width: 820, height: 600, deviceScaleFactor: 2 })

    // 加载模板
    await page.goto(TEMPLATE_PATH, { waitUntil: 'domcontentloaded' })

    // 准备数据 - 将配方数据序列化（仅传递需要的字段）
    const recipeData = recipes.map(r => ({
      type: r.type,
      skillName: r.skillName,
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

    const renderData = {
      product: { id: product.id, name: product.name },
      recipes: recipeData,
      showDesc,
    }

    // 注入数据并渲染
    await page.evaluate((data) => {
      renderRecipes(data)
    }, renderData)

    // 等待图片加载（物品图标）
    await delay(600)

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
    // 关闭页面但保留浏览器实例
    if (page) {
      try { await page.close() } catch (e) { /* ignore */ }
    }
    scheduleBrowserClose()
  }
}

module.exports = {
  renderRecipeImage,
}
