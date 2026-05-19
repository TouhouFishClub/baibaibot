const fs = require('fs')
const path = require('path')

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getAvatarUrl(uid) {
  return 'https://q1.qlogo.cn/g?b=qq&nk=' + uid + '&s=100'
}

function buildTopicsHtml(topics) {
  if (!topics.length) return '<p class="empty">\u6682\u65e0\u8bdd\u9898\u603b\u7ed3</p>'
  return topics.map((t, i) => `
    <div class="card topic-card">
      <div class="card-head"><span class="badge">${i + 1}</span><h3>${escapeHtml(t.topic)}</h3></div>
      <p class="detail">${escapeHtml(t.detail)}</p>
      <p class="meta">\u53c2\u4e0e\u8005\uff1a${escapeHtml((t.contributors || []).join(' \u00b7 ') || '\u7fa4\u53cb')}</p>
    </div>
  `).join('')
}

function buildTitlesHtml(titles) {
  if (!titles.length) return '<p class="empty">\u6682\u65e0\u7528\u6237\u753b\u50cf</p>'
  return titles.map(t => `
    <div class="card user-card">
      <img class="avatar" src="${getAvatarUrl(t.uid)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="user-body">
        <div class="user-name">${escapeHtml(t.name)} <span class="title-tag">${escapeHtml(t.title)}</span></div>
        ${t.mbti ? '<span class="mbti">' + escapeHtml(t.mbti) + '</span>' : ''}
        <p class="reason">${escapeHtml(t.reason)}</p>
      </div>
    </div>
  `).join('')
}

function buildQuotesHtml(quotes) {
  if (!quotes.length) return '<p class="empty">\u4eca\u65e5\u6682\u65e0\u91d1\u53e5</p>'
  return quotes.map(q => `
    <div class="card quote-card">
      <div class="quote-content">\u300c${escapeHtml(q.content)}\u300d</div>
      <div class="quote-foot">
        <span class="sender">\u2014 ${escapeHtml(q.sender)}</span>
        <span class="reason">${escapeHtml(q.reason)}</span>
      </div>
    </div>
  `).join('')
}

function buildTopUsersHtml(topUsers) {
  return topUsers.slice(0, 8).map((u, i) => `
    <div class="rank-item">
      <span class="rank-no">${i + 1}</span>
      <img class="avatar-sm" src="${getAvatarUrl(u.uid)}" alt="" onerror="this.style.visibility='hidden'">
      <span class="rank-name">${escapeHtml(u.name)}</span>
      <span class="rank-val">${u.messageCount} \u6761</span>
    </div>
  `).join('')
}

