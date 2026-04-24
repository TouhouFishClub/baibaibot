const path = require('path')
const fs = require('fs')
const https = require('https')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const { getClient } = require('../../../mongo')
const { IMAGE_DATA } = require('../../../baibaiConfigs')

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
  appear: { label: '正在出售', color: '#66BB6A', icon: '✅' },
  disappear_forecast: { label: '即将消失', color: '#EF5350', icon: '⚠️' }
}
const DEFAULT_STATUS = { label: '走私消息', color: '#78909C', icon: '📢' }

const LUTE_COMMERCE_URL = 'https://lute.fantazm.net/commerce'
const LUTE_SMUG2_URL = 'https://lute.fantazm.net/ajax/smug2'
const LUTE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const requestText = (url, options = {}, postBody = null) => new Promise((resolve, reject) => {
  const req = https.request(url, options, res => {
    let data = ''
    res.setEncoding('utf8')
    res.on('data', chunk => { data += chunk })
    res.on('end', () => {
      resolve({
        statusCode: res.statusCode || 0,
        headers: res.headers || {},
        body: data
      })
    })
  })

  req.on('error', reject)
  req.setTimeout(15000, () => req.destroy(new Error('request timeout')))
  if (postBody) req.write(postBody)
  req.end()
})

const extractLuteBootstrap = html => {
  const csrf = html.match(/id="csrf_token"[^>]*value="([^"]+)"/i)?.[1] || ''
  const siteKey = html.match(/__recaptchaSiteKey\s*=\s*"([^"]+)"/i)?.[1] || ''
  return { csrf, siteKey }
}

const getLuteBootstrap = async () => {
  const res = await requestText(LUTE_COMMERCE_URL, {
    method: 'GET',
    headers: {
      'User-Agent': LUTE_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (res.statusCode !== 200) {
    throw new Error(`lute commerce 请求失败: ${res.statusCode}`)
  }

  const { csrf, siteKey } = extractLuteBootstrap(res.body)
  const setCookie = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : []
  const cookie = setCookie.map(v => v.split(';')[0]).join('; ')

  return { csrf, siteKey, cookie, html: res.body }
}

const buildSmug2Body = ({ csrfToken, recaptchaToken, tzOffset }) => {
  const payload = new URLSearchParams()
  payload.set('date', String(tzOffset))
  payload.set('csrf_token', csrfToken || '')
  payload.set('tk', recaptchaToken || '')
  return payload.toString()
}

const fetchLuteSmug2 = async ({ csrfToken, recaptchaToken, cookie = '', tzOffset = new Date().getTimezoneOffset() }) => {
  const postBody = buildSmug2Body({ csrfToken, recaptchaToken, tzOffset })
  const res = await requestText(LUTE_SMUG2_URL, {
    method: 'POST',
    headers: {
      'User-Agent': LUTE_UA,
      'Referer': LUTE_COMMERCE_URL,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': Buffer.byteLength(postBody),
      ...(cookie ? { Cookie: cookie } : {})
    }
  }, postBody)

  const text = (res.body || '').trim()
  let parsed = null
  if (text) {
    try { parsed = JSON.parse(text) } catch { parsed = null }
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    raw: res.body,
    data: Array.isArray(parsed) ? parsed : null
  }
}

const fetchLuteSmug2WithBrowser = async () => {
  let puppeteer = null
  let browser = null
  const result = {
    source: 'puppeteer',
    requestBody: '',
    statusCode: 0,
    headers: {},
    raw: '',
    data: null
  }

  try {
    try {
      puppeteer = require('puppeteer')
    } catch {
      throw new Error('未安装 puppeteer，无法进行浏览器抓包')
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      timeout: 60000
    })

    const page = await browser.newPage()
    await page.setUserAgent(LUTE_UA)

    let captured = false
    page.on('request', req => {
      if (req.url().includes('/ajax/smug2')) {
        result.requestBody = req.postData() || ''
      }
    })

    page.on('response', async res => {
      if (!res.url().includes('/ajax/smug2') || captured) return
      captured = true
      result.statusCode = res.status()
      result.headers = res.headers() || {}
      try {
        result.raw = await res.text()
      } catch {
        result.raw = ''
      }
    })

    await page.goto(LUTE_COMMERCE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)

    // 主动触发一次页面方法，避免某些情况下 ready 回调没有抓到
    await page.evaluate(() => {
      if (typeof update_call === 'function') update_call()
    })
    await page.waitForTimeout(5000)

    const text = (result.raw || '').trim()
    if (text) {
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) result.data = parsed
      } catch {
        result.data = null
      }
    }
    return result
  } finally {
    if (browser) await browser.close()
  }
}

