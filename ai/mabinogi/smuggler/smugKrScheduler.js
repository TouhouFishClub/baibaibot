// =============================================================================
// 韩服走私（lute.fantazm.net）抓取 + 36 分钟定时入库
//   - DB:        db_bot.cl_mabinogi_smuggler_kr
//   - 主键 _id:  ${date}_${time}_${position}_${goods}（天然去重）
//   - 时间字段: krTime —— API 返回的本地时间(CN, UTC+8) +1 小时即韩国本地时间
//   - 中文字段: goodsCN / positionCN —— 通过 assets/translation.json 翻译得到
//     translation.json 不入库不入 git，由 buildTranslation.js 维护
//
// 该模块在被 require 时会自动启动 36 分钟定时任务。
// 如需关闭：设置环境变量 LUTE_SMUG_AUTO_START=0
// =============================================================================

const fs = require('fs')
const path = require('path')
const { getClient } = require('../../../mongo')

// === 韩中翻译表（本地维护，文件可能不存在）===
const TRANSLATION_PATH = path.join(__dirname, 'assets', 'translation.json')

let translation = { goods: {}, position: {} }

const reloadTranslation = () => {
  try {
    const raw = fs.readFileSync(TRANSLATION_PATH, 'utf8')
    // 容忍尾部逗号等手动维护痕迹
    const cleaned = raw.replace(/,(\s*[}\]])/g, '$1')
    const parsed = JSON.parse(cleaned)
    translation = {
      goods: (parsed && parsed.goods) || {},
      position: (parsed && parsed.position) || {}
    }
    const goodsCount = Object.keys(translation.goods).filter(k => k && translation.goods[k]).length
    const posCount = Object.keys(translation.position).filter(k => k && translation.position[k]).length
    console.log(`[smugglerKr] translation 加载完成: goods=${goodsCount} position=${posCount}`)
  } catch (e) {
    if (e && e.code !== 'ENOENT') {
      console.warn(`[smugglerKr] translation.json 解析失败: ${e?.message || e}`)
    }
    translation = { goods: {}, position: {} }
  }
}
reloadTranslation()

const getTranslation = () => translation

const lookupCN = (table, key) => {
  if (!key) return null
  const v = table[key]
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

// === 抓取配置 ===
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
//   - 在 goto 之前就挂 page.on('response')，避免错过早响应
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

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      window.chrome = window.chrome || { runtime: {} }
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] })
    })

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

// === 入库 ===
const SMUG_KR_FETCH_INTERVAL_MS = 36 * 60 * 1000
const SMUG_KR_OFFSET_HOURS = 1
const SMUG_KR_DB_NAME = 'db_bot'
const SMUG_KR_COLLECTION = 'cl_mabinogi_smuggler_kr'

let _smugKrSchedulerStarted = false
let _smugKrFetching = false

const buildSmugKrDoc = item => {
  if (!item || typeof item !== 'object') return null
  const date = String(item.date || '').trim()
  const time = String(item.time || '').trim()
  if (!/^\d{8}$/.test(date)) return null
  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(time)) return null

  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(4, 6)) - 1
  const d = Number(date.slice(6, 8))
  const [hh, mm, ss] = time.split(':').map(Number)

  const baseLocal = new Date(y, m, d, hh, mm, ss, 0)
  if (isNaN(baseLocal.getTime())) return null
  const krTime = new Date(baseLocal.getTime() + SMUG_KR_OFFSET_HOURS * 3600 * 1000)

  const position = String(item.position || '')
  const goods = String(item.goods || '')

  const goodsCN = lookupCN(translation.goods, goods)
  const positionCN = lookupCN(translation.position, position)

  return {
    _id: `${date}_${time}_${position}_${goods}`,
    date,
    time,
    position,
    position_link: String(item.position_link || ''),
    goods,
    goods_link: String(item.goods_link || ''),
    values: String(item.values ?? ''),
    krTime,
    krTs: krTime.getTime(),
    goodsCN,
    positionCN
  }
}

const persistSmugKrItems = async items => {
  const summary = { total: 0, inserted: 0, skipped: 0, invalid: 0 }
  if (!Array.isArray(items) || items.length === 0) return summary
  summary.total = items.length

  const client = await getClient()
  if (!client) throw new Error('mongo getClient() 失败')
  const col = client.db(SMUG_KR_DB_NAME).collection(SMUG_KR_COLLECTION)

  for (const item of items) {
    const doc = buildSmugKrDoc(item)
    if (!doc) {
      summary.invalid++
      continue
    }
    try {
      // CN 字段从 $setOnInsert 抽出来放到 $set —— 这样未来翻译表更新时
      // 已存在记录也能在下次 upsert 时被补上。无翻译时不写以避免覆盖。
      const { goodsCN, positionCN, ...core } = doc
      const setFields = {}
      if (goodsCN) setFields.goodsCN = goodsCN
      if (positionCN) setFields.positionCN = positionCN

      const update = {
        $setOnInsert: { ...core, createdAt: new Date() }
      }
      if (Object.keys(setFields).length > 0) {
        update.$set = setFields
      }

      const r = await col.updateOne({ _id: doc._id }, update, { upsert: true })
      const upsertedCount = (r && (r.upsertedCount || (r.upserted && r.upserted.length))) || 0
      if (upsertedCount > 0) {
        summary.inserted++
      } else {
        summary.skipped++
      }
    } catch (e) {
      console.error('[smugglerKr] upsert error', e?.message || e, doc._id)
      summary.invalid++
    }
  }
  return summary
}

