const path = require('path-extra')
const fs = require('fs')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { BOSSES } = require('./bossConfig')
const { CLASSES, getClassTheme, hexToRgba } = require('./classConfig')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))
const REPORT_WIDTH = 920

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatGeneratedAt(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = n => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTokenUsage(usage) {
  const prompt = Number(usage?.prompt_tokens) || 0
  const completion = Number(usage?.completion_tokens) || 0
  const total = Number(usage?.total_tokens) || (prompt + completion)
  if (!prompt && !completion && !total) return 'Tokens: -'
  return `Tokens: 输入 ${prompt.toLocaleString('en-US')} / 输出 ${completion.toLocaleString('en-US')}（合计 ${total.toLocaleString('en-US')}）`
}

function buildHighlightTerms(report) {
  // priority: class > boss > skill（同名时取更高优先级）
  const map = new Map()

  const add = (text, type, minLen = 2) => {
    const value = String(text || '').trim()
    if (!value || [...value].length < minLen) return
    const prev = map.get(value)
    const rank = { class: 3, boss: 2, skill: 1 }
    if (prev && rank[prev] >= rank[type]) return
    map.set(value, type)
  }

  for (const cls of CLASSES) {
    add(cls.name, 'class', 2)
    for (const alias of cls.aliases || []) {
      // 过短别名（如 T、弓、奶）易误伤正文，跳过
      if ([...String(alias)].length < 2) continue
      if (['T', '弓', '奶'].includes(alias)) continue
      add(alias, 'class', 2)
    }
  }

  const bossNames = new Set()
  for (const boss of BOSSES) {
    add(boss.displayName, 'boss', 2)
    bossNames.add(boss.displayName)
    for (const alias of boss.aliases || []) {
      if ([...String(alias)].length < 2) continue
      if (/^[一二三四]王$/.test(alias)) continue
      add(alias, 'boss', 2)
    }
  }

  for (const cls of CLASSES) {
    for (const skill of cls.skills || []) add(skill, 'skill', 2)
  }
  for (const skill of report?.lexicon?.skills || []) add(skill, 'skill', 2)

  return map
}

function highlightText(text, termMap) {
  const raw = String(text ?? '')
  if (!raw) return ''
  const keys = [...termMap.keys()].sort((a, b) => b.length - a.length)
  if (!keys.length) return escapeHtml(raw)

  const re = new RegExp(`(${keys.map(escapeRegExp).join('|')})`, 'g')
  return raw.split(re).map(part => {
    const type = termMap.get(part)
    if (!type) return escapeHtml(part)
    return `<span class="hl hl-${type}">${escapeHtml(part)}</span>`
  }).join('')
}

function renderList(items, termMap) {
  const list = (items || []).map(item => String(item || '').trim()).filter(Boolean)
  if (!list.length) return '<div class="muted">暂无</div>'
  return `<ul>${list.map(item => `<li>${highlightText(item, termMap)}</li>`).join('')}</ul>`
}

function renderClassCard(item, termMap) {
  const theme = getClassTheme(item.name)
  const primary = theme.primary || '#6B7280'
  const secondary = theme.secondary || '#9CA3AF'
  return `
  <section class="class-card" style="--c1:${primary};--c2:${secondary};--bg:${hexToRgba(primary, 0.08)};--border:${hexToRgba(primary, 0.28)}">
    <header>
      <div class="class-name">${highlightText(item.name || '', termMap)}</div>
      <div class="class-summary">${highlightText(item.summary || '', termMap)}</div>
    </header>
    <div class="grid">
      <div>
        <h4>优点</h4>
        ${renderList(item.pros, termMap)}
      </div>
      <div>
        <h4>缺点</h4>
        ${renderList(item.cons, termMap)}
      </div>
    </div>
    <div class="block">
      <h4>技能数据</h4>
      <p>${highlightText(item.skills || '暂无', termMap)}</p>
    </div>
    <div class="block">
      <h4>各 Boss 表现</h4>
      <p>${highlightText(item.bossPerformance || '暂无', termMap)}</p>
    </div>
    <div class="block">
      <h4>趋势</h4>
      <p>${highlightText(item.trend || '暂无', termMap)}</p>
    </div>
  </section>`
}

function generateHtml(report) {
  const termMap = buildHighlightTerms(report)
  const classesHtml = (report.classes || []).map(item => renderClassCard(item, termMap)).join('')
  const bossNotes = renderList(report.bossNotes, termMap)
  const classOrderHint = CLASSES.map(cls => cls.name).join(' / ')
  const tokenText = formatTokenUsage(report.usage)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'ReportFont';
    src: url(${HANYIWENHEI}) format('truetype');
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px;
    width: ${REPORT_WIDTH}px;
    background:
      radial-gradient(1200px 500px at 10% -10%, rgba(56, 189, 248, 0.18), transparent 55%),
      radial-gradient(900px 420px at 100% 0%, rgba(251, 146, 60, 0.14), transparent 50%),
      linear-gradient(180deg, #0f172a 0%, #111827 48%, #0b1220 100%);
    color: #e5e7eb;
    font-family: 'ReportFont', sans-serif;
  }
  .wrap {
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 18px;
    padding: 28px 28px 20px;
  }
  .title {
    font-size: 34px;
    letter-spacing: 1px;
    margin: 0 0 8px;
    color: #f8fafc;
  }
  .meta {
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 22px;
  }
  .section-title {
    margin: 22px 0 10px;
    font-size: 20px;
    color: #fbbf24;
  }
  .panel {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 14px;
    padding: 16px 18px;
    line-height: 1.7;
    font-size: 15px;
    white-space: pre-wrap;
  }
  .muted { color: #94a3b8; }
  ul {
    margin: 0;
    padding-left: 18px;
  }
  li { margin: 4px 0; line-height: 1.55; }
  .hl {
    font-weight: 700;
    border-radius: 4px;
    padding: 0 3px;
  }
  .hl-class {
    color: #fef3c7;
    background: rgba(251, 191, 36, 0.18);
    box-shadow: inset 0 -1px 0 rgba(251, 191, 36, 0.55);
  }
  .hl-boss {
    color: #cffafe;
    background: rgba(34, 211, 238, 0.16);
    box-shadow: inset 0 -1px 0 rgba(34, 211, 238, 0.5);
  }
  .hl-skill {
    color: #fce7f3;
    background: rgba(244, 114, 182, 0.16);
    box-shadow: inset 0 -1px 0 rgba(244, 114, 182, 0.5);
  }
  .class-card {
    margin-top: 14px;
    border: 1px solid var(--border);
    background: linear-gradient(135deg, var(--bg), rgba(15, 23, 42, 0.55));
    border-radius: 14px;
    padding: 16px 18px;
  }
  .class-card header {
    border-left: 4px solid var(--c1);
    padding-left: 12px;
    margin-bottom: 12px;
  }
  .class-name {
    font-size: 22px;
    color: #fff;
  }
  .class-summary {
    margin-top: 4px;
    color: #cbd5e1;
    font-size: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  h4 {
    margin: 0 0 6px;
    font-size: 14px;
    color: var(--c2);
  }
  .block {
    margin-top: 12px;
  }
  .block p {
    margin: 0;
    line-height: 1.7;
    font-size: 14px;
    color: #e2e8f0;
    white-space: pre-wrap;
  }
  .footer {
    margin-top: 18px;
    color: #64748b;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .footer-left {
    text-align: left;
    color: #94a3b8;
  }
  .footer-right {
    text-align: right;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="wrap">
    <h1 class="title">${escapeHtml(report.title || 'mblogs AI 分析报告')}</h1>
    <div class="meta">
      生成时间：${escapeHtml(formatGeneratedAt(report.generatedAt))}
      · ${report.hasPrevious ? '已对比上一期快照' : '首次分析（无历史对比）'}
      · 职业覆盖：${escapeHtml(classOrderHint)}
    </div>

    <div class="section-title">整体概述</div>
    <div class="panel">${highlightText(report.overview || '暂无', termMap)}</div>

    <div class="section-title">Boss 观察</div>
    <div class="panel">${bossNotes}</div>

    <div class="section-title">十职业分析</div>
    ${classesHtml || '<div class="panel muted">暂无职业分析</div>'}

    <div class="section-title">宏观趋势</div>
    <div class="panel">${highlightText(report.macroTrend || '暂无', termMap)}</div>

    <div class="footer">
      <div class="footer-left">${escapeHtml(tokenText)}</div>
      <div class="footer-right">mblogs AI 分析 · 报告中不展示角色名</div>
    </div>
  </div>
</body>
</html>`
}

async function renderAiAnalysisReport(report, outputPath) {
  const html = generateHtml(report || {})
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const htmlPath = String(outputPath).replace(/\.(png|jpg|jpeg)$/i, '.html')
  fs.writeFileSync(htmlPath, html, 'utf8')

  await nodeHtmlToImage({
    output: outputPath,
    html,
    waitUntil: 'domcontentloaded',
    timeout: 120000,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    beforeScreenshot: async (page) => {
      await page.setViewport({
        width: REPORT_WIDTH + 56,
        height: 900,
        deviceScaleFactor: 2
      })
    }
  })

  return outputPath
}

module.exports = {
  generateHtml,
  renderAiAnalysisReport,
  buildHighlightTerms,
  highlightText,
  formatTokenUsage
}
