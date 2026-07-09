/**
 * Scrapbook 图标（path 与 astrbot scrapbook 模板一致）
 * SVG 文件位于 assets/icons/
 */

const fs = require('fs')
const path = require('path')

const ICON_DIR = path.join(__dirname, 'assets', 'icons')

const ICON_NAMES = [
  'stamp-message', 'stamp-users', 'stamp-emoji', 'stamp-text',
  'chart', 'topic', 'portraits', 'quotes', 'quality', 'network',
  'star', 'github', 'token'
]

const cache = {}

function loadIcon(name) {
  if (cache[name]) return cache[name]
  const file = path.join(ICON_DIR, name + '.svg')
  if (!fs.existsSync(file)) return ''
  cache[name] = fs.readFileSync(file, 'utf8').trim()
  return cache[name]
}

function wrapDoodle(svg, extraClass, style) {
  if (!svg) return ''
  const cls = extraClass ? 'doodle ' + extraClass : 'doodle'
  const st = style ? ' style="' + style + '"' : ''
  return '<span class="' + cls + '"' + st + ' aria-hidden="true">' + svg + '</span>'
}

function doodle(name) {
  return wrapDoodle(loadIcon(name))
}

/** 统计邮票图标（2.2rem + 各色） */
function stampIcon(name, color) {
  const iconName = name.indexOf('stamp-') === 0 ? name : 'stamp-' + name
  return wrapDoodle(loadIcon(iconName), 'stamp-doodle', 'font-size:2.2rem;color:' + color + ';')
}

function stampBlock(iconName, color, num, label) {
  return (
    '<div class="stamp">' +
    '<div class="stamp-inner">' +
    stampIcon(iconName, color) +
    '<div class="stamp-num">' + num + '</div>' +
    '<div class="stamp-label">' + label + '</div>' +
    '</div></div>'
  )
}

function sectionTitle(iconName, text, opts) {
  const center = opts && opts.center ? ' style="justify-content:center;"' : ''
  return '<div class="section-title"' + center + '>' + doodle(iconName) + text + '</div>'
}

function footerIcon(name, color) {
  return wrapDoodle(loadIcon(name), 'footer-doodle', color ? 'color:' + color + ';' : '')
}

for (const n of ICON_NAMES) loadIcon(n)

module.exports = {
  doodle,
  stampIcon,
  stampBlock,
  sectionTitle,
  footerIcon,
  loadIcon,
  ICON_DIR
}
