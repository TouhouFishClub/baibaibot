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

const dateKey = d => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
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

const escHtml = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const partToRegex = part =>
  part.replace(/([.+?^${}()|[\]\\])/g, '\\$1').replace(/%/g, '.*')

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

/** 与 mbtvStats / mbzzStats 一致的时间 + 关键词解析；关键词内勿夹杂未转义空格分段时间（首个非日期 token 为关键词） */
const parseMbcdsArgs = raw => {
  const args = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (args.length === 0) {
    // 无参数：默认近 3 个月的“总览统计”
    const { start, end } = rangeDefaultThreeMonths()
    return { start, end, keyword: null }
  }

  if (args.length === 1) {
    if (isDateToken(args[0])) {
      const start = parseDateStart(args[0])
      if (!start) return { error: '开始时间格式无效，请使用 2026-1-1 形式' }
      // 仅时间：进入“总览统计”模式（无关键词）
      return { start, end: new Date(), keyword: null }
    }
    const { start, end } = rangeDefaultThreeMonths()
    return { start, end, keyword: args[0] }
  }

  if (args.length === 2) {
    if (isDateToken(args[0]) && isDateToken(args[1])) {
      const start = parseDateStart(args[0])
      const end = parseDateEnd(args[1])
      if (!start || !end) return { error: '时间格式无效，请使用 2026-1-1 形式' }
      if (end < start) return { error: '结束时间不能早于开始时间' }
      const ONE_YEAR_MS = 366 * 24 * 60 * 60 * 1000
      if (end.getTime() - start.getTime() > ONE_YEAR_MS) {
        return { error: '开始时间与结束时间的范围不能超过1年' }
      }
      // 仅时间：总览统计模式
      return { start, end, keyword: null }
    }
    if (isDateToken(args[0])) {
      const start = parseDateStart(args[0])
      const end = parseDateEnd(args[1])
      if (!start || !end) return { error: '时间格式无效，请使用 2026-1-1 形式' }
      if (end < start) return { error: '结束时间不能早于开始时间' }
      const ONE_YEAR_MS = 366 * 24 * 60 * 60 * 1000
      if (end.getTime() - start.getTime() > ONE_YEAR_MS) {
        return { error: '开始时间与结束时间的范围不能超过1年' }
      }
      return { error: '指定起止时间时请将关键词放在最前。例：mbcds 关键词 2026-1-1 2026-4-1' }
    }
    const start = parseDateStart(args[1])
    if (!start) return { error: '开始时间格式无效，请使用 2026-1-1 形式' }
    return { start, end: new Date(), keyword: args[0] }
  }

  const start = parseDateStart(args[1])
  const end = parseDateEnd(args[2])
  if (!start || !end) return { error: '时间格式无效，请使用 2026-1-1 形式' }
  if (end < start) return { error: '结束时间不能早于开始时间' }
  const ONE_YEAR_MS = 366 * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > ONE_YEAR_MS) {
    return { error: '开始时间与结束时间的范围不能超过1年' }
  }
  return { start, end, keyword: args[0] }
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

const topNWithOther = (map, n = 15) => {
  const arr = [...map.entries()].sort((a, b) => b[1] - a[1])
  if (arr.length <= n) {
    return { labels: arr.map(([k]) => k), data: arr.map(([, v]) => v) }
  }
  const head = arr.slice(0, n)
  const rest = arr.slice(n).reduce((s, [, v]) => s + v, 0)
  return { labels: [...head.map(([k]) => k), '其他'], data: [...head.map(([, v]) => v), rest] }
}

const UNKNOWN_POOL_LABEL = '（未知蛋池）'

const countDrawsInPool = (col, start, end, poolName) => {
  if (poolName === UNKNOWN_POOL_LABEL) {
    return col.count({
      time: { $gte: start, $lte: end },
      $or: [{ draw_pool: { $exists: false } }, { draw_pool: null }, { draw_pool: '' }]
    })
  }
  return col.count({
    time: { $gte: start, $lte: end },
    draw_pool: poolName
  })
}

const docsToPoolPie = docs => {
  const m = new Map()
  for (const doc of docs) {
    const p =
      doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL
    m.set(p, (m.get(p) || 0) + 1)
  }
  return topNWithOther(m, 15)
}

const docsToItemPie = docs => {
  const m = new Map()
  for (const doc of docs) {
    const it = doc.item_name && String(doc.item_name).trim() ? String(doc.item_name).trim() : '（无名称）'
    m.set(it, (m.get(it) || 0) + 1)
  }
  return topNWithOther(m, 15)
}

