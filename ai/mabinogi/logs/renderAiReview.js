const path = require('path-extra')
const fs = require('fs')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { getClassTheme, hexToRgba } = require('./classConfig')
const { buildHighlightTerms, highlightText, formatTokenUsage } = require('./renderAiAnalysis')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))
const REPORT_WIDTH = 960
const TIER_THEMES = {
  '夯': { color: '#ff4d4f', background: '#35191d', label: 'S' },
  '顶级': { color: '#ffb020', background: '#332819', label: 'A' },
  '人上人': { color: '#35c98f', background: '#173129', label: 'B' },
  'NPC': { color: '#55b8e8', background: '#172d38', label: 'C' },
  '拉完了': { color: '#a78bfa', background: '#29213a', label: 'D' }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatGeneratedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function renderClass(item, termMap) {
  const theme = getClassTheme(item.name)
  return `<article class="class-item" style="--class:${theme.primary};--class-bg:${hexToRgba(theme.primary, 0.1)}">
    <div class="class-head">
      <span class="class-name">${escapeHtml(item.name)}</span>
      <span class="verdict">${highlightText(item.verdict, termMap)}</span>
    </div>
    <div class="detail"><b>凭据</b>${highlightText(item.evidence, termMap)}</div>
    <div class="detail"><b>对局</b>${highlightText(item.bossFit, termMap)}</div>
    <div class="roast">“${highlightText(item.roast, termMap)}”</div>
  </article>`
}

function renderTier(tier, termMap) {
  const theme = TIER_THEMES[tier.label] || TIER_THEMES.NPC
  const classes = (tier.classes || []).map(item => renderClass(item, termMap)).join('')
  return `<section class="tier" style="--tier:${theme.color};--tier-bg:${theme.background}">
    <div class="tier-label">
      <span class="tier-letter">${theme.label}</span>
      <span class="tier-name">${escapeHtml(tier.label)}</span>
      <span class="tier-count">${(tier.classes || []).length} 职业</span>
    </div>
    <div class="tier-content">${classes || '<div class="empty">本档空缺</div>'}</div>
  </section>`
}

function generateAiReviewHtml(review) {
  const termMap = buildHighlightTerms(review)
  const tiers = (review.tiers || []).map(tier => renderTier(tier, termMap)).join('')
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: 'ReportFont'; src: url(${HANYIWENHEI}) format('truetype'); }
  * { box-sizing: border-box; overflow-wrap: anywhere; }
  body {
    margin: 0;
    padding: 28px;
    width: ${REPORT_WIDTH}px;
    color: #edf2f7;
    background: #101317;
    font-family: 'ReportFont', sans-serif;
  }
  .report { border: 1px solid #343a42; background: #171b20; padding: 26px; }
  .eyebrow { color: #ffb020; font-size: 14px; margin-bottom: 8px; }
  h1 { margin: 0; font-size: 34px; line-height: 1.25; letter-spacing: 0; }
  .scope { margin-top: 12px; color: #aeb7c2; font-size: 14px; line-height: 1.7; }
  .tiers { margin-top: 22px; border-top: 1px solid #343a42; }
  .tier { display: grid; grid-template-columns: 128px minmax(0, 1fr); border: 1px solid #343a42; border-top: 0; background: var(--tier-bg); }
  .tier-label { min-height: 128px; border-right: 4px solid var(--tier); padding: 16px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .tier-letter { color: var(--tier); font-size: 42px; line-height: 1; font-weight: 700; }
  .tier-name { margin-top: 7px; color: #fff; font-size: 20px; }
  .tier-count { margin-top: 5px; color: #8d98a5; font-size: 11px; }
  .tier-content { min-width: 0; padding: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-content: start; }
  .class-item { min-width: 0; border: 1px solid #3b424b; border-left: 4px solid var(--class); border-radius: 6px; padding: 12px; background: var(--class-bg); }
  .class-head { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 8px; }
  .class-name { flex: none; color: var(--class); font-size: 18px; font-weight: 700; }
  .verdict { min-width: 0; color: #dce2e8; font-size: 12px; line-height: 1.5; }
  .detail { color: #c7cfd8; font-size: 12px; line-height: 1.6; margin-top: 4px; }
  .detail b { display: inline-block; color: #86919d; margin-right: 7px; font-weight: 400; }
  .roast { margin-top: 8px; padding-top: 8px; border-top: 1px solid #3b424b; color: #fff1b8; font-size: 13px; line-height: 1.55; }
  .empty { grid-column: 1 / -1; color: #7d8792; min-height: 80px; display: flex; align-items: center; justify-content: center; }
  .hl { font-weight: 700; border-radius: 3px; padding: 0 2px; }
  .hl-boss { color: #b9ecff; background: rgba(85, 184, 232, 0.12); }
  .hl-skill { color: #ffd6ea; background: rgba(239, 112, 166, 0.12); }
  .summary { margin-top: 20px; border-left: 4px solid #ffb020; background: #20252b; padding: 14px 16px; }
  .summary-title { color: #ffb020; font-size: 14px; margin-bottom: 6px; }
  .summary-body { color: #d8dee6; font-size: 14px; line-height: 1.75; }
  .footer { margin-top: 17px; display: flex; justify-content: space-between; gap: 16px; color: #77818d; font-size: 11px; }
  .footer span:last-child { text-align: right; }
</style>
</head>
<body>
  <main class="report">
    <div class="eyebrow">MBLOGS · AI 锐评</div>
    <h1>${escapeHtml(review.title || '从夯到拉，各阿尔卡纳职业对比')}</h1>
    <div class="scope">${highlightText(review.scope || '', termMap)}</div>
    <div class="tiers">${tiers}</div>
    <section class="summary">
      <div class="summary-title">团长收尾</div>
      <div class="summary-body">${highlightText(review.overallVerdict || '', termMap)}</div>
    </section>
    <footer class="footer">
      <span>${escapeHtml(formatTokenUsage(review.usage))}</span>
      <span>${escapeHtml(formatGeneratedAt(review.generatedAt))} · 仅评价日志可观测伤害侧 · 不展示角色名</span>
    </footer>
  </main>
</body>
</html>`
}

async function renderAiReview(review, outputPath) {
  const html = generateAiReviewHtml(review || {})
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(String(outputPath).replace(/\.(png|jpg|jpeg)$/i, '.html'), html, 'utf8')

  await nodeHtmlToImage({
    output: outputPath,
    html,
    waitUntil: 'domcontentloaded',
    timeout: 120000,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    beforeScreenshot: async page => {
      await page.setViewport({ width: REPORT_WIDTH + 56, height: 900, deviceScaleFactor: 2 })
    }
  })
  return outputPath
}

module.exports = {
  TIER_THEMES,
  generateAiReviewHtml,
  renderAiReview
}
