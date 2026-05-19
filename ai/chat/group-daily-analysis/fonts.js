/**
 * Scrapbook 报告字体：node-html-to-image 需 base64 @font-face
 * 字体文件位于 ai/chat/font（随项目部署，不依赖系统字体）
 * 首次运行自动生成 fonts-base64.json 缓存
 */

const fs = require('fs')
const path = require('path')
const font2base64 = require('node-font2base64')

const CACHE_PATH = path.join(__dirname, 'fonts-base64.json')
const FONT_DIR = path.join(__dirname, '..', 'font')
const BODY_FONT = path.join(FONT_DIR, 'hk4e_zh-cn.ttf')
const HAND_FONT = path.join(FONT_DIR, 'simkai.ttf')

let cache = null

function encodeFont(filePath) {
  return font2base64.encodeToDataUrlSync(filePath)
}

function buildCache() {
  if (!fs.existsSync(BODY_FONT)) {
    throw new Error('未找到字体文件 ai/chat/font/hk4e_zh-cn.ttf，无法生成报告')
  }
  if (!fs.existsSync(HAND_FONT)) {
    throw new Error('未找到字体文件 ai/chat/font/simkai.ttf，无法生成报告')
  }
  console.log('[群分析字体] 正在编码 base64（首次较慢）...')
  console.log('  body/title:', BODY_FONT)
  console.log('  hand:', HAND_FONT)
  const data = {
    body: encodeFont(BODY_FONT),
    title: encodeFont(BODY_FONT),
    hand: encodeFont(HAND_FONT)
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data))
  console.log('[群分析字体] 已写入缓存:', CACHE_PATH)
  return data
}

function loadCache() {
  if (cache) return cache
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
      if (cache.body && cache.title && cache.hand) return cache
    } catch (e) {
      console.warn('[群分析字体] 读取缓存失败，将重新生成:', e.message)
    }
  }
  cache = buildCache()
  return cache
}

function getFontFacesCss() {
  const c = loadCache()
  return `
@font-face {
  font-family: 'ScrapbookBody';
  src: url('${c.body}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'ScrapbookTitle';
  src: url('${c.title}') format('truetype');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: 'ScrapbookHand';
  src: url('${c.hand}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
`
}

module.exports = { getFontFacesCss, loadCache, buildCache, CACHE_PATH, FONT_DIR, BODY_FONT, HAND_FONT }
