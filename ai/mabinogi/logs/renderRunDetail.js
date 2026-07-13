const path = require('path-extra')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const {
  COLORS,
  BAR_CLASSES,
  formatNumber,
  formatDps,
  formatDuration
} = require('./runChartData')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function roundStep(maxValue) {
  if (maxValue >= 100_000) return 50_000
  if (maxValue >= 10_000) return 5_000
  if (maxValue >= 1_000) return 500
  return 100
}

function buildSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i === points.length - 2 ? p2 : points[i + 2]
    const tension = 0.5
    const cp1x = p1.x + (p2.x - p0.x) * tension / 2
    const cp2x = p2.x - (p3.x - p1.x) * tension / 2
    const cp1y = p1.y + (p2.y - p0.y) * tension / 2
    const cp2y = p2.y - (p3.y - p1.y) * tension / 2
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function buildDpsChartSvg(panel, width = 860, height = 260) {
  const padding = { top: 24, right: 20, bottom: 30, left: 54 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const { timeRange, dpsSeries, bossHpMarkers } = panel

  if (!timeRange || !dpsSeries.length) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <text x="${width / 2}" y="${height / 2}" fill="#666" font-size="12" text-anchor="middle">暂无趋势数据</text>
    </svg>`
  }

  const minTime = timeRange.minTime
  const maxTime = timeRange.maxTime
  const timeSpan = Math.max(maxTime - minTime, 1)

  let maxDps = 0
  for (const series of dpsSeries) {
    for (const point of series.points) {
      if (point.dps > maxDps) maxDps = point.dps
    }
  }
  const step = roundStep(maxDps)
  maxDps = Math.max(step, Math.ceil(maxDps / step) * step)

  const yTicks = 5
  const xTicks = Math.max(5, Math.floor(chartWidth / 80))
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`

  svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.2)" />`
  svg += `<line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.2)" />`
  svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="rgba(244,67,54,0.7)" stroke-width="1.5" />`

  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + chartHeight * i / yTicks
    const value = maxDps * (1 - i / yTicks)
    let label
    if (value >= 1_000_000) label = `${(value / 1_000_000).toFixed(1)}M/s`
    else if (value >= 1_000) label = `${Math.round(value / 1_000)}k/s`
    else label = `${Math.round(value)}/s`
    svg += `<text x="${padding.left - 6}" y="${y + 4}" fill="#888" font-size="10" text-anchor="end">${label}</text>`
    if (i > 0 && i < yTicks) {
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" />`
    }
  }

  for (let i = 0; i <= xTicks; i++) {
    const time = minTime + timeSpan * i / xTicks
    const x = padding.left + chartWidth * i / xTicks
    const seconds = Math.floor((time - minTime) / 1000)
    let label
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      label = `${mins}:${String(secs).padStart(2, '0')}`
    } else {
      label = `${seconds}s`
    }
    svg += `<text x="${x}" y="${height - padding.bottom + 16}" fill="#888" font-size="10" text-anchor="middle">${label}</text>`
    svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.08)" />`
  }

  for (const marker of bossHpMarkers) {
    const x = padding.left + ((marker.time - minTime) / timeSpan) * chartWidth
    svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.25)" stroke-dasharray="6 8" />`
    if (marker.percent === 100 || marker.percent === 0 || marker.percent % 5 === 0) {
      svg += `<text x="${x}" y="${padding.top - 6}" fill="rgba(255,82,82,0.95)" font-size="10" font-weight="700" text-anchor="middle">${Math.round(marker.percent)}%</text>`
    }
    svg += `<rect x="${x - 3}" y="${height - padding.bottom - 6}" width="6" height="6" fill="rgba(244,67,54,0.6)" />`
  }

  dpsSeries.slice(0, 12).forEach((series, index) => {
    if (series.points.length < 2) return
    const color = COLORS[index % COLORS.length]
    const points = series.points.map(point => ({
      x: padding.left + ((point.time - minTime) / timeSpan) * chartWidth,
      y: padding.top + (1 - point.dps / maxDps) * chartHeight
    }))
    svg += `<path d="${buildSmoothPath(points)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
  })

  svg += '</svg>'
  return svg
}

function renderAttackerRow(attacker) {
  const barClass = BAR_CLASSES[attacker.colorIndex % BAR_CLASSES.length]
  return `
    <div class="damage-item">
      <div class="damage-bar ${barClass}" style="width:${attacker.barWidth.toFixed(1)}%"></div>
      <div class="damage-content">
        <div class="damage-name">${escapeHtml(attacker.name)}</div>
        <div class="damage-info">
          <span class="damage-dps">${formatNumber(attacker.dps)}/s</span>
          <span class="damage-value">${formatNumber(attacker.totalDamage)}</span>
          <span class="damage-percent">${attacker.percent.toFixed(1)}%</span>
        </div>
      </div>
    </div>`
}

function renderBossSection(panel, index) {
  const rankings = panel.dpsSeries.slice(0, 10)
  return `
    <section class="boss-section">
      <div class="boss-summary">
        <div class="boss-summary-left">
          <div class="boss-duration">${formatDuration(panel.duration)}</div>
          <div class="boss-dps">${formatNumber(panel.dps)}/s</div>
          <div class="boss-name">${escapeHtml(panel.targetName)}</div>
          <div class="boss-total">总计 ${formatNumber(panel.totalDamage)}</div>
        </div>
      </div>
      <div class="section-caption">对 ${escapeHtml(panel.targetName)} 造成伤害的所有来源</div>
      <div class="attacker-list">
        ${panel.attackers.map(renderAttackerRow).join('')}
      </div>
      <div class="chart-block">
        <div class="chart-header">历史记录全程DPS趋势图</div>
        <div class="rankings-bar">
          ${rankings.map((item, rankIndex) => `
            <div class="ranking-item" style="border-left-color:${COLORS[rankIndex % COLORS.length]}">
              <span class="rank-number">${rankIndex + 1}</span>
              <span class="rank-name">${escapeHtml(item.attackerName)}</span>
              <span class="rank-dps">${formatDps(item.currentDps)}</span>
            </div>
          `).join('')}
        </div>
        <div class="chart-body">${buildDpsChartSvg(panel)}</div>
      </div>
    </section>`
}

function buildRunDetailHtml({ title, description, panels }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @font-face {
      font-family: 'HANYIWENHEI';
      src: url(${HANYIWENHEI}) format('truetype');
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 920px;
      background: #1c1c1c;
      color: #eee;
      font-family: 'Microsoft YaHei', sans-serif;
      padding: 18px 20px 24px;
    }
    .page-title {
      font-family: HANYIWENHEI;
      font-size: 30px;
      color: #eee;
      margin-bottom: 6px;
    }
    .page-desc {
      font-size: 14px;
      color: #888;
      margin-bottom: 18px;
    }
    .boss-section {
      margin-bottom: 22px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      overflow: hidden;
      background: rgba(24,24,24,0.95);
    }
    .boss-summary {
      padding: 10px 12px;
      background: rgba(30,30,30,0.9);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .boss-duration { color: #81c784; font-size: 12px; }
    .boss-dps { color: #64b5f6; font-size: 12px; margin-top: 2px; }
    .boss-name { color: #fff; font-size: 16px; font-weight: 600; margin-top: 4px; }
    .boss-total { color: #ffc107; font-size: 12px; margin-top: 2px; }
    .section-caption {
      padding: 8px 12px 6px;
      font-size: 12px;
      color: #aaa;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .attacker-list { padding: 8px 10px; }
    .damage-item {
      position: relative;
      overflow: hidden;
      background: rgba(40,40,40,0.6);
      border-radius: 4px;
      margin-bottom: 3px;
      padding: 6px 8px;
    }
    .damage-bar {
      position: absolute;
      left: 0; top: 0; height: 100%;
    }
    .bar-gold { background: linear-gradient(90deg, rgba(255,193,7,0.5), rgba(255,193,7,0.1)); }
    .bar-purple { background: linear-gradient(90deg, rgba(156,39,176,0.4), rgba(156,39,176,0.1)); }
    .bar-teal { background: linear-gradient(90deg, rgba(0,150,136,0.4), rgba(0,150,136,0.1)); }
    .bar-blue { background: linear-gradient(90deg, rgba(66,165,245,0.4), rgba(66,165,245,0.1)); }
    .bar-orange { background: linear-gradient(90deg, rgba(255,152,0,0.4), rgba(255,152,0,0.1)); }
    .bar-pink { background: linear-gradient(90deg, rgba(233,30,99,0.4), rgba(233,30,99,0.1)); }
    .damage-content {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .damage-name {
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .damage-info {
      display: flex;
      gap: 8px;
      font-size: 11px;
      white-space: nowrap;
    }
    .damage-dps { color: #81c784; min-width: 52px; text-align: right; }
    .damage-value { color: #ffc107; min-width: 52px; text-align: right; font-weight: 600; }
    .damage-percent { color: #aaa; min-width: 40px; text-align: right; }
    .chart-block {
      border-top: 1px solid rgba(255,255,255,0.1);
      background: rgba(18,18,18,0.9);
    }
    .chart-header {
      padding: 6px 8px;
      font-size: 11px;
      color: #aaa;
      background: rgba(30,30,30,0.8);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .rankings-bar {
      display: flex;
      gap: 8px;
      padding: 4px 8px;
      overflow: hidden;
      flex-wrap: wrap;
      background: rgba(20,20,20,0.9);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .ranking-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: rgba(255,255,255,0.05);
      border-left: 3px solid;
      border-radius: 0 3px 3px 0;
      font-size: 10px;
      white-space: nowrap;
    }
    .rank-number { color: #888; font-weight: 700; }
    .rank-name { color: #ccc; max-width: 90px; overflow: hidden; text-overflow: ellipsis; }
    .rank-dps { color: #64b5f6; font-weight: 700; }
    .chart-body { padding: 4px 8px 8px; }
  </style>
</head>
<body>
  <div class="page-title">${escapeHtml(title)}</div>
  <div class="page-desc">${escapeHtml(description)}</div>
  ${panels.map(renderBossSection).join('')}
</body>
</html>`
}

async function renderRunDetail(option) {
  const html = buildRunDetailHtml(option)
  await nodeHtmlToImage({
    output: option.output,
    html,
    puppeteerArgs: {
      defaultViewport: {
        width: 920,
        height: Math.max(600, 180 + option.panels.length * 430)
      }
    }
  })
}

module.exports = {
  buildRunDetailHtml,
  renderRunDetail,
  buildDpsChartSvg
}
