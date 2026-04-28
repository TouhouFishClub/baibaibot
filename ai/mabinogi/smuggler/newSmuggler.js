const path = require('path')
const fs = require('fs')
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
const LUTE_SMUG2_URL_PART = '/ajax/smug2'
const LUTE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// 代理链：环境变量 LUTE_PPTR_PROXY 显式覆盖（含空字符串=直连）；
// 否则按 socks5 -> http -> 直连依次重试
const LUTE_PPTR_PROXY_CHAIN = (() => {
  if (process.env.LUTE_PPTR_PROXY !== undefined) {
    return [process.env.LUTE_PPTR_PROXY]
  }
  return [
    process.env.LUTE_SOCKS_PROXY || 'socks5://192.168.17.236:2345',
    process.env.LUTE_HTTP_PROXY || 'http://192.168.17.236:2346',
    ''
  ]
})()

// 用浏览器跑一次商业页，被动抓 /ajax/smug2 的响应；同时兜底读取 #smug_content tbody
// 关键点：
//   - 不去手动跑 grecaptcha / 注入 commerce.js，让页面自己执行 update_call()
//   - 在 goto 之前就挂 page.waitForResponse，避免错过早响应
//   - 不拦截 font / recaptcha / jquery，否则 reCAPTCHA 评分会走低或脚本断链
const captureSmug2OnceWithProxy = async (proxyServer = '') => {
  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch {
    throw new Error('未安装 puppeteer 模块')
  }

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--no-first-run',
    '--no-zygote',
    '--ignore-certificate-errors',
    '--lang=ko-KR'
  ]
  if (proxyServer) launchArgs.push(`--proxy-server=${proxyServer}`)

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: launchArgs,
    timeout: 60000
  })

  const tStart = Date.now()
  const debug = {
    proxy: proxyServer || 'DIRECT',
    timeline: [],
    smug2Captured: false,
    pageState: null,
    domRows: []
  }
  const log = msg => debug.timeline.push(`+${Date.now() - tStart}ms ${msg}`)

  try {
    const page = await browser.newPage()
    await page.setUserAgent(LUTE_UA)
    await page.setViewport({ width: 1280, height: 900 })
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(60000)

    // 反自动化检测
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      window.chrome = window.chrome || { runtime: {} }
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] })
    })

    // 拦截广告/统计资源；图片也拦掉以减少超时风险
    // 但不拦 font/recaptcha/jquery/socket.io——这些影响主流程
    await page.setRequestInterception(true)
    page.on('request', req => {
      const u = req.url()
      const t = req.resourceType()
      const block = (
        t === 'image' ||
        t === 'media' ||
        u.includes('googlesyndication') ||
        u.includes('doubleclick') ||
        u.includes('googletagmanager') ||
        u.includes('google-analytics') ||
        u.includes('fundingchoicesmessages') ||
        u.includes('adtrafficquality') ||
        u.includes('pagead2.googlesyndication') ||
        u.includes('adsbygoogle')
      )
      if (block) {
        req.abort().catch(() => {})
        return
      }
      req.continue().catch(() => {})
    })

    // 在跳转之前就挂上 smug2 的捕获器
    let smug2Result = null
    page.on('response', async res => {
      const url = res.url()
      if (!url.includes(LUTE_SMUG2_URL_PART)) return
      try {
        const body = await res.text()
        if (!smug2Result && body) {
          smug2Result = {
            status: res.status(),
            url,
            headers: res.headers(),
            body
          }
          debug.smug2Captured = true
          log(`smug2 captured: status=${res.status()} bodyLen=${body.length}`)
        }
      } catch (e) {
        log(`smug2 read error: ${e?.message || e}`)
      }
    })

    page.on('pageerror', err => log(`pageerror: ${err?.message || err}`))

    log(`goto ${LUTE_COMMERCE_URL}`)
    await page.goto(LUTE_COMMERCE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    log('domcontentloaded')

    // 轮询：直到 smug2 被抓到，或 #smug_content tbody 被填上行，或超时
    const startWait = Date.now()
    const maxWaitMs = 45000
    while (Date.now() - startWait < maxWaitMs) {
      if (smug2Result) break
      let rowCount = 0
      try {
        rowCount = await page.evaluate(() => {
          const tb = document.querySelector('#smug_content tbody')
          return tb ? tb.querySelectorAll('tr').length : 0
        })
      } catch {}
      if (rowCount > 0) {
        log(`dom rows populated: ${rowCount}`)
        break
      }
      await sleep(500)
    }

    // 抓 DOM 行作为兜底
    try {
      const state = await page.evaluate(() => {
        const tb = document.querySelector('#smug_content tbody')
        const rows = tb
          ? Array.from(tb.querySelectorAll('tr')).map(tr => {
              const tds = Array.from(tr.querySelectorAll('td'))
              return tds.map(td => (td.innerText || '').replace(/\s+/g, ' ').trim())
            })
          : []
        return {
          csrf: document.querySelector('#csrf_token')?.value || '',
          siteKey: window.__recaptchaSiteKey || '',
          hasGrecaptcha: typeof window.grecaptcha !== 'undefined',
          hasUpdateCall: typeof window.update_call === 'function',
          rowCount: rows.length,
          rows,
          smugStat: (document.querySelector('#smug_stat')?.innerText || '').trim(),
          smugTime: (document.querySelector('#smug_time')?.innerText || '').trim()
        }
      })
      debug.pageState = state
      debug.domRows = state.rows || []
    } catch (e) {
      log(`pageState eval error: ${e?.message || e}`)
    }

    return { smug2Result, debug }
  } finally {
    try { await browser.close() } catch {}
  }
}

