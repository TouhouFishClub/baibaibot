const path = require('path-extra')
const fs = require('fs')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
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

function formatGeneratedAt(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = n => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function renderList(items) {
  const list = (items || []).map(item => String(item || '').trim()).filter(Boolean)
  if (!list.length) return '<div class="muted">暂无</div>'
  return `<ul>${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderClassCard(item) {
  const theme = getClassTheme(item.name)
  const primary = theme.primary || '#6B7280'
  const secondary = theme.secondary || '#9CA3AF'
  return `
  <section class="class-card" style="--c1:${primary};--c2:${secondary};--bg:${hexToRgba(primary, 0.08)};--border:${hexToRgba(primary, 0.28)}">
    <header>
      <div class="class-name">${escapeHtml(item.name)}</div>
      <div class="class-summary">${escapeHtml(item.summary || '')}</div>
    </header>
    <div class="grid">
      <div>
        <h4>优点</h4>
        ${renderList(item.pros)}
      </div>
      <div>
        <h4>缺点</h4>
        ${renderList(item.cons)}
      </div>
    </div>
    <div class="block">
      <h4>技能数据</h4>
      <p>${escapeHtml(item.skills || '暂无')}</p>
    </div>
    <div class="block">
      <h4>各 Boss 表现</h4>
      <p>${escapeHtml(item.bossPerformance || '暂无')}</p>
    </div>
    <div class="block">
      <h4>趋势</h4>
      <p>${escapeHtml(item.trend || '暂无')}</p>
    </div>
  </section>`
}

function generateHtml(report) {
  const classesHtml = (report.classes || []).map(renderClassCard).join('')
  const bossNotes = renderList(report.bossNotes)
  const classOrderHint = CLASSES.map(cls => cls.name).join(' / ')

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
    text-align: right;
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
    <div class="panel">${escapeHtml(report.overview || '暂无')}</div>

    <div class="section-title">Boss 观察</div>
    <div class="panel">${bossNotes}</div>

    <div class="section-title">十职业分析</div>
    ${classesHtml || '<div class="panel muted">暂无职业分析</div>'}

    <div class="section-title">宏观趋势</div>
    <div class="panel">${escapeHtml(report.macroTrend || '暂无')}</div>

    <div class="footer">mblogs AI 分析 · 报告中不展示角色名</div>
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
  renderAiAnalysisReport
}
