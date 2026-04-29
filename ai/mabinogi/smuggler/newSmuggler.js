const path = require('path')
const fs = require('fs')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { getClient } = require('../../../mongo')
const { IMAGE_DATA } = require('../../../baibaiConfigs')

// 引入韩服走私抓取/定时入库模块（require 时会自动启动 36 分钟定时任务）
const { getNextSmugKrPrediction } = require('./smugKrScheduler')

// 主走私查询：当国服最新一条 forecast 距今超过这个阈值时，认为可能维护中／bot 失联
// 36 分钟一个周期 + 一些缓冲 ≈ 50 分钟
const STALE_DOC_THRESHOLD_MS = 50 * 60 * 1000

const products = require('./assets/product.json')
const vehicles = require('./assets/vehicle.json')

const FONT_PATH = path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf')
const FONT_DATA = fs.existsSync(FONT_PATH)
  ? font2base64.encodeToDataUrlSync(FONT_PATH)
  : ''

const imgToBase64 = imgPath => {
  try {
    if (!fs.existsSync(imgPath)) return ''
    const data = fs.readFileSync(imgPath)
    const ext = path.extname(imgPath).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    return `data:${mime};base64,${data.toString('base64')}`
  } catch { return '' }
}

const formatTime = ts => {
  const d = new Date(ts)
  const z = n => (n < 10 ? '0' + n : n)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`
}

const findProduct = itemName => products.find(p => p.name === itemName) || null

const calcVehicles = product => {
  if (!product) return []
  return vehicles.map(v => {
    const perSlotWeight = product.weight * product.boxCount
    const slotsByWeight = perSlotWeight > 0 ? Math.floor(v.weight / perSlotWeight) : 0
    const actualSlots = Math.min(v.block, slotsByWeight)
    const totalItems = actualSlots * product.boxCount
    const totalCost = totalItems * product.price
    return { ...v, actualSlots, totalItems, totalCost }
  }).sort((a, b) => {
    if (b.totalCost !== a.totalCost) return b.totalCost - a.totalCost
    const sa = a.speed ?? 0
    const sb = b.speed ?? 0
    return sb - sa
  })
}

const LEVEL_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' }
const LEVEL_COLORS = { 1: '#8BC34A', 2: '#42A5F5', 3: '#AB47BC', 4: '#FF7043', 5: '#FFD700' }
const STATUS_MAP = {
  forecast: { label: '即将出现', color: '#FFA726', icon: '⏳' },
  appear: { label: '出现中', color: '#66BB6A', icon: '✅' },
  disappear_forecast: { label: '即将消失', color: '#EF5350', icon: '⚠️' },
  absent: { label: '未出现', color: '#78909C', icon: '🛑' }
}
const DEFAULT_STATUS = { label: '走私消息', color: '#78909C', icon: '📢' }

// === 走私 cycle 相位（由抓包数据反推得到的现实时间偏移）===
//   forecast(0)  ──4分30秒──>  appear(4.5min)  ──7分30秒──>  disappear_forecast(12min)
//                                                       ──4分30秒──>  实际消失(16.5min)
//                                                       ──19分30秒──> 下一个 forecast(36min)
const PHASE_F2A_MS = 4.5 * 60 * 1000        // forecast → appear
const PHASE_A2DF_MS = 7.5 * 60 * 1000       // appear → disappear_forecast
const PHASE_DF2GONE_MS = 4.5 * 60 * 1000    // disappear_forecast → 实际消失
const CYCLE_MS = 36 * 60 * 1000             // 完整 cycle

const fmtClock = ts => {
  const d = new Date(ts)
  const z = n => (n < 10 ? '0' + n : n)
  return `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`
}

// 倒计时（剩余 ms）格式化：3分5秒 / 12分钟 / 45秒
const fmtCountdown = ms => {
  const safe = Math.max(0, ms)
  const total = Math.round(safe / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s}秒`
  if (s === 0) return `${m}分钟`
  return `${m}分${s}秒`
}

// 反推 doc 所属 cycle 的 anchor (forecast.ts)
const anchorOfDoc = d => {
  if (!d || typeof d.ts !== 'number') return null
  if (d.type === 'forecast') return d.ts
  if (d.type === 'appear') return d.ts - PHASE_F2A_MS
  if (d.type === 'disappear_forecast') return d.ts - PHASE_F2A_MS - PHASE_A2DF_MS
  return null
}

