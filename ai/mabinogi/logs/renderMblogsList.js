const path = require('path-extra')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const {
  formatHp,
  formatDuration,
  formatPercent,
  formatDps,
  formatDamage,
  shortRunId
} = require('./bossConfig')
const { getClassTheme, hexToRgba } = require('./classConfig')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const addZero = n => (n < 10 ? `0${n}` : `${n}`)

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}`
}

function formatHpDamageShare(row) {
  return `${formatHp(row.bossHp)} / ${formatDamage(row.totalDamage)}（${formatPercent(row.damagePercent)}）`
}

function truncate(text, max = 20) {
  const value = String(text || '')
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function getDpsTone(dps) {
  const n = Number(dps)
  if (!Number.isFinite(n)) return 'white'
  if (n > 2_000_000) return 'rainbow'
  if (n >= 1_500_000) return 'gold'
  if (n >= 1_000_000) return 'magenta'
  if (n >= 700_000) return 'blue'
  if (n >= 400_000) return 'green'
  return 'white'
}

function renderRow(row, index) {
  const theme = getClassTheme(row.characterClass)
  const alpha = 0.22
  const bg = `linear-gradient(90deg, ${hexToRgba(theme.primary, alpha)} 0%, ${hexToRgba(theme.secondary, alpha)} 100%)`
  const dpsTone = getDpsTone(row.dps)

  return `
    <div class="row" style="background:${bg}">
      <div class="meta">#${index + 1} · ${escapeHtml(formatTime(row.recordTime))}</div>
      <div class="main">
        <div class="cell class">${escapeHtml(row.characterClass || '未知')}</div>
        <div class="cell name">${escapeHtml(truncate(row.characterName, 12))}</div>
        <div class="cell dungeon">${escapeHtml(truncate(row.dungeonName, 10))}</div>
        <div class="cell team-size">${escapeHtml(row.teamSize ?? '-')}</div>
        <div class="cell teammates" title="${escapeHtml(row.teammateNames)}">${escapeHtml(truncate(row.teammateNames, 18))}</div>
        <div class="cell duration">${escapeHtml(formatDuration(row.duration))}</div>
        <div class="cell dps dps-${dpsTone}">${escapeHtml(formatDps(row.dps))}</div>
        <div class="cell share">${escapeHtml(formatHpDamageShare(row))}</div>
        <div class="cell runid">${escapeHtml(shortRunId(row.runId))}</div>
      </div>
    </div>`
}

function renderSection(section) {
  const rows = section.rows || []
  const title = section.title
    ? `<div class="section-title">${escapeHtml(section.title)}<span class="section-count">${rows.length}</span></div>`
    : ''

  if (!rows.length) {
    return `<div class="section">${title}<div class="empty">暂无记录</div></div>`
  }

  return `
    <div class="section">
      ${title}
      <div class="list-head">
        <div class="cell class">职业</div>
        <div class="cell name">角色</div>
        <div class="cell dungeon">副本</div>
        <div class="cell team-size">队友数</div>
        <div class="cell teammates">队友</div>
        <div class="cell duration">攻略时间</div>
        <div class="cell dps">DPS</div>
        <div class="cell share">贡献度</div>
        <div class="cell runid">场次</div>
      </div>
      <div class="list-body">
        ${rows.map((row, index) => renderRow(row, index)).join('')}
      </div>
    </div>`
}

function buildHtml(option) {
  const sections = option.sections || [{ rows: option.rows || [] }]
  const width = 1280

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'HANYIWENHEI';
      src: url(${HANYIWENHEI}) format('truetype');
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${width}px;
      background: #12141a;
      color: #e8eaed;
      font-family: HANYIWENHEI, sans-serif;
      padding: 28px 32px 36px;
    }
    .header {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .title {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #f5f6f8;
    }
    .desc {
      margin-top: 8px;
      font-size: 15px;
      color: #8b919a;
    }
    .section { margin-top: 20px; }
    .section:first-of-type { margin-top: 0; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      color: #d0d4db;
      margin-bottom: 10px;
      padding-left: 4px;
    }
    .section-count {
      font-size: 12px;
      color: #9aa0a8;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      padding: 2px 8px;
    }
    .list-head,
    .main {
      display: grid;
      grid-template-columns:
        118px
        120px
        100px
        60px
        minmax(130px, 1.2fr)
        96px
        86px
        minmax(210px, 1.6fr)
        80px;
      align-items: center;
      column-gap: 8px;
    }
    .list-head {
      height: 30px;
      margin: 0 12px 6px 14px;
      color: #7d848e;
      font-size: 13px;
      letter-spacing: 0.3px;
    }
    .list-head .cell {
      color: #7d848e;
      font-family: HANYIWENHEI, sans-serif;
      font-size: 13px;
      font-weight: 400;
    }
    .list-head .dps {
      color: #fff;
    }
    .list-body { display: flex; flex-direction: column; gap: 6px; }
    .row {
      position: relative;
      display: flex;
      align-items: center;
      min-height: 56px;
      border-radius: 10px;
      font-size: 15px;
      line-height: 1.35;
      color: #eef0f3;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
      padding: 18px 12px 12px 14px;
    }
    .main {
      width: 100%;
    }
    .meta {
      position: absolute;
      top: 5px;
      left: 14px;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.2px;
      pointer-events: none;
    }
    .cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #eef0f3; }
    .class { color: #fff; font-weight: 400; }
    .name { font-weight: 700; }
    .row .teammates {
      color: #9aa3ad;
      font-family: monospace;
      font-size: 13px;
    }
    .dps { font-weight: 700; }
    .dps-rainbow {
      background: linear-gradient(90deg, #ff4d4d, #ffb84d, #ffe14d, #5dff8a, #4db8ff, #b84dff, #ff4da6);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }
    .dps-gold { color: #ffd54f; }
    .dps-magenta { color: #ff4fcf; }
    .dps-blue { color: #4da3ff; }
    .dps-green { color: #52d67a; }
    .dps-white { color: #ffffff; }
    .share { color: #cfd6df; font-size: 14px; }
    .runid {
      color: #eef0f3;
      font-family: HANYIWENHEI, sans-serif;
      font-size: 14px;
    }
    .empty {
      padding: 18px;
      color: #777;
      text-align: center;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(option.title)}</div>
    <div class="desc">${escapeHtml(option.description)}</div>
  </div>
  ${sections.map(renderSection).join('')}
</body>
</html>`
}

async function renderMblogsList(option) {
  const html = buildHtml(option)
  await nodeHtmlToImage({
    output: option.output,
    html,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })
}

module.exports = {
  renderMblogsList,
  buildHtml
}