const escapeHtml = text => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const buildCaptureText = capture => {
  if (!capture) return ''
  const lines = []
  lines.push(`capture.source: ${capture.source || 'direct'}`)
  if (capture.bootstrap?.csrf !== undefined) lines.push(`bootstrap.csrf: ${capture.bootstrap?.csrf || '<empty>'}`)
  if (capture.bootstrap?.siteKey !== undefined) lines.push(`bootstrap.siteKey: ${capture.bootstrap?.siteKey || '<empty>'}`)
  if (capture.tzOffset !== undefined) lines.push(`request.date(tzOffset): ${capture.tzOffset}`)
  if (capture.requestBody !== undefined) lines.push(`request.body: ${capture.requestBody || '<empty>'}`)
  lines.push(`response.status: ${capture.response?.statusCode}`)
  lines.push(`response.content-type: ${capture.response?.headers?.['content-type'] || '<empty>'}`)

  if (Array.isArray(capture.response?.data)) {
    lines.push(`response.json.length: ${capture.response.data.length}`)
    lines.push(JSON.stringify(capture.response.data, null, 2))
  } else {
    lines.push(`response.raw.length: ${(capture.response?.raw || '').length}`)
    lines.push(capture.response?.raw ? capture.response.raw : '<empty body>')
  }
  return lines.join('\n')
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
.capture-data{
  white-space:pre-wrap;
  word-break:break-all;
  font-family:Consolas,Monaco,'Courier New',monospace;
  font-size:11px;
  line-height:1.45;
  color:rgba(255,255,255,.82);
  background:rgba(0,0,0,.28);
  border:1px solid rgba(255,255,255,.12);
  border-radius:8px;
  padding:10px;
}
</style>
</head>
<body>
  <div class="status-bar">
    <span class="status-icon">${ctx.statusIcon}</span>
    <span class="status-label">${ctx.statusLabel}</span>
    <span class="status-time">${ctx.timeStr}</span>
  </div>

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

  ${ctx.captureText ? `
  <div class="card">
    <div class="card-header"><span class="card-title">▸ 抓包返回数据</span></div>
    <div class="card-body">
      <div class="capture-data">${escapeHtml(ctx.captureText)}</div>
    </div>
  </div>` : ''}

  <div class="footer">走私查询 · Powered by Baibaibot</div>
</body>
</html>`

const renderSmugglerImage = async (callback, captureText = '') => {
  try {
    const client = await getClient()
    const col = client.db('db_bot').collection('cl_mabinogi_smuggler')

    const fullDoc = await col
      .find({ area: { $ne: null }, item: { $ne: null } })
      .sort({ ts: -1 })
      .limit(1)
      .next()

    let doc = fullDoc
    if (!doc) {
      doc = await col.find({}).sort({ ts: -1 }).limit(1).next()
    }

    if (!doc) {
      callback('当前没有检测到任何走私贩子相关消息')
      return
    }

    const timeStr = doc.time ? formatTime(doc.time) : formatTime(doc.ts || Date.now())
    const area = doc.area || '未知地区'
    const itemName = doc.item || null
    const statusInfo = STATUS_MAP[doc.type] || DEFAULT_STATUS

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
      captureText
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
  try {
    let bootstrap = null
    try {
      bootstrap = await getLuteBootstrap()
    } catch {
      bootstrap = null
    }

    let response = null
    try {
      response = await fetchLuteSmug2WithBrowser()
    } catch (e) {
      response = {
        source: 'puppeteer-error',
        requestBody: '',
        statusCode: 0,
        headers: {},
        raw: e?.message || 'puppeteer capture failed',
        data: null
      }
    }

    if (!Array.isArray(response.data) || response.data.length === 0) {
      const tzOffset = new Date().getTimezoneOffset()
      if (bootstrap) {
        const fallback = await fetchLuteSmug2({
          csrfToken: bootstrap.csrf,
          recaptchaToken: '',
          cookie: bootstrap.cookie,
          tzOffset
        })
        response = {
          ...fallback,
          source: response.source === 'puppeteer-error' ? 'direct-fallback-after-puppeteer-error' : 'direct-fallback',
          requestBody: buildSmug2Body({ csrfToken: bootstrap.csrf, recaptchaToken: '', tzOffset })
        }
      }
    }

    const captureText = buildCaptureText({
      source: response.source || 'puppeteer',
      bootstrap,
      requestBody: response.requestBody,
      response
    })
    await renderSmugglerImage(callback, captureText)
  } catch (err) {
    console.error('mabiSuperSmuggler query error', err)
    callback(`超级走私查询失败：${err.message || '未知错误'}`)
  }
}

module.exports = {
  mabiSmuggler,
  mabiSuperSmuggler,
  getLuteBootstrap,
  fetchLuteSmug2
}
