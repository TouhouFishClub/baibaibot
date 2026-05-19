/**
 * Scrapbook 报告字体（对齐 astrbot scrapbook 原版）
 * 原版：ZCOOL KuaiLe（标题）、Patrick Hand（手写）、Noto Sans SC（正文）
 * node-html-to-image：require 时用 node-font2base64 编码一次
 */

const fs = require('fs')
const path = require('path')
const font2base64 = require('node-font2base64')

const FONT_DIR = path.join(__dirname, '..', 'font')

const FONT_CANDIDATES = {
  title: [
    'ZCOOLKuaiLe-Regular.ttf',
    'ZCOOL_KuaiLe-Regular.ttf',
    'zcool-kuaile.ttf'
  ],
  hand: [
    'PatrickHand-Regular.ttf',
    'PatrickHand.ttf'
  ],
  body: [
    'NotoSansSC-Regular.otf',
    'NotoSansSC-Regular.ttf',
    'NotoSansSC-VariableFont_wght.ttf',
    'NotoSansCJK-Regular.otf',
    'NotoSansCJK-Bold.otf',
    'NotoSansSC-heavy.otf'
  ]
}

const FONT_FALLBACK = {
  title: ['simkai.ttf'],
  hand: ['simkai.ttf'],
  body: ['hk4e_zh-cn.ttf']
}

function pickFont(role) {
  const tryList = [...(FONT_CANDIDATES[role] || []), ...(FONT_FALLBACK[role] || [])]
  for (const name of tryList) {
    const full = path.join(FONT_DIR, name)
    if (fs.existsSync(full)) {
      const recommended = FONT_CANDIDATES[role] && FONT_CANDIDATES[role][0]
      if (recommended && name !== recommended) {
        console.warn('[群分析字体] ' + role + ' 使用备用字体: ' + name + '（推荐放入 ai/chat/font/' + recommended + '）')
      }
      return full
    }
  }
  const need = (FONT_CANDIDATES[role] || []).join(' 或 ')
  throw new Error('未找到 ' + role + ' 字体，请下载并放入 ai/chat/font/：' + need)
}

function fontFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.otf') return 'opentype'
  if (ext === '.woff2') return 'woff2'
  if (ext === '.woff') return 'woff'
  return 'truetype'
}

function encodeFont(filePath) {
  return font2base64.encodeToDataUrlSync(filePath)
}

const TITLE_PATH = pickFont('title')
const HAND_PATH = pickFont('hand')
const BODY_PATH = pickFont('body')

const TITLE_DATA = encodeFont(TITLE_PATH)
const HAND_DATA = encodeFont(HAND_PATH)
const BODY_DATA = encodeFont(BODY_PATH)

const TITLE_FMT = fontFormat(TITLE_PATH)
const HAND_FMT = fontFormat(HAND_PATH)
const BODY_FMT = fontFormat(BODY_PATH)

const FONT_FACES_CSS = `
@font-face {
  font-family: 'ScrapbookTitle';
  src: url('${TITLE_DATA}') format('${TITLE_FMT}');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'ScrapbookHand';
  src: url('${HAND_DATA}') format('${HAND_FMT}');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'ScrapbookBody';
  src: url('${BODY_DATA}') format('${BODY_FMT}');
  font-weight: normal;
  font-style: normal;
}
`

function getFontFacesCss() {
  return FONT_FACES_CSS
}

module.exports = {
  getFontFacesCss,
  FONT_DIR,
  TITLE_PATH,
  HAND_PATH,
  BODY_PATH
}
