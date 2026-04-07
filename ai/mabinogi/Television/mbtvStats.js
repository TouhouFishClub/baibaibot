const path = require('path-extra')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const { getClient } = require('../../../mongo/index')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(
  path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf')
)

const DATE_TOKEN = /^\d{4}-\d{1,2}-\d{1,2}$/
const pad2 = n => (n < 10 ? '0' + n : '' + n)

const escHtml = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')

const dateKey = d => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
}

const parseDateStart = s => {
  const t = s.trim()
  if (!DATE_TOKEN.test(t)) return null
  const [y, mo, d] = t.split('-').map(Number)
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0)
  return isNaN(dt.getTime()) ? null : dt
}

const parseDateEnd = s => {
  const t = s.trim()
  if (!DATE_TOKEN.test(t)) return null
  const [y, mo, d] = t.split('-').map(Number)
  const dt = new Date(y, mo - 1, d, 23, 59, 59, 999)
  return isNaN(dt.getTime()) ? null : dt
}

const isDateToken = s => DATE_TOKEN.test(s.trim())

const rangeDefaultThreeMonths = () => {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0)
  start.setMonth(start.getMonth() - 3)
  return { start, end }
}

const parseMbtvsArgs = raw => {
  const args = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (args.length === 0) {
    const { start, end } = rangeDefaultThreeMonths()
    return { start, end, filter: '' }
  }

  if (args.length === 1) {
    if (isDateToken(args[0])) {
      const start = parseDateStart(args[0])
      if (!start) return { error: '开始时间格式无效，请使用 2026-1-1 形式' }
      return { start, end: new Date(), filter: '' }
    }
    const { start, end } = rangeDefaultThreeMonths()
    return { start, end, filter: args[0] }
  }

  if (args.length === 2) {
    if (isDateToken(args[0])) {
      const start = parseDateStart(args[0])
      const end = parseDateEnd(args[1])
      if (!start || !end) return { error: '时间格式无效，请使用 2026-1-1 形式' }
      if (end < start) return { error: '结束时间不能早于开始时间' }
      return { start, end, filter: '' }
    }
    const start = parseDateStart(args[1])
    if (!start) return { error: '开始时间格式无效，请使用 2026-1-1 形式' }
    return { start, end: new Date(), filter: args[0] }
  }

  const start = parseDateStart(args[1])
  const end = parseDateEnd(args[2])
  if (!start || !end) return { error: '时间格式无效，请使用 2026-1-1 形式' }
  if (end < start) return { error: '结束时间不能早于开始时间' }
  return { start, end, filter: args[0] }
}