const rankItemsByShare = docs => {
  const m = new Map()
  for (const doc of docs) {
    const it = doc.item_name && String(doc.item_name).trim() ? String(doc.item_name).trim() : '（无名称）'
    m.set(it, (m.get(it) || 0) + 1)
  }
  const total = [...m.values()].reduce((s, v) => s + v, 0)
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count], i) => ({
      rank: i + 1,
      name,
      count,
      pct: total > 0 ? (100 * count) / total : 0
    }))
}

const top10CharsFromDocs = docs => {
  const m = new Map()
  for (const doc of docs) {
    const ch = doc.character_name && String(doc.character_name).trim()
    if (!ch) continue
    m.set(ch, (m.get(ch) || 0) + 1)
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count], i) => ({ rank: i + 1, name, count }))
}

const top10ItemsFromDocs = docs => {
  const m = new Map()
  for (const doc of docs) {
    const it = doc.item_name && String(doc.item_name).trim() ? String(doc.item_name).trim() : '（无名称）'
    m.set(it, (m.get(it) || 0) + 1)
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count], i) => ({ rank: i + 1, name, count }))
}

const buildDailyUniqueSeries = (docs, start, end, poolLabels) => {
  const labels = enumerateDays(start, end)
  const totalByDay = new Map()
  const byPoolDay = new Map() // pool -> day -> Set(chars)
  const otherPools = new Set()
  const poolSet = new Set(poolLabels)
  for (const p of poolLabels) byPoolDay.set(p, new Map())

  for (const doc of docs) {
    const t = doc.time ? new Date(doc.time) : new Date(doc.ts)
    const dk = dateKey(t)
    const ch = doc.character_name && String(doc.character_name).trim()
    if (!ch) continue
    const pool =
      doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL

    if (!totalByDay.has(dk)) totalByDay.set(dk, new Set())
    totalByDay.get(dk).add(ch)

    const target = poolSet.has(pool) ? pool : '其他'
    if (!poolSet.has(pool)) otherPools.add(pool)
    if (!byPoolDay.has(target)) byPoolDay.set(target, new Map())
    const mp = byPoolDay.get(target)
    if (!mp.has(dk)) mp.set(dk, new Set())
    mp.get(dk).add(ch)
  }

  const series = {}
  for (const [pool, mp] of byPoolDay.entries()) {
    series[pool] = labels.map(d => (mp.get(d) ? mp.get(d).size : 0))
  }
  const totalSeries = labels.map(d => (totalByDay.get(d) ? totalByDay.get(d).size : 0))
  return { labels, totalSeries, series }
}