const fetchLuteSmugViaBrowser = async () => {
  const errors = []
  for (const proxy of LUTE_PPTR_PROXY_CHAIN) {
    try {
      const res = await captureSmug2OnceWithProxy(proxy)
      const hasSmug2 = !!res.smug2Result?.body
      const hasDomRows = Array.isArray(res.debug.domRows) && res.debug.domRows.length > 0
      if (hasSmug2 || hasDomRows) {
        return res
      }
      errors.push({ proxy: proxy || 'DIRECT', message: 'capture empty' })
    } catch (e) {
      errors.push({ proxy: proxy || 'DIRECT', message: e?.message || String(e) })
    }
  }
  throw new Error(`所有代理都失败: ${errors.map(e => `[${e.proxy}] ${e.message}`).join(' | ')}`)
}


const escapeHtml = text => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// 从 lute 接口返回的单条对象里抽出有用字段
const formatSmugItem = (item, idx) => {
  if (!item || typeof item !== 'object') return ''
  const date = item.date || ''
  const time = item.time || ''
  const dateStr = date && time
    ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time}`
    : (time || date || '')
  const segs = [
    dateStr,
    item.position || '',
    item.goods || '',
    item.values !== undefined && item.values !== '' ? `${item.values}D` : ''
  ].filter(s => s !== '')
  return `#${idx + 1} ${segs.join(' | ')}`
}

const buildCaptureText = capture => {
  if (!capture) return ''
  const lines = []
  const { proxy, smug2Result, debug, error } = capture

  lines.push(`抓取代理: ${proxy || 'DIRECT'}`)
  if (error) {
    lines.push(`错误: ${error}`)
  }

  if (smug2Result) {
    lines.push(`/ajax/smug2 状态: ${smug2Result.status}`)
    lines.push(`返回长度: ${(smug2Result.body || '').length}`)
  } else {
    lines.push('未抓到 /ajax/smug2 响应（兜底使用 DOM 数据）')
  }

  let parsed = null
  if (smug2Result?.body) {
    try { parsed = JSON.parse(smug2Result.body) } catch { parsed = null }
  }

  if (Array.isArray(parsed) && parsed.length > 0) {
    lines.push('')
    lines.push(`=== 走私数据(接口, ${parsed.length} 条) ===`)
    parsed.forEach((it, i) => {
      const formatted = formatSmugItem(it, i)
      if (formatted) lines.push(formatted)
    })
  } else if (debug?.domRows?.length) {
    lines.push('')
    lines.push(`=== 走私数据(DOM 兜底, ${debug.domRows.length} 行) ===`)
    debug.domRows.forEach((row, i) => {
      lines.push(`#${i + 1} ${row.filter(Boolean).join(' | ')}`)
    })
  } else if (smug2Result?.body) {
    lines.push('')
    lines.push(`response.raw: ${smug2Result.body.slice(0, 800)}`)
  }

  if (debug?.pageState) {
    lines.push('')
    const ps = debug.pageState
    lines.push(`页面状态: csrf=${ps.csrf ? 'ok' : 'no'} siteKey=${ps.siteKey ? 'ok' : 'no'} grecaptcha=${ps.hasGrecaptcha} update_call=${ps.hasUpdateCall} rows=${ps.rowCount}`)
    if (ps.smugStat) lines.push(`smug_stat: ${ps.smugStat}`)
    if (ps.smugTime) lines.push(`smug_time: ${ps.smugTime}`)
  }

  if (Array.isArray(debug?.timeline) && debug.timeline.length) {
    lines.push('')
    lines.push('=== timeline ===')
    lines.push(...debug.timeline)
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
  let captureText = ''
  try {
    const { smug2Result, debug } = await fetchLuteSmugViaBrowser()
    captureText = buildCaptureText({
      proxy: debug?.proxy,
      smug2Result,
      debug
    })
  } catch (err) {
    console.error('mabiSuperSmuggler capture error', err)
    captureText = buildCaptureText({
      proxy: '',
      smug2Result: null,
      debug: { timeline: [] },
      error: err?.message || String(err)
    })
  }

  try {
    await renderSmugglerImage(callback, captureText)
  } catch (err) {
    console.error('mabiSuperSmuggler render error', err)
    callback(`超级走私查询失败：${err?.message || '未知错误'}`)
  }
}

module.exports = {
  mabiSmuggler,
  mabiSuperSmuggler
}
