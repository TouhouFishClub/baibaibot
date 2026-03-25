const path = require('path')
const fs = require('fs')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { IMAGE_DATA } = require('../baibaiConfigs')

const FONT_BASE64 = font2base64.encodeToDataUrlSync(
  path.join(__dirname, '..', 'font', 'hk4e_zh-cn.ttf')
)

const TEMPLATE_PATH = path.join(__dirname, 'template.html')
const OUTPUT_DIR = path.join(IMAGE_DATA, 'help')
const OUTPUT_FILE = 'help.png'

let templateCache = null

const loadTemplate = () => {
  if (!templateCache) {
    templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf-8')
  }
  return templateCache
}

const renderHelpImage = async (callback) => {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    const template = loadTemplate()
    const html = template.replace(/\{\{fontBase64\}\}/g, FONT_BASE64)
    const output = path.join(OUTPUT_DIR, OUTPUT_FILE)

    await nodeHtmlToImage({ output, html })
    console.log('[帮助] 帮助图片生成成功')

    const imgMsg = `[CQ:image,file=${path.join('send', 'help', OUTPUT_FILE)}]`
    callback(imgMsg)
  } catch (err) {
    console.error('[帮助] 图片生成失败:', err)
    callback('帮助信息生成失败，请稍后再试')
  }
}

const reloadTemplate = () => {
  templateCache = null
}

module.exports = {
  renderHelpImage,
  reloadTemplate
}