const formatRangeText = (start, end) => {
  const f = d => {
    const x = new Date(d)
    return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()} ${pad2(x.getHours())}:${pad2(
      x.getMinutes()
    )}`
  }
  return `${f(start)} ~ ${f(end)}`
}

const topNWithOther = (map, n = 8) => {
  const arr = [...map.entries()].sort((a, b) => b[1] - a[1])
  if (arr.length <= n) {
    return { labels: arr.map(([k]) => k), data: arr.map(([, v]) => v) }
  }
  const head = arr.slice(0, n)
  const rest = arr.slice(n).reduce((s, [, v]) => s + v, 0)
  return { labels: [...head.map(([k]) => k), '其他'], data: [...head.map(([, v]) => v), rest] }
}

const enumerateDays = (start, end) => {
  const days = []
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0)
  while (d <= last) {
    days.push(dateKey(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

const normalizeRewardForPie = reward => {
  const raw = reward && String(reward).trim().length ? String(reward).trim() : '(空)'
  if (raw === '(空)') return raw
  if (raw.indexOf('魔法释放') > -1) {
    const idx = raw.lastIndexOf('-')
    if (idx > -1 && idx < raw.length - 1) {
      return raw.substring(idx + 1).replace(/[。.]$/, '').trim()
    }
  }
  if (raw.indexOf('咒语书') > -1) {
    const plusIdx = raw.indexOf('+1')
    if (plusIdx > -1) {
      // 例：套装效果风车强化+1咒语书 -> 风车强化+1
      const head = raw.substring(0, plusIdx)
      const cut = Math.max(head.indexOf('效果'), head.indexOf('专用'))
      const core = (cut > -1 ? head.substring(cut + 2) : head).trim()
      if (core) return `${core}+1`
    }
  }
  return raw
}

const aggregateFromDocs = (docsYlx, docsYate) => {
  const rewardYlx = new Map()
  const rewardYate = new Map()
  const rewardTotal = new Map()
  const dungeonTotal = new Map()
  const channelTotal = new Map()
  const dayYlx = new Map()
  const dayYate = new Map()
  const charYlx = new Map()
  const charYate = new Map()

  const bump = (m, k) => {
    const key = k && String(k).length ? String(k) : '(空)'
    m.set(key, (m.get(key) || 0) + 1)
  }

  const walk = (docs, server) => {
    for (const doc of docs) {
      const t = doc.time ? new Date(doc.time) : new Date(doc.ts)
      const dk = dateKey(t)
      const chName = doc.character_name || ''
      const reward = doc.reward || ''
      const rewardLabel = normalizeRewardForPie(reward)
      const dungeon = doc.dungeon_name || ''
      const channel = doc.channel === undefined || doc.channel === null ? '' : String(doc.channel)

      bump(server === 'ylx' ? rewardYlx : rewardYate, rewardLabel)
      bump(rewardTotal, rewardLabel)
      bump(dungeonTotal, dungeon)
      bump(channelTotal, channel ? `CH${channel}` : '(空)')

      const dayMap = server === 'ylx' ? dayYlx : dayYate
      if (!dayMap.has(dk)) dayMap.set(dk, new Set())
      if (chName) dayMap.get(dk).add(chName)
      if (chName) {
        const charMap = server === 'ylx' ? charYlx : charYate
        charMap.set(chName, (charMap.get(chName) || 0) + 1)
      }
    }
  }

  walk(docsYlx, 'ylx')
  walk(docsYate, 'yate')

  return {
    rewardYlx,
    rewardYate,
    rewardTotal,
    dungeonTotal,
    channelTotal,
    dayYlx,
    dayYate,
    charYlx,
    charYate
  }
}

const piePalette = [
  '#6C9BD2',
  '#E8A87C',
  '#C38D9E',
  '#41B3A3',
  '#E27D60',
  '#8FC1A9',
  '#F64C72',
  '#99738E',
  '#85CDCA',
  '#EAB965'
]

const buildChartPayload = (start, end, agg, filterText) => {
  const {
    rewardYlx,
    rewardYate,
    rewardTotal,
    dungeonTotal,
    channelTotal,
    dayYlx,
    dayYate,
    charYlx,
    charYate
  } = agg

  const pieRewardYlx = topNWithOther(rewardYlx, 15)
  const pieRewardYate = topNWithOther(rewardYate, 15)
  const pieRewardTotal = topNWithOther(rewardTotal, 15)
  const pieDungeon = topNWithOther(dungeonTotal, 15)
  const pieChannel = topNWithOther(channelTotal, 15)

  const labels = enumerateDays(start, end)
  const ylxSeries = labels.map(d => (dayYlx.get(d) ? dayYlx.get(d).size : 0))
  const yateSeries = labels.map(d => (dayYate.get(d) ? dayYate.get(d).size : 0))
  const sumSeries = labels.map((d, i) => ylxSeries[i] + yateSeries[i])

  const topYlx = [...charYlx.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, c], i) => ({ rank: i + 1, name, count: c }))

  const topYate = [...charYate.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, c], i) => ({ rank: i + 1, name, count: c }))

  const totalRecords =
    [...rewardYlx.values()].reduce((s, v) => s + v, 0) + [...rewardYate.values()].reduce((s, v) => s + v, 0)

  return {
    rangeText: formatRangeText(start, end),
    filterNote: filterText && filterText.trim().length ? `筛选：${filterText.trim()}` : '筛选：无（全量）',
    totalRecords,
    pieRewardYlx,
    pieRewardYate,
    pieRewardTotal,
    pieDungeon,
    pieChannel,
    line: { labels, ylxSeries, yateSeries, sumSeries },
    topYlx,
    topYate,
    piePalette
  }
}

const escapeJsonForHtml = obj =>
  JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

const renderStatsImage = async (payload, outputPath) => {
  const dataJson = escapeJsonForHtml(payload)
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    @font-face {
      font-family: 'HANYIWENHEI';
      src: url(${HANYIWENHEI}) format('truetype');
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      font-family: 'HANYIWENHEI', sans-serif;
      background: linear-gradient(165deg, #151820 0%, #1c2230 45%, #12151c 100%);
      color: #e8eaef;
      padding: 28px 32px 32px;
    }
    .hero { border-left: 4px solid #5b8fce; padding-left: 18px; margin-bottom: 22px; }
    .hero h1 {
      font-size: 32px; font-weight: normal; letter-spacing: 2px; color: #f0f2f8;
      text-shadow: 0 2px 24px rgba(91, 143, 206, 0.35);
    }
    .meta { margin-top: 10px; font-size: 17px; color: #9aa3b5; line-height: 1.6; }
    .meta strong { color: #c5d0e0; }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }
    .pie-box {
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 14px 12px 8px;
      min-height: 380px;
    }
    .w3 { width: calc((100% - 32px) / 3); }
    .w2 { width: calc((100% - 16px) / 2); }
    .pie-box h3 {
      text-align: center; font-size: 17px; font-weight: normal; color: #aeb8ca; margin-bottom: 6px;
    }
    .pie-box canvas { margin: 0 auto; display: block; width: 100% !important; height: auto !important; max-height: 300px; }
    .line-wrap {
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 16px 18px 8px;
      margin-bottom: 18px;
      min-height: 300px;
    }
    .line-wrap h3 { font-size: 18px; color: #aeb8ca; margin-bottom: 8px; font-weight: normal; }
    .line-wrap canvas { max-height: 300px; }
    .top5 {
      background: linear-gradient(90deg, rgba(91,143,206,0.12) 0%, rgba(255,255,255,0.03) 100%);
      border-radius: 12px;
      border: 1px solid rgba(91,143,206,0.25);
      padding: 18px 22px;
    }
    .top5 h3 { font-size: 18px; color: #c5d0e0; margin-bottom: 12px; font-weight: normal; }
    .top-split { display: flex; gap: 14px; }
    .top-col { width: calc((100% - 14px) / 2); }
    .top-col .sub-title { color: #aeb8ca; font-size: 14px; margin-bottom: 6px; }
    .top5 ol { list-style: none; counter-reset: r; }
    .top5 li {
      counter-increment: r;
      font-size: 17px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: #dde3ee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .top5 li:last-child { border-bottom: 0; }
    .top5 li::before {
      content: counter(r);
      display: inline-block;
      width: 26px; height: 26px; line-height: 26px; text-align: center;
      background: rgba(91,143,206,0.35);
      border-radius: 6px;
      margin-right: 12px;
      font-size: 14px;
      color: #fff;
    }
    .cnt { color: #7eb8ff; font-size: 15px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>出货统计 · 伊鲁夏 &amp; 亚特</h1>
    <div class="meta">
      <div><strong>查询时间范围</strong>：${payload.rangeText}</div>
      <div>${escHtml(payload.filterNote)}</div>
      <div><strong>记录条数</strong>：${payload.totalRecords}</div>
    </div>
  </div>

  <div class="grid">
    <div class="pie-box w3"><h3>伊鲁夏 · 奖励分布</h3><canvas id="pieRewardYlx"></canvas></div>
    <div class="pie-box w3"><h3>亚特 · 奖励分布</h3><canvas id="pieRewardYate"></canvas></div>
    <div class="pie-box w3"><h3>两区合计 · 奖励分布</h3><canvas id="pieRewardTotal"></canvas></div>
    <div class="pie-box w2"><h3>两区合计 · 地下城分布</h3><canvas id="pieDungeon"></canvas></div>
    <div class="pie-box w2"><h3>两区合计 · 频道分布</h3><canvas id="pieChannel"></canvas></div>
  </div>

  <div class="line-wrap">
    <h3>每日出货人数（当日至少出货 1 次的角色去重）</h3>
    <canvas id="lineDaily"></canvas>
  </div>

  <div class="top5">
    <h3>出货次数最多角色 TOP10（分服）</h3>
    <div class="top-split">
      <div class="top-col">
        <div class="sub-title">伊鲁夏</div>
        <ol>
          ${
            payload.topYlx.length
              ? payload.topYlx
                  .map(x => `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次</span></li>`)
                  .join('')
              : '<li style="padding-left:40px;list-style:none"><span>（无有效角色名）</span></li>'
          }
        </ol>
      </div>
      <div class="top-col">
        <div class="sub-title">亚特</div>
        <ol>
          ${
            payload.topYate.length
              ? payload.topYate
                  .map(x => `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次</span></li>`)
                  .join('')
              : '<li style="padding-left:40px;list-style:none"><span>（无有效角色名）</span></li>'
          }
        </ol>
      </div>
    </div>
  </div>

  <script type="application/json" id="payload">${dataJson}</script>
  <script>
    Chart.defaults.color = '#9aa3b5';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.12)';
    Chart.defaults.font.family = 'HANYIWENHEI, sans-serif';
    const piePalette = ['#6C9BD2','#E8A87C','#C38D9E','#41B3A3','#E27D60','#8FC1A9','#F64C72','#99738E','#85CDCA','#EAB965'];
    function buildPieColors(count, labels) {
      const colors = [];
      for (let i = 0; i < count; i++) {
        if (i < piePalette.length) {
          colors.push(piePalette[i]);
        } else {
          const hue = (i * 137.508) % 360;
          colors.push('hsl(' + hue.toFixed(1) + ', 58%, 62%)');
        }
      }
      const lastIdx = labels.length - 1;
      if (lastIdx >= 0 && labels[lastIdx] === '其他') {
        colors[lastIdx] = '#3a4252';
      }
      return colors;
    }
    const payload = JSON.parse(document.getElementById('payload').textContent);
    const pieOpts = {
      type: 'pie',
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.05,
        layout: { padding: { bottom: 2 } },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 8, font: { size: 16 } }
          }
        }
      }
    };
    function mkPie(id, slice) {
      const bg = buildPieColors(slice.data.length, slice.labels);
      new Chart(document.getElementById(id), {
        ...pieOpts,
        data: { labels: slice.labels, datasets: [{ data: slice.data, backgroundColor: bg, borderWidth: 1, borderColor: '#1a1d26' }] }
      });
    }
    mkPie('pieRewardYlx', payload.pieRewardYlx);
    mkPie('pieRewardYate', payload.pieRewardYate);
    mkPie('pieRewardTotal', payload.pieRewardTotal);
    mkPie('pieDungeon', payload.pieDungeon);
    mkPie('pieChannel', payload.pieChannel);

    const lineLabels = payload.line.labels.map(function (d) {
      var p = d.split('-');
      return p[1] + '/' + p[2];
    });
    new Chart(document.getElementById('lineDaily'), {
      type: 'line',
      data: {
        labels: lineLabels,
        datasets: [
          { label: '伊鲁夏', data: payload.line.ylxSeries, borderColor: '#6C9BD2', backgroundColor: 'rgba(108,155,210,0.15)', tension: 0.25, fill: false, pointRadius: 0 },
          { label: '亚特', data: payload.line.yateSeries, borderColor: '#E8A87C', backgroundColor: 'rgba(232,168,124,0.15)', tension: 0.25, fill: false, pointRadius: 0 },
          { label: '两区相加', data: payload.line.sumSeries, borderColor: '#41B3A3', backgroundColor: 'rgba(65,179,163,0.12)', tension: 0.25, fill: false, pointRadius: 0, borderDash: [6, 4] }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 18 } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: { legend: { position: 'top' } }
      }
    });
  </script>
</body>
</html>`

  await nodeHtmlToImage({
    html,
    output: outputPath,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    beforeScreenshot: async page => {
      await page.evaluate(() => document.fonts && document.fonts.ready)
      await new Promise(r => setTimeout(r, 500))
    }
  })
}