function generateHtml(reportData) {
  const {
    groupName,
    dateRangeText,
    generatedAt,
    stats,
    topics,
    titles,
    quotes
  } = reportData

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\u7fa4\u804a\u65e5\u62a5</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    background: linear-gradient(135deg, #fff5f5 0%, #fff9e6 40%, #f0f8ff 100%);
    color: #333;
    padding: 24px;
    width: 900px;
  }
  .header {
    text-align: center;
    margin-bottom: 24px;
    padding: 20px;
    background: rgba(255,255,255,0.85);
    border-radius: 16px;
    border: 2px dashed #ffb6c1;
  }
  .header h1 { font-size: 28px; color: #e85d75; margin-bottom: 8px; }
  .header .sub { color: #888; font-size: 14px; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-box {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .stat-box .num { font-size: 24px; font-weight: bold; color: #e85d75; }
  .stat-box .label { font-size: 12px; color: #999; margin-top: 4px; }
  .section {
    background: rgba(255,255,255,0.9);
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 16px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }
  .section h2 {
    font-size: 18px;
    color: #e85d75;
    margin-bottom: 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid #ffe0e6;
  }
  .hour-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 120px;
    padding-top: 8px;
  }
  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
  }
  .bar-fill {
    width: 100%;
    max-width: 24px;
    background: linear-gradient(180deg, #ff9a9e, #fecfef);
    border-radius: 4px 4px 0 0;
    min-height: 4px;
  }
  .bar-label { font-size: 10px; color: #999; margin-top: 4px; }
  .bar-count { font-size: 9px; color: #bbb; }
  .card {
    background: #fafafa;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border-left: 4px solid #ffb6c1;
  }
  .topic-card .badge {
    display: inline-block;
    background: #e85d75;
    color: #fff;
    width: 22px;
    height: 22px;
    line-height: 22px;
    text-align: center;
    border-radius: 50%;
    font-size: 12px;
    margin-right: 8px;
  }
  .topic-card h3 { display: inline; font-size: 16px; }
  .detail { margin: 10px 0 6px; line-height: 1.6; font-size: 14px; }
  .meta { font-size: 12px; color: #999; }
  .user-card { display: flex; gap: 12px; align-items: flex-start; }
  .avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
  .avatar-sm { width: 32px; height: 32px; border-radius: 50%; }
  .user-name { font-weight: bold; margin-bottom: 4px; }
  .title-tag { color: #e85d75; margin-left: 6px; }
  .mbti {
    display: inline-block;
    background: #e8f4ff;
    color: #4a90d9;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .reason { font-size: 13px; color: #666; line-height: 1.5; }
  .quote-card { border-left-color: #ffd93d; }
  .quote-content { font-size: 15px; font-style: italic; line-height: 1.6; margin-bottom: 8px; }
  .quote-foot { display: flex; justify-content: space-between; font-size: 12px; color: #888; }
  .rank-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .rank-no { width: 24px; font-weight: bold; color: #e85d75; }
  .rank-name { flex: 1; }
  .rank-val { color: #999; font-size: 13px; }
  .empty { color: #aaa; font-style: italic; padding: 8px 0; }
  .footer {
    text-align: center;
    font-size: 11px;
    color: #bbb;
    margin-top: 16px;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>\ud83d\udcca ${escapeHtml(groupName)} \u7fa4\u804a\u65e5\u62a5</h1>
    <p class="sub">${escapeHtml(dateRangeText)} \u00b7 \u751f\u6210\u4e8e ${escapeHtml(generatedAt)}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-box"><div class="num">${stats.messageCount}</div><div class="label">\u6d88\u606f\u603b\u6570</div></div>
    <div class="stat-box"><div class="num">${stats.participantCount}</div><div class="label">\u53c2\u4e0e\u4eba\u6570</div></div>
    <div class="stat-box"><div class="num">${stats.totalCharacters}</div><div class="label">\u603b\u5b57\u7b26\u6570</div></div>
    <div class="stat-box"><div class="num">${stats.emojiCount}</div><div class="label">\u8868\u60c5\u6570</div></div>
  </div>

  <div class="section">
    <h2>\u23f0 \u6d3b\u8dc3\u65f6\u6bb5</h2>
    <p style="margin-bottom:10px;font-size:13px;color:#666;">\u6700\u6d3b\u8dc3\uff1a${escapeHtml(stats.mostActivePeriod)}</p>
    ${stats.hourlyChartHtml}
  </div>

  <div class="section">
    <h2>\ud83c\udfc6 \u8bdd\u7618\u699c TOP8</h2>
    ${buildTopUsersHtml(stats.topUsers)}
  </div>

  <div class="section">
    <h2>\ud83d\udcac \u70ed\u95e8\u8bdd\u9898</h2>
    ${buildTopicsHtml(topics)}
  </div>

  <div class="section">
    <h2>\ud83d\udc64 \u7fa4\u53cb\u753b\u50cf</h2>
    ${buildTitlesHtml(titles)}
  </div>

  <div class="section">
    <h2>\ud83d\udcd6 \u7fa4\u804a\u5723\u7ecf</h2>
    ${buildQuotesHtml(quotes)}
  </div>

  <p class="footer">\u767e\u767e\u673a\u5668\u4eba \u00b7 \u7fa4\u804a\u65e5\u62a5\u5206\u6790</p>
</body>
</html>`
}

async function renderReportImage(reportData, outputPath) {
  const html = generateHtml(reportData)
  const nodeHtmlToImage = require('node-html-to-image')
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  await nodeHtmlToImage({
    output: outputPath,
    html,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  })

  const htmlPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.html')
  fs.writeFileSync(htmlPath, html, 'utf-8')
  return outputPath
}

module.exports = { generateHtml, renderReportImage }