// 用当前 translation.json 给已存在的 kr 记录补 goodsCN/positionCN
// 仅写入翻译非空且与现值不同的字段；不会清空已有值
const backfillCnFields = async () => {
  const client = await getClient()
  if (!client) throw new Error('mongo getClient() 失败')
  const col = client.db(SMUG_KR_DB_NAME).collection(SMUG_KR_COLLECTION)
  const all = await col.find({}).toArray()
  let updated = 0
  for (const doc of all) {
    const setFields = {}
    const goodsCN = lookupCN(translation.goods, doc.goods || '')
    const positionCN = lookupCN(translation.position, doc.position || '')
    if (goodsCN && goodsCN !== doc.goodsCN) setFields.goodsCN = goodsCN
    if (positionCN && positionCN !== doc.positionCN) setFields.positionCN = positionCN
    if (Object.keys(setFields).length > 0) {
      await col.updateOne({ _id: doc._id }, { $set: setFields })
      updated++
    }
  }
  return { total: all.length, updated }
}

const scheduledFetchSmugKr = async () => {
  if (_smugKrFetching) {
    console.warn('[smugglerKr] 上一次抓取尚未结束，跳过本次')
    return
  }
  _smugKrFetching = true
  const startedAt = new Date()
  const tag = startedAt.toISOString()
  try {
    const { smug2Result, debug } = await fetchLuteSmugViaBrowser()
    let parsed = null
    if (smug2Result?.body) {
      try { parsed = JSON.parse(smug2Result.body) } catch { parsed = null }
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn(`[${tag}] [smugglerKr] 未拿到有效数据 proxy=${debug?.proxy} status=${smug2Result?.status ?? 'n/a'} domRows=${debug?.domRows?.length || 0}`)
      return
    }
    const r = await persistSmugKrItems(parsed)
    console.log(`[${tag}] [smugglerKr] OK proxy=${debug?.proxy} 总=${r.total} 新增=${r.inserted} 跳过=${r.skipped} 无效=${r.invalid}`)
  } catch (err) {
    console.error(`[${tag}] [smugglerKr] 抓取失败:`, err?.message || err)
  } finally {
    _smugKrFetching = false
  }
}

const startSmugKrScheduler = () => {
  if (_smugKrSchedulerStarted) return
  _smugKrSchedulerStarted = true
  // 启动 10 秒后跑首轮，避免和其他启动逻辑抢资源；之后每 36 分钟一次
  setTimeout(() => {
    scheduledFetchSmugKr()
    setInterval(scheduledFetchSmugKr, SMUG_KR_FETCH_INTERVAL_MS)
  }, 10 * 1000)
  console.log(`[smugglerKr] 定时抓取已启动，间隔 ${SMUG_KR_FETCH_INTERVAL_MS / 60000} 分钟`)
}

// 模块被 require 时自动启动；通过 LUTE_SMUG_AUTO_START=0 可禁用
if (process.env.LUTE_SMUG_AUTO_START !== '0') {
  startSmugKrScheduler()
}

// === 查询接口（供 mabiSuperSmuggler 等使用）===
const getRecentSmugKrItems = async (limit = 10) => {
  const client = await getClient()
  if (!client) throw new Error('mongo getClient() 失败')
  const col = client.db(SMUG_KR_DB_NAME).collection(SMUG_KR_COLLECTION)
  return col.find({}).sort({ krTs: -1 }).limit(limit).toArray()
}

// 取下一次走私预测：找出 krTs 大于当前国服最新 forecast.ts 的最早 KR 记录
// （韩服比国服领先 1~2 个 36 分钟周期，所以这条 KR 记录即为国服下一次走私）
const SMUG_CN_COLLECTION = 'cl_mabinogi_smuggler'
const getNextSmugKrPrediction = async () => {
  const client = await getClient()
  if (!client) throw new Error('mongo getClient() 失败')
  const krCol = client.db(SMUG_KR_DB_NAME).collection(SMUG_KR_COLLECTION)
  const cnCol = client.db(SMUG_KR_DB_NAME).collection(SMUG_CN_COLLECTION)

  const latestCn = await cnCol
    .find({ type: 'forecast', area: { $ne: null }, item: { $ne: null } })
    .sort({ ts: -1 })
    .limit(1)
    .next()

  const lastCnTs = latestCn ? latestCn.ts : 0
  const nextKr = await krCol
    .find({ krTs: { $gt: lastCnTs } })
    .sort({ krTs: 1 })
    .limit(1)
    .next()

  if (!nextKr) return null
  return { doc: nextKr, lastCnTs, latestCnDoc: latestCn || null }
}

module.exports = {
  startSmugKrScheduler,
  scheduledFetchSmugKr,
  persistSmugKrItems,
  buildSmugKrDoc,
  fetchLuteSmugViaBrowser,
  getRecentSmugKrItems,
  getNextSmugKrPrediction,
  reloadTranslation,
  getTranslation,
  backfillCnFields,
  SMUG_KR_DB_NAME,
  SMUG_KR_COLLECTION
}