const mabiTelevisionStats = async (content, _qq, callback) => {
  const parsed = parseMbtvsArgs(content)
  if (parsed.error) {
    callback(parsed.error)
    return
  }

  const { start, end, filter } = parsed
  const client = await getClient()
  if (!client) {
    callback('数据库暂时不可用')
    return
  }
  const db = client.db('db_bot')

  // 避免 newMbtv <-> mbtvStats 循环依赖导致的导出未初始化
  const { buildMongoQuery } = require('./newMbtv')
  if (typeof buildMongoQuery !== 'function') {
    callback('mbtv 统计模块加载失败（buildMongoQuery 不可用），请稍后重试或重启进程。')
    return
  }

  const baseQuery = await buildMongoQuery(filter)
  const timeQuery = { time: { $gte: start, $lte: end } }
  const finalQuery =
    baseQuery && Object.keys(baseQuery).length ? { $and: [baseQuery, timeQuery] } : timeQuery

  const fields = { time: 1, reward: 1, dungeon_name: 1, character_name: 1, channel: 1, ts: 1, _id: 0 }

  const [docsYlx, docsYate] = await Promise.all([
    db.collection('cl_mbtv_ylx').find(finalQuery, fields).toArray(),
    db.collection('cl_mbtv_yate').find(finalQuery, fields).toArray()
  ])

  const agg = aggregateFromDocs(docsYlx, docsYate)
  const payload = buildChartPayload(start, end, agg, filter)

  if (payload.totalRecords === 0) {
    callback('该时间范围内没有匹配的记录，可放宽筛选或调整时间。')
    return
  }

  const outputDir = path.join(IMAGE_DATA, 'mabi_other', 'MabiTVStats.png')
  await renderStatsImage(payload, outputDir)
  callback(`[CQ:image,file=${path.join('send', 'mabi_other', 'MabiTVStats.png')}]`)
}

module.exports = {
  mabiTelevisionStats,
  parseMbtvsArgs
}