// 给定最近一段时间内所有走私事件，算出当前 cycle 状态
//   抗丢包：每条记录都能反推出 anchor，互为冗余
//   抗重复：anchor 接近（< 90s）的记录视为同一 cycle，appear/forecast 优先填 area+item
const ANCHOR_GROUP_TOLERANCE_MS = 90 * 1000
const computeSmugglerStatus = (docs, now) => {
  if (!Array.isArray(docs) || docs.length === 0) return null

  let anchorTs = null
  let area = null
  let item = null

  for (const d of docs) {
    const a = anchorOfDoc(d)
    if (a == null) continue

    if (anchorTs == null || a > anchorTs + ANCHOR_GROUP_TOLERANCE_MS) {
      anchorTs = a
      area = d.area || null
      item = d.item || null
    } else if (Math.abs(a - anchorTs) <= ANCHOR_GROUP_TOLERANCE_MS) {
      if (d.type === 'appear') {
        if (d.area) area = d.area
        if (d.item) item = d.item
      } else if (d.type === 'forecast' && !item) {
        if (d.area && !area) area = d.area
        if (d.item) item = d.item
      } else if (d.area && !area) {
        area = d.area
      }
    }
  }

  if (anchorTs == null) return null

  const phase = now - anchorTs
  let status
  if (phase < 0) {
    status = 'forecast'
  } else if (phase < PHASE_F2A_MS) {
    status = 'forecast'
  } else if (phase < PHASE_F2A_MS + PHASE_A2DF_MS) {
    status = 'appear'
  } else if (phase < PHASE_F2A_MS + PHASE_A2DF_MS + PHASE_DF2GONE_MS) {
    status = 'disappear_forecast'
  } else if (phase < CYCLE_MS) {
    status = 'absent'
  } else {
    return { stale: true, anchorTs, area, item }
  }

  // 倒计时锚点：
  //   forecast  / absent     → 距离下一次"出现"剩余时间
  //   appear    / disappear  → 距离实际"消失"剩余时间
  const appearTs = anchorTs + PHASE_F2A_MS
  const goneTs = anchorTs + PHASE_F2A_MS + PHASE_A2DF_MS + PHASE_DF2GONE_MS
  const nextAppearTs = anchorTs + CYCLE_MS + PHASE_F2A_MS

  let etaText = ''
  if (status === 'forecast') {
    etaText = `${fmtCountdown(appearTs - now)} 后出现 (${fmtClock(appearTs)})`
  } else if (status === 'appear') {
    etaText = `${fmtCountdown(goneTs - now)} 后消失 (${fmtClock(goneTs)})`
  } else if (status === 'disappear_forecast') {
    etaText = `${fmtCountdown(goneTs - now)} 后消失 (${fmtClock(goneTs)})`
  } else if (status === 'absent') {
    etaText = `${fmtCountdown(nextAppearTs - now)} 后出现 (${fmtClock(nextAppearTs)})`
  }

  return { stale: false, status, anchorTs, area, item, etaText }
}

// 把"下次走私"的 KR 记录组装成 buildHtml 需要的预测上下文
//   doc: cl_mabinogi_smuggler_kr 的一条记录（含可能的 goodsCN/positionCN）
const buildPredictionCtx = doc => {
  if (!doc) return null

  const ts = doc.krTs || (doc.krTime ? new Date(doc.krTime).getTime() : 0)
  const timeStr = ts ? formatTime(ts) : ''

  const goodsCN = (doc.goodsCN || '').trim()
  const positionCN = (doc.positionCN || '').trim()

  const product = goodsCN ? findProduct(goodsCN) : null
  const productImg = product
    ? imgToBase64(path.join(__dirname, 'assets', 'product', product.img))
    : ''
  const areaImg = positionCN
    ? imgToBase64(path.join(__dirname, 'assets', 'area', `${positionCN}.png`))
    : ''
  const levelColor = product ? (LEVEL_COLORS[product.level] || '#999') : '#999'
  const levelStars = product ? (LEVEL_STARS[product.level] || '') : ''

  return {
    timeStr,
    goodsKR: doc.goods || '',
    goodsCN,
    positionKR: doc.position || '',
    positionCN,
    values: doc.values || '',
    product,
    productImg,
    areaImg,
    levelColor,
    levelStars
  }
}

