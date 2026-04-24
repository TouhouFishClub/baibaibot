const path = require('path')
const fs = require('fs')
const https = require('https')
const { HttpsProxyAgent } = require('https-proxy-agent')
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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const LUTE_HTTP_PROXY = process.env.LUTE_HTTP_PROXY || 'http://192.168.17.236:2346'
const LUTE_SOCKS_PROXY = process.env.LUTE_SOCKS_PROXY || 'socks5://192.168.17.236:2345'
const LUTE_PPTR_PROXY_CHAIN = [
  process.env.LUTE_PPTR_PROXY || LUTE_SOCKS_PROXY,
  LUTE_HTTP_PROXY,
  '' // direct
]

const buildProxyAgent = () => {
  try {
    return new HttpsProxyAgent(LUTE_HTTP_PROXY)
  } catch {
    return null
  }
}

const requestText = (url, options = {}, postBody = null) => new Promise((resolve, reject) => {
  const agent = buildProxyAgent()
  const req = https.request(url, {
    ...options,
    ...(agent ? { agent } : {})
  }, res => {
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

const fetchLuteSmug2WithBrowser = async (attemptIndex = 0) => {
  let puppeteer = null
  let browser = null
  const activeProxy = LUTE_PPTR_PROXY_CHAIN[Math.max(0, Math.min(attemptIndex, LUTE_PPTR_PROXY_CHAIN.length - 1))]
  const result = {
    source: 'puppeteer',
    requestBody: '',
    statusCode: 0,
    headers: {},
    raw: '',
    data: null,
    debug: {
      proxy: {
        http: LUTE_HTTP_PROXY,
        socks: LUTE_SOCKS_PROXY,
        selected: activeProxy || 'DIRECT',
        attemptIndex
      },
      timeline: [],
      smug2Requests: [],
      smug2Responses: [],
      recaptchaRequests: [],
      pageErrors: [],
      consoleErrors: [],
      pageState: null,
      cookies: []
    }
  }

  try {
    try {
      puppeteer = require('puppeteer')
    } catch {
      throw new Error('未安装 puppeteer，无法进行浏览器抓包')
    }

    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        ...(activeProxy ? [`--proxy-server=${activeProxy}`] : []),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--ignore-certificate-errors',
        '--allow-running-insecure-content',
        '--disable-features=site-per-process'
      ],
      timeout: 60000
    })
    result.debug.proxy.selected = activeProxy || 'DIRECT'

    const page = await browser.newPage()
    await page.setUserAgent(LUTE_UA)
    page.setDefaultNavigationTimeout(120000)
    page.setDefaultTimeout(120000)
    result.debug.timeline.push(`[${Date.now()}] browser+page ready`)

    await page.setRequestInterception(true)
    page.on('request', req => {
      const url = req.url()
      const type = req.resourceType()
      // 屏蔽广告/统计等第三方资源，降低超时概率
      if (
        url.includes('googlesyndication') ||
        url.includes('doubleclick') ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('fundingchoicesmessages') ||
        url.includes('adtrafficquality') ||
        url.includes('facebook') ||
        url.includes('twitter') ||
        type === 'media' ||
        type === 'font'
      ) {
        req.abort()
        return
      }
      req.continue()
    })

    page.on('pageerror', err => {
      result.debug.pageErrors.push(err?.message || String(err))
    })
    page.on('console', msg => {
      if (msg.type() === 'error') {
        result.debug.consoleErrors.push(msg.text())
      }
    })

    let captured = false
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/ajax/smug2')) {
        const postData = req.postData() || ''
        result.requestBody = postData
        result.debug.smug2Requests.push({
          method: req.method(),
          url,
          postData,
          headers: req.headers()
        })
      }
      if (url.includes('recaptcha') || url.includes('google.com/recaptcha') || url.includes('gstatic.com/recaptcha')) {
        result.debug.recaptchaRequests.push({
          method: req.method(),
          url
        })
      }
    })

    page.on('response', async res => {
      const url = res.url()
      if (url.includes('/ajax/smug2')) {
        let body = ''
        try { body = await res.text() } catch { body = '' }

        const record = {
          status: res.status(),
          url,
          headers: res.headers() || {},
          bodyLen: body.length,
          bodyPreview: body.slice(0, 400)
        }
        result.debug.smug2Responses.push(record)

        if (!captured) {
          captured = true
          result.statusCode = res.status()
          result.headers = res.headers() || {}
          result.raw = body
        }
      }
    })

    let gotoOk = false
    let lastGotoErr = null
    for (let i = 1; i <= 2; i++) {
      try {
        await page.goto(LUTE_COMMERCE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
        gotoOk = true
        result.debug.timeline.push(`[${Date.now()}] goto commerce done (attempt ${i})`)
        break
      } catch (e) {
        lastGotoErr = e
        result.debug.timeline.push(`[${Date.now()}] goto commerce failed (attempt ${i}): ${e?.message || e}`)
        await sleep(2000)
      }
    }
    if (!gotoOk) {
      const currentUrl = page.url()
      let readyState = 'unknown'
      let title = ''
      try {
        const state = await page.evaluate(() => ({
          readyState: document.readyState,
          title: document.title
        }))
        readyState = state.readyState
        title = state.title
      } catch {}
      throw new Error(`navigation failed: ${lastGotoErr?.message || 'unknown'} | url=${currentUrl} | readyState=${readyState} | title=${title}`)
    }
    await sleep(3000)
    result.debug.timeline.push(`[${Date.now()}] wait 3s done`)

    result.debug.pageState = await page.evaluate(() => {
      const csrf = document.querySelector('#csrf_token')?.value || ''
      const hasGrecaptcha = typeof grecaptcha !== 'undefined'
      const siteKey = window.__recaptchaSiteKey || ''
      const hasUpdateCall = typeof update_call === 'function'
      const tableRows = document.querySelectorAll('#smug_content tbody tr').length
      return { csrf, hasGrecaptcha, siteKey, hasUpdateCall, tableRows }
    })
    result.debug.timeline.push(`[${Date.now()}] pageState collected`)

    // 主动触发一次页面方法，避免某些情况下 ready 回调没有抓到
    await page.evaluate(() => {
      if (typeof update_call === 'function') update_call()
    })
    result.debug.timeline.push(`[${Date.now()}] update_call() triggered #1`)
    await sleep(3000)
    await page.evaluate(() => {
      if (typeof update_call === 'function') update_call()
    })
    result.debug.timeline.push(`[${Date.now()}] update_call() triggered #2`)
    await sleep(5000)
    result.debug.timeline.push(`[${Date.now()}] wait after update_call done`)

    try {
      const cookies = await page.cookies()
      result.debug.cookies = cookies.map(c => `${c.name}=${c.value}`)
    } catch {
      result.debug.cookies = []
    }

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
  } catch (err) {
    const errMsg = err?.message || String(err)
    const shouldRetry = attemptIndex < (LUTE_PPTR_PROXY_CHAIN.length - 1) && (
      errMsg.includes('ERR_PROXY_CONNECTION_FAILED') ||
      errMsg.includes('navigation failed') ||
      errMsg.includes('Navigation timeout')
    )
    if (shouldRetry) {
      const next = await fetchLuteSmug2WithBrowser(attemptIndex + 1)
      next.debug = next.debug || {}
      next.debug.timeline = [
        `[${Date.now()}] retry from ${activeProxy || 'DIRECT'} because: ${errMsg}`,
        ...(next.debug.timeline || [])
      ]
      return next
    }
    throw err
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
  const debug = capture.response?.debug || null
  if (debug) {
    if (debug.proxy) {
      lines.push(`debug.proxy.http: ${debug.proxy.http || '<empty>'}`)
      lines.push(`debug.proxy.socks: ${debug.proxy.socks || '<empty>'}`)
      lines.push(`debug.proxy.selected: ${debug.proxy.selected || '<empty>'}`)
    }
    lines.push(`debug.smug2.requests: ${debug.smug2Requests?.length || 0}`)
    lines.push(`debug.smug2.responses: ${debug.smug2Responses?.length || 0}`)
    lines.push(`debug.recaptcha.requests: ${debug.recaptchaRequests?.length || 0}`)
    lines.push(`debug.pageErrors: ${(debug.pageErrors || []).length}`)
    lines.push(`debug.consoleErrors: ${(debug.consoleErrors || []).length}`)
    if (debug.pageState) lines.push(`debug.pageState: ${JSON.stringify(debug.pageState)}`)
    if (Array.isArray(debug.cookies) && debug.cookies.length) lines.push(`debug.cookies: ${debug.cookies.join('; ')}`)
    if (Array.isArray(debug.timeline) && debug.timeline.length) {
      lines.push('debug.timeline:')
      lines.push(debug.timeline.join('\n'))
    }
    if (Array.isArray(debug.smug2Requests) && debug.smug2Requests.length) {
      lines.push(`debug.lastSmug2Request: ${JSON.stringify(debug.smug2Requests[debug.smug2Requests.length - 1])}`)
    }
    if (Array.isArray(debug.smug2Responses) && debug.smug2Responses.length) {
      lines.push(`debug.lastSmug2Response: ${JSON.stringify(debug.smug2Responses[debug.smug2Responses.length - 1])}`)
    }
  }
  if (capture.preDebug) {
    lines.push('preDebug.present: true')
    lines.push(`preDebug.source: ${capture.preDebug.source || '<unknown>'}`)
    lines.push(`preDebug.error: ${capture.preDebug.error || '<none>'}`)
    lines.push(`preDebug.smug2.requests: ${capture.preDebug.smug2RequestCount ?? 0}`)
    lines.push(`preDebug.smug2.responses: ${capture.preDebug.smug2ResponseCount ?? 0}`)
    lines.push(`preDebug.recaptcha.requests: ${capture.preDebug.recaptchaRequestCount ?? 0}`)
    if (capture.preDebug.pageState) lines.push(`preDebug.pageState: ${JSON.stringify(capture.preDebug.pageState)}`)
    if (capture.preDebug.lastSmug2Request) lines.push(`preDebug.lastSmug2Request: ${JSON.stringify(capture.preDebug.lastSmug2Request)}`)
    if (capture.preDebug.lastSmug2Response) lines.push(`preDebug.lastSmug2Response: ${JSON.stringify(capture.preDebug.lastSmug2Response)}`)
    if (Array.isArray(capture.preDebug.timeline) && capture.preDebug.timeline.length) {
      lines.push('preDebug.timeline:')
      lines.push(capture.preDebug.timeline.join('\n'))
    }
  } else {
    lines.push('preDebug.present: false')
  }

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
    let preDebug = null
    try {
      response = await fetchLuteSmug2WithBrowser()
      preDebug = {
        source: response.source,
        error: '',
        smug2RequestCount: response.debug?.smug2Requests?.length || 0,
        smug2ResponseCount: response.debug?.smug2Responses?.length || 0,
        recaptchaRequestCount: response.debug?.recaptchaRequests?.length || 0,
        pageState: response.debug?.pageState || null,
        lastSmug2Request: response.debug?.smug2Requests?.slice(-1)?.[0] || null,
        lastSmug2Response: response.debug?.smug2Responses?.slice(-1)?.[0] || null,
        timeline: response.debug?.timeline || []
      }
    } catch (e) {
      response = {
        source: 'puppeteer-error',
        requestBody: '',
        statusCode: 0,
        headers: {},
        raw: e?.message || 'puppeteer capture failed',
        data: null
      }
      preDebug = {
        source: 'puppeteer-error',
        error: e?.message || 'puppeteer capture failed',
        smug2RequestCount: 0,
        smug2ResponseCount: 0,
        recaptchaRequestCount: 0,
        pageState: null,
        lastSmug2Request: null,
        lastSmug2Response: null,
        timeline: []
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
      response,
      preDebug
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
