/**
 * Scrapbook 报告字体（node-html-to-image 官方做法）
 * @see https://github.com/frinyvonnick/node-html-to-image#dealing-with-fonts
 * 进程启动时 encode 一次，写入 @font-face，无需 fonts-base64.json
 */

const fs = require('fs')
const path = require('path')
const font2base64 = require('node-font2base64')

const FONT_DIR = path.join(__dirname, '..', 'font')
const BODY_FONT = path.join(FONT_DIR, 'hk4e_zh-cn.ttf')
const HAND_FONT = path.join(FONT_DIR, 'simkai.ttf')

function requireFont(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error('未找到字体文件 ' + label + '：' + filePath)
  }
  return font2base64.encodeToDataUrlSync(filePath)
}

// 与 Television、GenshinPush 等模块相同：require 时编码一次
const BODY_DATA = requireFont(BODY_FONT, 'ai/chat/font/hk4e_zh-cn.ttf')
const HAND_DATA = requireFont(HAND_FONT, 'ai/chat/font/simkai.ttf')

const FONT_FACES_CSS = `
@font-face {
  font-family: 'ScrapbookBody';
  src: url('${BODY_DATA}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'ScrapbookTitle';
  src: url('${BODY_DATA}') format('truetype');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: 'ScrapbookHand';
  src: url('${HAND_DATA}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
`

function getFontFacesCss() {
  return FONT_FACES_CSS
}

module.exports = { getFontFacesCss, FONT_DIR, BODY_FONT, HAND_FONT }