const buildHtml = ctx => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
@font-face { font-family:'MF'; src:url(${ctx.font}) format('truetype'); }
*{margin:0;padding:0;box-sizing:border-box;}
body{
  width:520px;
  font-family:'MF','Microsoft YaHei','PingFang SC',sans-serif;
  background:linear-gradient(160deg,#0c1022 0%,#141830 40%,#0e1528 100%);
  color:#d8d0c4;
  padding:16px;
}
.status-bar{
  display:flex;align-items:center;gap:10px;
  padding:10px 16px;border-radius:10px;
  background:linear-gradient(135deg,${ctx.statusColor}22,${ctx.statusColor}08);
  border:1px solid ${ctx.statusColor}44;
  margin-bottom:14px;
}
.status-icon{font-size:22px;}
.status-label{font-size:18px;font-weight:700;color:${ctx.statusColor};}
.status-time{margin-left:auto;font-size:12px;color:rgba(255,255,255,.4);}
.stale-banner{
  display:flex;align-items:center;gap:8px;
  padding:8px 14px;border-radius:8px;
  background:linear-gradient(135deg,rgba(239,83,80,.15),rgba(239,83,80,.06));
  border:1px solid rgba(239,83,80,.4);
  color:#ffb3b0;font-size:12px;font-weight:600;
  margin-bottom:14px;letter-spacing:.3px;
}
.stale-banner .stale-icon{font-size:16px;}
.card{
  background:linear-gradient(180deg,rgba(26,24,50,.95),rgba(16,14,34,.98));
  border:1px solid rgba(218,165,32,.15);
  border-radius:10px;overflow:hidden;
  box-shadow:0 4px 20px rgba(0,0,0,.35);
  margin-bottom:12px;
}
.card-header{
  display:flex;align-items:center;gap:8px;
  padding:10px 16px;
  background:linear-gradient(90deg,rgba(218,165,32,.1),transparent);
  border-bottom:1px solid rgba(218,165,32,.1);
}
.card-title{font-size:14px;font-weight:700;color:#daa520;letter-spacing:1px;}
.card-body{padding:14px 16px;}
.product-row{display:flex;gap:14px;align-items:flex-start;}
.product-img{
  width:80px;height:80px;border-radius:8px;
  background:rgba(218,165,32,.06);
  border:1px solid rgba(218,165,32,.2);
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;flex-shrink:0;
}
.product-img img{max-width:72px;max-height:72px;object-fit:contain;}
.product-detail{flex:1;display:flex;flex-direction:column;gap:6px;}
.product-name{font-size:20px;font-weight:700;color:#ffd700;text-shadow:0 0 14px rgba(255,215,0,.15);}
.product-origin{font-size:13px;color:rgba(255,255,255,.55);}
.product-origin span{color:#64B5F6;font-weight:600;}
.product-level{
  display:inline-block;padding:2px 10px;border-radius:12px;font-size:13px;
  font-weight:700;letter-spacing:2px;
}
.info-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
.info-tag{
  padding:4px 10px;border-radius:6px;font-size:12px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  color:rgba(255,255,255,.65);
}
.info-tag b{color:#e0d6c8;font-weight:600;}
.vehicle-table{width:100%;border-collapse:separate;border-spacing:0 4px;}
.vehicle-table th{
  font-size:11px;color:rgba(218,165,32,.65);font-weight:600;
  padding:4px 8px;text-align:center;
}
.vehicle-table td{
  font-size:13px;padding:8px 10px;text-align:center;
  background:rgba(255,255,255,.02);color:#bbb;
}
.vehicle-table tr.optimal td{
  background:rgba(218,165,32,.08);
  border-top:1px solid rgba(218,165,32,.2);
  border-bottom:1px solid rgba(218,165,32,.2);
  color:#ffd700;font-weight:600;
}
.vehicle-table tr.optimal td:first-child{border-left:1px solid rgba(218,165,32,.2);border-radius:6px 0 0 6px;}
.vehicle-table tr.optimal td:last-child{border-right:1px solid rgba(218,165,32,.2);border-radius:0 6px 6px 0;}
.vehicle-table td:first-child{border-radius:6px 0 0 6px;}
.vehicle-table td:last-child{border-radius:0 6px 6px 0;}
.vehicle-table .v-name{display:flex;align-items:center;gap:6px;text-align:left;}
.vehicle-table .v-icon{width:28px;height:28px;border-radius:4px;object-fit:contain;}
.optimal-badge{
  display:inline-block;padding:1px 6px;border-radius:4px;
  font-size:9px;background:rgba(218,165,32,.18);
  color:#ffd700;margin-left:4px;letter-spacing:.5px;
}
.area-section{position:relative;}
.area-img{
  width:100%;border-radius:8px;
  border:1px solid rgba(218,165,32,.15);
  display:block;
}
.area-label{
  position:absolute;bottom:10px;left:10px;
  padding:4px 12px;border-radius:6px;
  background:rgba(0,0,0,.65);
  backdrop-filter:blur(4px);
  font-size:13px;color:#fff;font-weight:600;
  border:1px solid rgba(255,255,255,.15);
}
.no-info{
  text-align:center;padding:20px;
  color:rgba(255,255,255,.3);font-size:14px;
}
.footer{
  text-align:center;padding:8px;
  font-size:10px;color:rgba(255,255,255,.15);margin-top:4px;
}
/* 下次走私（预测）卡片样式：比"本次走私"更轻一些 */
.pred-time{
  display:inline-block;
  font-size:13px;color:#daa520;font-weight:600;
  padding:4px 10px;border-radius:6px;
  background:rgba(218,165,32,.08);
  border:1px solid rgba(218,165,32,.25);
  margin-bottom:10px;
}
.pred-row{display:flex;gap:12px;align-items:flex-start;}
.pred-product-img{
  width:60px;height:60px;border-radius:6px;object-fit:contain;
  background:rgba(218,165,32,.06);
  border:1px solid rgba(218,165,32,.18);
  padding:4px;
}
.pred-info{flex:1;display:flex;flex-direction:column;gap:4px;}
.pred-name-cn{font-size:16px;font-weight:700;color:#ffd700;}
.pred-name-kr{font-size:14px;font-weight:600;color:#bbb;font-style:italic;}
.pred-meta{font-size:12px;color:rgba(255,255,255,.55);}
.pred-meta span{color:#64B5F6;font-weight:600;}
.pred-level{
  display:inline-block;padding:1px 8px;border-radius:10px;
  font-size:11px;font-weight:700;letter-spacing:1px;
  border:1px solid;
  align-self:flex-start;
}
.pred-area-section{position:relative;margin-top:10px;}
.pred-area-img{
  width:100%;border-radius:6px;
  border:1px solid rgba(218,165,32,.15);
  display:block;
}
.pred-area-label{
  position:absolute;bottom:8px;left:8px;
  padding:3px 10px;border-radius:5px;
  background:rgba(0,0,0,.65);
  backdrop-filter:blur(4px);
  font-size:12px;color:#fff;font-weight:600;
  border:1px solid rgba(255,255,255,.15);
}
.pred-pos-text{
  margin-top:8px;font-size:13px;color:rgba(255,255,255,.7);
}
.pred-hint{font-size:11px;color:rgba(255,255,255,.35);margin-top:8px;}
</style>
</head>
<body>
  <div class="status-bar">
    <span class="status-icon">${ctx.statusIcon}</span>
    <span class="status-label">${ctx.statusLabel}</span>
    <span class="status-time">${ctx.timeStr}</span>
  </div>

  ${ctx.staleBanner ? `
  <div class="stale-banner">
    <span class="stale-icon">⚠️</span>
    <span>${ctx.staleBanner}</span>
  </div>` : ''}

  ${ctx.product ? `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 贸易物品</span></div>
    <div class="card-body">
      <div class="product-row">
        ${ctx.productImg ? `<div class="product-img"><img src="${ctx.productImg}" /></div>` : ''}
        <div class="product-detail">
          <div class="product-name">${ctx.itemName}</div>
          <div class="product-origin">产地：<span>${ctx.product.area}</span></div>
          <span class="product-level" style="background:${ctx.levelColor}18;border:1px solid ${ctx.levelColor}44;color:${ctx.levelColor};">
            ${ctx.levelStars} ${ctx.product.level}级货物
          </span>
          <div class="info-grid">
            <div class="info-tag">单价 <b>${ctx.product.price.toLocaleString()} G</b></div>
            <div class="info-tag">重量 <b>${ctx.product.weight}</b></div>
            <div class="info-tag">每槽 <b>${ctx.product.boxCount} 个</b></div>
          </div>
        </div>
      </div>
    </div>
  </div>` : `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 贸易物品</span></div>
    <div class="card-body"><div class="no-info">${ctx.itemName || '暂无物品信息'}</div></div>
  </div>`}

  ${ctx.vehicleRows.length > 0 ? `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 载具推荐</span></div>
    <div class="card-body">
      <table class="vehicle-table">
        <thead>
          <tr><th>载具</th><th>槽位</th><th>可用槽</th><th>装载数</th><th>总花费</th></tr>
        </thead>
        <tbody>
          ${ctx.vehicleRows.map((v, i) => `
          <tr class="${i === 0 ? 'optimal' : ''}">
            <td>
              <div class="v-name">
                ${v.img ? `<img class="v-icon" src="${v.img}" />` : ''}
                <span>${v.name}${i === 0 ? '<span class="optimal-badge">最优</span>' : ''}</span>
              </div>
            </td>
            <td>${v.block}</td>
            <td>${v.actualSlots}</td>
            <td>${v.totalItems}</td>
            <td>${v.totalCost.toLocaleString()} G</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  ${ctx.areaImg ? `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 走私商人位置</span></div>
    <div class="card-body" style="padding:10px;">
      <div class="area-section">
        <img class="area-img" src="${ctx.areaImg}" />
        <div class="area-label">📍 ${ctx.area}</div>
      </div>
    </div>
  </div>` : ctx.area !== '未知地区' ? `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 走私商人位置</span></div>
    <div class="card-body"><div class="no-info">📍 ${ctx.area}（暂无地图）</div></div>
  </div>` : ''}

  ${ctx.prediction ? `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 下次走私（预测）</span></div>
    <div class="card-body">
      <div class="pred-time">⏱ 约 ${ctx.prediction.timeStr}</div>

      ${ctx.prediction.product ? `
      <div class="pred-row">
        ${ctx.prediction.productImg ? `<img class="pred-product-img" src="${ctx.prediction.productImg}" />` : ''}
        <div class="pred-info">
          <div class="pred-name-cn">${ctx.prediction.goodsCN}</div>
          <div class="pred-meta">产地：<span>${ctx.prediction.product.area}</span></div>
          <span class="pred-level" style="background:${ctx.prediction.levelColor}18;border-color:${ctx.prediction.levelColor}44;color:${ctx.prediction.levelColor};">
            ${ctx.prediction.levelStars} ${ctx.prediction.product.level}级货物
          </span>
        </div>
      </div>` : ctx.prediction.goodsCN ? `
      <div class="pred-row">
        <div class="pred-info">
          <div class="pred-name-cn">${ctx.prediction.goodsCN}</div>
        </div>
      </div>` : `
      <div class="pred-row">
        <div class="pred-info">
          <div class="pred-name-kr">${ctx.prediction.goodsKR || '未知物品'}</div>
        </div>
      </div>`}

      ${ctx.prediction.areaImg ? `
      <div class="pred-area-section">
        <img class="pred-area-img" src="${ctx.prediction.areaImg}" />
        <div class="pred-area-label">📍 ${ctx.prediction.positionCN}</div>
      </div>` : ctx.prediction.positionCN ? `
      <div class="pred-pos-text">📍 ${ctx.prediction.positionCN}</div>` : `
      <div class="pred-pos-text">📍 ${ctx.prediction.positionKR || '未知位置'}</div>`}

      <div class="pred-hint">数据来源：韩服走私观测；时间为大致预测，可能有数十秒至数分钟误差</div>
    </div>
  </div>` : ''}

  <div class="footer">走私查询 · Powered by Baibaibot</div>
</body>
</html>`

const renderSmugglerImage = async (callback, prediction = null) => {
  try {
    const client = await getClient()
    const col = client.db('db_bot').collection('cl_mabinogi_smuggler')
    const now = Date.now()

    // 拉最近 60 分钟（>1 个 cycle）内所有走私事件，按 ts 升序
    // 这些事件互为冗余 anchor 推算，能抵抗少量抓包丢失/重复
    const recentDocs = await col
      .find({
        ts: { $gte: now - 60 * 60 * 1000 },
        type: { $in: ['forecast', 'appear', 'disappear_forecast'] },
        area: { $ne: null }
      })
      .sort({ ts: 1 })
      .toArray()

    let stateInfo = computeSmugglerStatus(recentDocs, now)

    let timeStr = ''
    let area = '未知地区'
    let itemName = null
    let statusInfo = DEFAULT_STATUS
    let staleBanner = ''

    if (stateInfo && !stateInfo.stale) {
      // 正常路径：根据 anchor 推出当前相位状态
      statusInfo = STATUS_MAP[stateInfo.status] || DEFAULT_STATUS
      timeStr = stateInfo.etaText
      area = stateInfo.area || '未知地区'
      itemName = stateInfo.item || null
    } else {
      // 降级：60 分钟内无事件，或 anchor 已超过 1 个完整 cycle
      const latestEver =
        await col.find({ area: { $ne: null }, item: { $ne: null } }).sort({ ts: -1 }).limit(1).next() ||
        await col.find({}).sort({ ts: -1 }).limit(1).next()

      if (!latestEver) {
        callback('当前没有检测到任何走私贩子相关消息')
        return
      }

      statusInfo = STATUS_MAP.absent
      area = latestEver.area || '未知地区'
      itemName = latestEver.item || null
      timeStr = `上次更新 ${formatTime(latestEver.ts || latestEver.time || now)}`

      const ageMs = now - (latestEver.ts || 0)
      if (ageMs >= STALE_DOC_THRESHOLD_MS) {
        const ageMin = Math.round(ageMs / 60000)
        const ageStr = ageMin >= 60 ? `${Math.floor(ageMin / 60)}小时${ageMin % 60}分钟` : `${ageMin}分钟`
        staleBanner = `数据已 ${ageStr} 未更新，国服可能正在维护或消息源失联，下方信息仅供参考`
      }
    }

    const product = itemName ? findProduct(itemName) : null

    const sortedVehicles = calcVehicles(product)
    const vehicleRows = sortedVehicles.map(v => {
      const vImg = imgToBase64(path.join(__dirname, 'assets', 'vehicle', `${v.name}.png`))
      return { ...v, img: vImg }
    })

    const productImg = product
      ? imgToBase64(path.join(__dirname, 'assets', 'product', product.img))
      : ''

    const areaImg = area !== '未知地区'
      ? imgToBase64(path.join(__dirname, 'assets', 'area', `${area}.png`))
      : ''

    const levelColor = product ? (LEVEL_COLORS[product.level] || '#999') : '#999'
    const levelStars = product ? (LEVEL_STARS[product.level] || '') : ''

    const html = buildHtml({
      font: FONT_DATA,
      statusIcon: statusInfo.icon,
      statusLabel: statusInfo.label,
      statusColor: statusInfo.color,
      timeStr,
      area,
      itemName: itemName || '未知物品',
      product,
      productImg,
      areaImg,
      vehicleRows,
      levelColor,
      levelStars,
      prediction,
      staleBanner
    })

    const outDir = path.join(IMAGE_DATA, 'mabi_other')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const output = path.join(IMAGE_DATA, 'mabi_other', 'smuggler.png')
    await nodeHtmlToImage({ output, html })
    console.log('走私查询图片生成成功')

    const imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', 'smuggler.png')}]`
    callback(imgMsg)
  } catch (err) {
    console.error('mabiSmuggler query error', err)
    callback('走私查询失败，请稍后再试')
  }
}

const mabiSmuggler = async callback => {
  await renderSmugglerImage(callback)
}

const mabiSuperSmuggler = async callback => {
  let prediction = null
  try {
    const next = await getNextSmugKrPrediction()
    if (next?.doc) prediction = buildPredictionCtx(next.doc)
  } catch (err) {
    console.error('mabiSuperSmuggler prediction error', err)
  }

  try {
    await renderSmugglerImage(callback, prediction)
  } catch (err) {
    console.error('mabiSuperSmuggler render error', err)
    callback(`超级走私查询失败：${err?.message || '未知错误'}`)
  }
}

module.exports = {
  mabiSmuggler,
  mabiSuperSmuggler
}