const aggregateSummaryFromDocs = (docs, start, end) => {
  const poolCount = new Map()
  const bumpPool = p => poolCount.set(p, (poolCount.get(p) || 0) + 1)
  for (const doc of docs) {
    const pool =
      doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL
    bumpPool(pool)
  }

  // 折线：蛋池过多时取 TOP7 + 其他
  const poolsSorted = [...poolCount.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const poolLabelsForLine = poolsSorted.length <= 8 ? poolsSorted : [...poolsSorted.slice(0, 7), '其他']

  const piePool = topNWithOther(poolCount, 15)
  const topChars = top10CharsFromDocs(docs)
  const topItems = top10ItemsFromDocs(docs)
  const daily = buildDailyUniqueSeries(docs, start, end, poolLabelsForLine.filter(x => x !== '其他'))

  return {
    piePool,
    topChars,
    topItems,
    daily
  }
}

const toFiniteNumber = x => {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

const buildRevenueRows = (docs, poolSRareMap) => {
  const poolCount = new Map()
  for (const doc of docs) {
    const pool =
      doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL
    poolCount.set(pool, (poolCount.get(pool) || 0) + 1)
  }

  const rows = []
  for (const [poolName, count] of poolCount.entries()) {
    if (poolName === UNKNOWN_POOL_LABEL) continue
    const sRarePct = toFiniteNumber(poolSRareMap.get(poolName))
    // 没有目标礼包的 S 级概率时直接忽略
    if (!(sRarePct > 0)) continue
    const estRevenue = sRarePct > 0 ? (count / sRarePct / 60) * 264 : 0
    rows.push({
      poolName,
      count,
      sRarePct,
      estRevenue
    })
  }

  rows.sort((a, b) => b.estRevenue - a.estRevenue || b.count - a.count)
  return rows
}

const buildPoolSRareMap = async (db, poolNames) => {
  const uniqPools = [
    ...new Set(
      poolNames
        .map(x => String(x || '').trim())
        .filter(Boolean)
        .filter(x => x !== UNKNOWN_POOL_LABEL)
    )
  ]
  if (!uniqPools.length) return new Map()

  const col = db.collection('cl_mabinogi_gacha_info')
  const docs = await col
    .find(
      {
        info: {
          $elemMatch: {
            pool: { $in: uniqPools },
            rareTag: 'S'
          }
        }
      },
      { projection: { info: 1, _id: 0 } }
    )
    .toArray()

  const poolSRareMap = new Map()
  for (const doc of docs) {
    const info = Array.isArray(doc.info) ? doc.info : []
    for (const it of info) {
      if (!it || it.rareTag !== 'S') continue
      const pool = it.pool && String(it.pool).trim()
      if (!pool || !uniqPools.includes(pool) || poolSRareMap.has(pool)) continue
      const rare = toFiniteNumber(it.rare)
      if (rare > 0) poolSRareMap.set(pool, rare)
    }
  }
  return poolSRareMap
}

const escapeJsonForHtml = obj =>
  JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

const buildPayload = async (db, start, end, keyword) => {
  const kw = keyword && String(keyword).trim().length ? String(keyword).trim() : null
  const timeQ = { time: { $gte: start, $lte: end } }
  const fields = { draw_pool: 1, item_name: 1, character_name: 1, time: 1, ts: 1, _id: 0 }
  const colYlx = db.collection('cl_mbcd_ylx')
  const colYate = db.collection('cl_mbcd_yate')

  // 仅时间：总览统计（不做关键词三维度）
  if (!kw) {
    const [docsYlx, docsYate] = await Promise.all([
      colYlx.find(timeQ, fields).toArray(),
      colYate.find(timeQ, fields).toArray()
    ])
    const allPools = [...docsYlx, ...docsYate].map(doc =>
      doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL
    )
    const poolSRareMap = await buildPoolSRareMap(db, allPools)
    return {
      rangeText: formatRangeText(start, end),
      keyword: '',
      summary: {
        ylx: {
          ...aggregateSummaryFromDocs(docsYlx, start, end),
          revenueRows: buildRevenueRows(docsYlx, poolSRareMap)
        },
        yate: {
          ...aggregateSummaryFromDocs(docsYate, start, end),
          revenueRows: buildRevenueRows(docsYate, poolSRareMap)
        }
      },
      character: null,
      pool: null,
      item: null
    }
  }

  const [charYlx, charYate] = await Promise.all([
    colYlx.find({ ...timeQ, character_name: kw }, fields).toArray(),
    colYate.find({ ...timeQ, character_name: kw }, fields).toArray()
  ])

  let character = null
  if (charYlx.length || charYate.length) {
    character = {
      name: kw,
      pieYlx: charYlx.length ? docsToPoolPie(charYlx) : null,
      pieYate: charYate.length ? docsToPoolPie(charYate) : null
    }
  }

  const [poolYlx, poolYate] = await Promise.all([
    colYlx.find({ ...timeQ, draw_pool: kw }, fields).toArray(),
    colYate.find({ ...timeQ, draw_pool: kw }, fields).toArray()
  ])

  let pool = null
  if (poolYlx.length || poolYate.length) {
    const topYlx = poolYlx.length ? top10CharsFromDocs(poolYlx) : []
    const topYate = poolYate.length ? top10CharsFromDocs(poolYate) : []
    const itemRankYlx = poolYlx.length ? rankItemsByShare(poolYlx) : []
    const itemRankYate = poolYate.length ? rankItemsByShare(poolYate) : []
    pool = {
      poolName: kw,
      pieYlx: poolYlx.length ? docsToItemPie(poolYlx) : null,
      pieYate: poolYate.length ? docsToItemPie(poolYate) : null,
      itemRankYlx,
      itemRankYate,
      topYlx,
      topYate,
      showItemRankYlx: itemRankYlx.length > 0,
      showItemRankYate: itemRankYate.length > 0,
      showRankYlx: topYlx.length > 0,
      showRankYate: topYate.length > 0
    }
  }

  const itemRegex = new RegExp(partToRegex(kw), 'i')
  const [itemYlx, itemYate] = await Promise.all([
    colYlx.find({ ...timeQ, item_name: itemRegex }, fields).toArray(),
    colYate.find({ ...timeQ, item_name: itemRegex }, fields).toArray()
  ])

  let item = null
  if (itemYlx.length || itemYate.length) {
    const namesSet = new Set()
    for (const d of [...itemYlx, ...itemYate]) {
      if (d.item_name && String(d.item_name).trim()) namesSet.add(String(d.item_name).trim())
    }
    const matchedNames = [...namesSet].sort()

    const buildRows = async (col, docs) => {
      const poolMatched = new Map()
      for (const doc of docs) {
        const pool =
          doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL
        poolMatched.set(pool, (poolMatched.get(pool) || 0) + 1)
      }
      const rows = []
      for (const [poolName, matched] of poolMatched.entries()) {
        const safeTotal = await countDrawsInPool(col, start, end, poolName)
        const denom = safeTotal > 0 ? safeTotal : matched
        const pct = denom ? (100 * matched) / denom : 0
        rows.push({ pool: poolName, matched, total: safeTotal, pct })
      }
      rows.sort((a, b) => b.pct - a.pct || b.matched - a.matched)
      return rows
    }

    const splitDocsByItem = docs => {
      const m = new Map()
      for (const doc of docs) {
        const it = doc.item_name && String(doc.item_name).trim() ? String(doc.item_name).trim() : '（无名称）'
        if (!m.has(it)) m.set(it, [])
        m.get(it).push(doc)
      }
      return m
    }

    const buildPoolGroups = async (col, docs) => {
      const byPool = new Map()
      for (const doc of docs) {
        const pool =
          doc.draw_pool && String(doc.draw_pool).trim() ? String(doc.draw_pool).trim() : UNKNOWN_POOL_LABEL
        const item =
          doc.item_name && String(doc.item_name).trim() ? String(doc.item_name).trim() : '（无名称）'
        if (!byPool.has(pool)) byPool.set(pool, new Map())
        const itemMap = byPool.get(pool)
        itemMap.set(item, (itemMap.get(item) || 0) + 1)
      }

      const groups = []
      for (const [poolName, itemMap] of byPool.entries()) {
        const poolTotal = await countDrawsInPool(col, start, end, poolName)
        const rows = [...itemMap.entries()]
          .map(([itemName, matched]) => {
            const denom = poolTotal > 0 ? poolTotal : matched
            const pct = denom ? (100 * matched) / denom : 0
            return { itemName, matched, total: poolTotal, pct }
          })
          .sort((a, b) => b.pct - a.pct || b.matched - a.matched)
        groups.push({
          poolName,
          poolMatched: rows.reduce((s, x) => s + x.matched, 0),
          rows
        })
      }
      groups.sort((a, b) => b.poolMatched - a.poolMatched)
      // 蛋池过多时限制展示数量，避免图片过长
      return { groups: groups.slice(0, 8), hiddenCount: Math.max(0, groups.length - 8) }
    }

    const perPoolYlx = itemYlx.length
      ? await buildPoolGroups(colYlx, itemYlx)
      : { groups: [], hiddenCount: 0 }
    const perPoolYate = itemYate.length
      ? await buildPoolGroups(colYate, itemYate)
      : { groups: [], hiddenCount: 0 }

    const topYlx = itemYlx.length ? top10CharsFromDocs(itemYlx) : []
    const topYate = itemYate.length ? top10CharsFromDocs(itemYate) : []
    item = {
      keyword: kw,
      matchedNames,
      perPoolYlx,
      perPoolYate,
      topYlx,
      topYate,
      showTableYlx: perPoolYlx.groups.length > 0,
      showTableYate: perPoolYate.groups.length > 0,
      showRankYlx: topYlx.length > 0,
      showRankYate: topYate.length > 0
    }
  }

  return {
    rangeText: formatRangeText(start, end),
    keyword: kw,
    summary: null,
    character,
    pool,
    item
  }
}

const renderStatsImage = async (payload, outputPath) => {
  const charts = []
  if (payload.summary) {
    if (payload.summary.ylx && payload.summary.ylx.piePool) {
      charts.push({ kind: 'pie', id: 'pieSummaryPoolYlx', slice: payload.summary.ylx.piePool })
    }
    if (payload.summary.yate && payload.summary.yate.piePool) {
      charts.push({ kind: 'pie', id: 'pieSummaryPoolYate', slice: payload.summary.yate.piePool })
    }
    if (payload.summary.ylx && payload.summary.ylx.daily) {
      charts.push({
        kind: 'line',
        id: 'lineSummaryYlx',
        line: {
          labels: payload.summary.ylx.daily.labels,
          totalSeries: payload.summary.ylx.daily.totalSeries,
          series: payload.summary.ylx.daily.series
        }
      })
    }
    if (payload.summary.yate && payload.summary.yate.daily) {
      charts.push({
        kind: 'line',
        id: 'lineSummaryYate',
        line: {
          labels: payload.summary.yate.daily.labels,
          totalSeries: payload.summary.yate.daily.totalSeries,
          series: payload.summary.yate.daily.series
        }
      })
    }
  }
  if (payload.character) {
    if (payload.character.pieYlx)
      charts.push({ kind: 'pie', id: 'pieCharYlx', slice: payload.character.pieYlx })
    if (payload.character.pieYate)
      charts.push({ kind: 'pie', id: 'pieCharYate', slice: payload.character.pieYate })
  }
  if (payload.pool) {
    if (payload.pool.pieYlx) charts.push({ kind: 'pie', id: 'piePoolYlx', slice: payload.pool.pieYlx })
    if (payload.pool.pieYate) charts.push({ kind: 'pie', id: 'piePoolYate', slice: payload.pool.pieYate })
  }

  const dataJson = escapeJsonForHtml({ charts })

  const summaryRankList = list =>
    list && list.length
      ? `<ol class="rank">${list
          .map(x => `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次</span></li>`)
          .join('')}</ol>`
      : ''

  const summaryRevenueTable = rows =>
    rows && rows.length
      ? `<table>
          <thead><tr><th>礼包名称</th><th class="num">出货数量</th><th class="num">S级百分比</th><th class="num">推测营收</th></tr></thead>
          <tbody>${rows
            .map(
              r =>
                `<tr><td>${escHtml(r.poolName)}</td><td class="num">${r.count}</td><td class="num">${r.sRarePct > 0 ? r.sRarePct.toFixed(2) + '%' : '—'}</td><td class="num revenue-gold">${r.estRevenue > 0 ? ('¥' + r.estRevenue.toFixed(2)) : '—'}</td></tr>`
            )
            .join('')}</tbody>
        </table>`
      : '<div class="sub">该时间段内未匹配到可用的 S 级概率数据。</div>'

  const summaryBlock =
    payload.summary &&
    `<div class="block">
      <h2>时间总览 · 蛋池占比 / Rank10 / 每日出货人数 <span class="tag">无关键词</span></h2>
      <div class="table-split">
        <div class="tbl-wrap">
          <div class="sub-title">伊鲁夏 · 蛋池占比</div>
          <div class="pies">
            <div class="pie-box"><h3>draw_pool</h3><canvas id="pieSummaryPoolYlx"></canvas></div>
          </div>
          <h3 class="mid">出货角色 Rank10</h3>
          ${summaryRankList(payload.summary.ylx.topChars)}
          <h3 class="mid">出货物品 Rank10</h3>
          ${summaryRankList(payload.summary.ylx.topItems)}
          <h3 class="mid">每日出货人数（按蛋池）</h3>
          <div class="line-box"><canvas id="lineSummaryYlx"></canvas></div>
          <h3 class="mid">蛋池收益估算（按营收排序）</h3>
          ${summaryRevenueTable(payload.summary.ylx.revenueRows)}
        </div>
        <div class="tbl-wrap">
          <div class="sub-title">亚特 · 蛋池占比</div>
          <div class="pies">
            <div class="pie-box"><h3>draw_pool</h3><canvas id="pieSummaryPoolYate"></canvas></div>
          </div>
          <h3 class="mid">出货角色 Rank10</h3>
          ${summaryRankList(payload.summary.yate.topChars)}
          <h3 class="mid">出货物品 Rank10</h3>
          ${summaryRankList(payload.summary.yate.topItems)}
          <h3 class="mid">每日出货人数（按蛋池）</h3>
          <div class="line-box"><canvas id="lineSummaryYate"></canvas></div>
          <h3 class="mid">蛋池收益估算（按营收排序）</h3>
          ${summaryRevenueTable(payload.summary.yate.revenueRows)}
        </div>
      </div>
    </div>`

  const charBlock =
    payload.character &&
    `<div class="block">
      <h2>角色「${escHtml(payload.character.name)}」· 蛋池分布 <span class="tag">完全匹配 · 仅含该角色有记录的服务器</span></h2>
      <div class="pies">
        ${
          payload.character.pieYlx
            ? `<div class="pie-box"><h3>伊鲁夏</h3><canvas id="pieCharYlx"></canvas></div>`
            : ''
        }
        ${
          payload.character.pieYate
            ? `<div class="pie-box"><h3>亚特</h3><canvas id="pieCharYate"></canvas></div>`
            : ''
        }
      </div>
    </div>`

  const formatPerPoolTables = perPool =>
    (perPool.groups || [])
      .map(
        x => `<div class="tbl-wrap" style="margin-top:10px;">
          <div class="sub-title">蛋池：${escHtml(x.poolName)} <span class="tag">命中 ${x.poolMatched} 次</span></div>
          <table>
            <thead><tr><th>物品</th><th class="num">匹配</th><th class="num">蛋池计</th><th class="num">占比</th></tr></thead>
            <tbody>${x.rows
              .map(
                r =>
                  `<tr><td>${escHtml(r.itemName)}</td><td class="num">${r.matched}</td><td class="num">${r.total}</td><td class="num">${r.pct.toFixed(2)}%</td></tr>`
              )
              .join('')}</tbody>
          </table>
        </div>`
      )
      .join('')

  const itemBlock =
    payload.item &&
    `<div class="block">
      <h2>道具匹配「${escHtml(payload.item.keyword)}」<span class="tag">正则 / % 通配</span></h2>
      <div class="sub">命中道具（${payload.item.matchedNames.length} 种）：${escHtml(
      payload.item.matchedNames.slice(0, 12).join('、')
    )}${payload.item.matchedNames.length > 12 ? '…' : ''}</div>
      <div class="table-split">
        ${
          payload.item.showTableYlx
            ? `<div class="tbl-wrap">
          <div class="sub-title">伊鲁夏 · 按蛋池分组展示匹配物品占比${
            payload.item.perPoolYlx.hiddenCount ? ` <span class="tag">另有 ${payload.item.perPoolYlx.hiddenCount} 个蛋池未展开</span>` : ''
          }</div>
          ${formatPerPoolTables(payload.item.perPoolYlx)}
        </div>`
            : ''
        }
        ${
          payload.item.showTableYate
            ? `<div class="tbl-wrap">
          <div class="sub-title">亚特 · 按蛋池分组展示匹配物品占比${
            payload.item.perPoolYate.hiddenCount ? ` <span class="tag">另有 ${payload.item.perPoolYate.hiddenCount} 个蛋池未展开</span>` : ''
          }</div>
          ${formatPerPoolTables(payload.item.perPoolYate)}
        </div>`
            : ''
        }
      </div>
      ${
        payload.item.showRankYlx || payload.item.showRankYate
          ? `<h3 class="mid">出货角色 Rank10（仅统计道具匹配记录）</h3>
      <div class="top-split">
        ${
          payload.item.showRankYlx
            ? `<div class="top-col">
          <div class="sub-title">伊鲁夏</div>
          <ol class="rank">
            ${payload.item.topYlx
              .map(
                x =>
                  `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次</span></li>`
              )
              .join('')}
          </ol>
        </div>`
            : ''
        }
        ${
          payload.item.showRankYate
            ? `<div class="top-col">
          <div class="sub-title">亚特</div>
          <ol class="rank">
            ${payload.item.topYate
              .map(
                x =>
                  `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次</span></li>`
              )
              .join('')}
          </ol>
        </div>`
            : ''
        }
      </div>`
          : ''
      }
    </div>`

  const topList = (title, list) =>
    list.length
      ? `<ol class="rank">${list
          .map(x => `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次</span></li>`)
          .join('')}</ol>`
      : ''

  const itemShareRankList = list =>
    list.length
      ? `<ol class="rank">${list
          .map(
            x =>
              `<li><span>${escHtml(x.name)}</span><span class="cnt">${x.count} 次 · ${x.pct.toFixed(2)}%</span></li>`
          )
          .join('')}</ol>`
      : ''

  const poolBlock =
    payload.pool &&
    `<div class="block">
      <h2>蛋池「${escHtml(payload.pool.poolName)}」· 道具分布 <span class="tag">完全匹配</span></h2>
      <div class="pies">
        ${
          payload.pool.pieYlx
            ? `<div class="pie-box"><h3>伊鲁夏 · item</h3><canvas id="piePoolYlx"></canvas></div>`
            : ''
        }
        ${
          payload.pool.pieYate
            ? `<div class="pie-box"><h3>亚特 · item</h3><canvas id="piePoolYate"></canvas></div>`
            : ''
        }
      </div>
      ${
        payload.pool.showItemRankYlx || payload.pool.showItemRankYate
          ? `<h3 class="mid">物品占比 Rank30</h3>
      <div class="top-split">
        ${
          payload.pool.showItemRankYlx
            ? `<div class="top-col">
          <div class="sub-title">伊鲁夏</div>
          ${itemShareRankList(payload.pool.itemRankYlx)}
        </div>`
            : ''
        }
        ${
          payload.pool.showItemRankYate
            ? `<div class="top-col">
          <div class="sub-title">亚特</div>
          ${itemShareRankList(payload.pool.itemRankYate)}
        </div>`
            : ''
        }
      </div>`
          : ''
      }
      ${
        payload.pool.showRankYlx || payload.pool.showRankYate
          ? `<h3 class="mid">出货角色 Rank10</h3>
      <div class="top-split">
        ${
          payload.pool.showRankYlx
            ? `<div class="top-col">
          <div class="sub-title">伊鲁夏</div>
          ${topList('', payload.pool.topYlx)}
        </div>`
            : ''
        }
        ${
          payload.pool.showRankYate
            ? `<div class="top-col">
          <div class="sub-title">亚特</div>
          ${topList('', payload.pool.topYate)}
        </div>`
            : ''
        }
      </div>`
          : ''
      }
    </div>`

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
      padding: 28px 32px 36px;
    }
    .hero { border-left: 4px solid #5b8fce; padding-left: 18px; margin-bottom: 20px; }
    .hero h1 {
      font-size: 30px; font-weight: normal; letter-spacing: 2px; color: #f0f2f8;
      text-shadow: 0 2px 24px rgba(91, 143, 206, 0.35);
    }
    .meta { margin-top: 10px; font-size: 16px; color: #9aa3b5; line-height: 1.65; }
    .meta strong { color: #c5d0e0; }
    .block {
      margin-bottom: 26px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .block:last-child { border-bottom: 0; }
    h2 {
      font-size: 18px; font-weight: normal; color: #c5d0e0;
      margin-bottom: 12px;
    }
    .tag {
      font-size: 13px; color: #7eb8ff;
      margin-left: 8px;
      opacity: 0.9;
    }
    .sub { font-size: 14px; color: #9aa3b5; margin-bottom: 10px; line-height: 1.5; }
    .sub-title { color: #aeb8ca; font-size: 14px; margin-bottom: 6px; }
    .mid { font-size: 16px; color: #aeb8ca; margin: 16px 0 10px; font-weight: normal; }
    .pies {
      display: flex;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    .pie-box {
      flex: 1;
      min-width: 380px;
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 14px 12px 8px;
      min-height: 360px;
    }
    .pie-box h3 {
      text-align: center; font-size: 15px; font-weight: normal; color: #aeb8ca; margin-bottom: 6px;
    }
    .pie-box canvas { margin: 0 auto; display: block; width: 100% !important; height: auto !important; max-height: 280px; }
    .line-box {
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 10px 10px 6px;
      margin-top: 6px;
    }
    .line-box canvas { width: 100% !important; height: 240px !important; }
    .table-split { display: flex; gap: 14px; margin-top: 8px; }
    .tbl-wrap {
      flex: 1;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 12px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td {
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: #dde3ee;
    }
    th { color: #aeb8ca; font-weight: normal; }
    .num { text-align: right; font-variant-numeric: tabular-nums; color: #7eb8ff; }
    .revenue-gold { color: #f2d27a; font-weight: bold; }
    .top-split { display: flex; gap: 14px; }
    .top-col { width: calc((100% - 14px) / 2); }
    ol.rank {
      list-style: none; counter-reset: r;
      background: linear-gradient(90deg, rgba(91,143,206,0.1) 0%, rgba(255,255,255,0.02) 100%);
      border-radius: 10px;
      border: 1px solid rgba(91,143,206,0.2);
      padding: 8px 12px;
    }
    ol.rank li {
      counter-increment: r;
      font-size: 15px;
      padding: 7px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      color: #dde3ee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    ol.rank li:last-child { border-bottom: 0; }
    ol.rank li::before {
      content: counter(r);
      display: inline-block;
      width: 24px; height: 24px; line-height: 24px; text-align: center;
      background: rgba(91,143,206,0.35);
      border-radius: 6px;
      margin-right: 10px;
      font-size: 13px;
      color: #fff;
    }
    .cnt { color: #7eb8ff; font-size: 14px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>手帕抽蛋统计 · 多维度</h1>
    <div class="meta">
      <div><strong>查询时间范围</strong>：${escHtml(payload.rangeText)}</div>
      <div><strong>关键词</strong>：${payload.keyword ? escHtml(payload.keyword) : '（无）'}</div>
    </div>
  </div>
  ${summaryBlock || ''}
  ${charBlock || ''}
  ${itemBlock || ''}
  ${poolBlock || ''}
  <script type="application/json" id="chartPayload">${dataJson}</script>
  <script>
    Chart.defaults.color = '#9aa3b5';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.12)';
    Chart.defaults.font.family = 'HANYIWENHEI, sans-serif';
    var piePalette = ['#6C9BD2','#E8A87C','#C38D9E','#41B3A3','#E27D60','#8FC1A9','#F64C72','#99738E','#85CDCA','#EAB965'];
    function buildPieColors(count, labels) {
      var colors = [];
      for (var i = 0; i < count; i++) {
        if (i < piePalette.length) colors.push(piePalette[i]);
        else {
          var hue = (i * 137.508) % 360;
          colors.push('hsl(' + hue.toFixed(1) + ', 58%, 62%)');
        }
      }
      var lastIdx = labels.length - 1;
      if (lastIdx >= 0 && labels[lastIdx] === '其他') colors[lastIdx] = '#3a4252';
      return colors;
    }
    var pieOpts = {
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
            labels: { boxWidth: 14, padding: 6, font: { size: 14 } }
          }
        }
      }
    };
    function mkPie(el, slice) {
      var bg = buildPieColors(slice.data.length, slice.labels);
      new Chart(el, {
        type: 'pie',
        data: {
          labels: slice.labels,
          datasets: [{ data: slice.data, backgroundColor: bg, borderWidth: 1, borderColor: '#1a1d26' }]
        },
        options: pieOpts.options
      });
    }

    function mkLine(el, line) {
      var labels = (line.labels || []).map(function (d) {
        var p = String(d).split('-');
        return p.length >= 3 ? (p[1] + '/' + p[2]) : String(d);
      });
      var datasets = [];
      var colorIdx = 0;
      var series = line.series || {};
      Object.keys(series).forEach(function (k) {
        var c = buildPieColors(100, [])[colorIdx % piePalette.length];
        colorIdx++;
        datasets.push({
          label: k,
          data: series[k],
          borderColor: c,
          backgroundColor: 'rgba(255,255,255,0.0)',
          tension: 0.25,
          fill: false,
          pointRadius: 0
        });
      });
      new Chart(el, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
          animation: false,
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 18 } },
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, padding: 8, font: { size: 12 } } }
          }
        }
      });
    }

    var cp = JSON.parse(document.getElementById('chartPayload').textContent);
    (cp.charts || []).forEach(function (c) {
      var el = document.getElementById(c.id);
      if (!el) return;
      if (c.kind === 'line') return mkLine(el, c.line);
      return mkPie(el, c.slice);
    });
  </script>
</body>
</html>`

  await nodeHtmlToImage({
    html,
    output: outputPath,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    beforeScreenshot: async page => {
      await page.evaluate(() => document.fonts && document.fonts.ready)
      await new Promise(r => setTimeout(r, 500))
    }
  })
}

const mabiMbcdStats = async (content, _qq, callback) => {
  const parsed = parseMbcdsArgs(content)
  if (parsed.error) {
    callback(parsed.error)
    return
  }

  const { start, end, keyword } = parsed
  const client = await getClient()
  if (!client) {
    callback('数据库暂时不可用')
    return
  }

  const db = client.db('db_bot')
  const payload = await buildPayload(db, start, end, keyword)

  if (!payload.summary && !payload.character && !payload.pool && !payload.item) {
    callback('该时间范围内三维度均无数据（角色完全匹配 / 蛋池完全匹配 / 道具正则匹配）。可调整关键词或时间。')
    return
  }

  const outputPath = path.join(IMAGE_DATA, 'mabi_other', 'MabiCDStats.png')
  await renderStatsImage(payload, outputPath)
  callback(`[CQ:image,file=${path.join('send', 'mabi_other', 'MabiCDStats.png')}]`)
}

const mabiGachaTvStats = mabiMbcdStats

module.exports = {
  mabiMbcdStats,
  mabiGachaTvStats,
  parseMbcdsArgs
}
