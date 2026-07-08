// 将误记到旧蛋池、但今天实际属于复刻池「怡丝丽尔芭蕾手帕限时重推」的抽蛋记录改回正确出处
// 用法见 script/README.md
const https = require('https')
const iconv = require('iconv-lite')
const { getClient } = require('../mongo/index')

const TARGET_POOL = '怡丝丽尔芭蕾手帕限时重推'
const DEFAULT_EVENT_URL = 'https://luoqi.tiancity.com/homepage/event/2026/0708yslepl/'

function splitStr (str, start, end, ignoreSearch = false) {
  let subStr = str
  let st = subStr.indexOf(start)
  if (start && st >= 0) subStr = subStr.substring(st + (ignoreSearch ? start.length : 0))
  let et = subStr.indexOf(end)
  if (end && et >= 0) subStr = subStr.substring(0, et + (ignoreSearch ? 0 : end.length))
  return subStr
}

function fetchData (url) {
  return new Promise(resolve => {
    https.get(url, res => {
      res.setEncoding('utf16le')
      let rawData = ''
      res.on('data', chunk => { rawData += chunk })
      res.on('end', () => {
        const data = iconv.decode(iconv.encode(rawData, 'utf16'), 'utf8')
        const charset = splitStr(data, 'charset=', '"', true)
        resolve(iconv.decode(iconv.encode(rawData, 'utf16'), charset))
      })
      res.on('error', () => resolve(''))
    })
  })
}

function normalizeItemNameForAlias (itemName) {
  if (!itemName) return ''
  return String(itemName).replace(/[()（）]/g, '')
}

function parsePoolItemsFromEventHtml (html) {
  const pl = splitStr(splitStr(html, 'var pl', '}'), '{', '}')
  if (!pl.trim()) return new Set()
  const raremap = {}
  // eslint-disable-next-line no-eval
  eval(`raremap = ${pl.trim()}`)
  const items = new Set()
  for (const key of Object.keys(raremap)) {
    const rareInfo = raremap[key]
    if (!Array.isArray(rareInfo) || rareInfo.length < 3) continue
    for (const item of rareInfo[2]) {
      if (item) items.add(String(item).trim())
    }
  }
  return items
}

async function loadReprintItemSet (gachaCol, eventUrl) {
  const itemSet = new Set()
  const aliasSet = new Set()

  const addItem = name => {
    const n = String(name).trim()
    if (!n) return
    itemSet.add(n)
    aliasSet.add(normalizeItemNameForAlias(n))
  }

  const html = await fetchData(eventUrl)
  for (const item of parsePoolItemsFromEventHtml(html)) {
    addItem(item)
  }

  const cursor = gachaCol.find({ 'info.pool': TARGET_POOL })
  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    addItem(doc._id)
    if (doc.alias) addItem(doc.alias)
    for (const info of doc.info || []) {
      if (info && info.pool === TARGET_POOL) {
        addItem(doc._id)
      }
    }
  }

  return { itemSet, aliasSet }
}

function getChinaDayRange (dateStr) {
  const start = new Date(`${dateStr}T00:00:00+08:00`).getTime()
  const end = start + 24 * 60 * 60 * 1000
  return { start, end }
}

function getChinaTodayDateStr () {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value
  return `${y}-${m}-${d}`
}

function itemInReprintPool (itemName, itemSet, aliasSet) {
  if (!itemName) return false
  const name = String(itemName).trim()
  return itemSet.has(name) || aliasSet.has(normalizeItemNameForAlias(name))
}

function parseCli () {
  const argv = process.argv.slice(2)
  const scanOnly = argv.includes('scan') || argv.includes('--scan-only')
  const yes = argv.includes('yes') || argv.includes('--yes')
  const dateArg = argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a))
  const urlArg = argv.find(a => a.startsWith('http'))
  return {
    scanOnly,
    yes,
    dateStr: dateArg || getChinaTodayDateStr(),
    eventUrl: urlArg || DEFAULT_EVENT_URL
  }
}

async function main () {
  const { scanOnly, yes, dateStr, eventUrl } = parseCli()
  const { start, end } = getChinaDayRange(dateStr)

  console.log(`目标蛋池: ${TARGET_POOL}`)
  console.log(`活动页: ${eventUrl}`)
  console.log(`日期范围(北京时间): ${dateStr} 00:00 ~ 次日 00:00`)
  console.log(`模式: ${scanOnly ? '仅扫描' : yes ? '直接修复' : '扫描后确认修复'}`)

  const client = await getClient()
  if (!client) {
    console.error('无法连接 MongoDB')
    process.exit(1)
  }

  const db = client.db('db_bot')
  const gachaCol = db.collection('cl_mabinogi_gacha_info')
  const { itemSet, aliasSet } = await loadReprintItemSet(gachaCol, eventUrl)

  console.log(`复刻池道具数: ${itemSet.size}`)
  if (!itemSet.size) {
    console.error('未能加载复刻池道具列表，请检查活动页 URL 或网络')
    process.exit(1)
  }

  const servers = ['ylx', 'yate']
  let totalCandidates = 0
  let totalFixed = 0
  const summaryByPool = new Map()

  try {
    for (const sv of servers) {
      const col = db.collection(`cl_mbcd_${sv}`)
      const docs = await col.find({
        ts: { $gte: start, $lt: end },
        draw_pool: { $ne: TARGET_POOL },
        item_name: { $exists: true, $ne: '' }
      }).toArray()

      const toFix = docs.filter(doc => itemInReprintPool(doc.item_name, itemSet, aliasSet))
      totalCandidates += toFix.length

      console.log(`\n=== ${sv} (${col.collectionName}) ===`)
      console.log(`当日非目标池记录: ${docs.length}`)
      console.log(`其中应改回复刻池: ${toFix.length}`)

      const byWrongPool = new Map()
      const byItem = new Map()
      for (const doc of toFix) {
        const wrongPool = doc.draw_pool || '(空)'
        byWrongPool.set(wrongPool, (byWrongPool.get(wrongPool) || 0) + 1)
        byItem.set(doc.item_name, (byItem.get(doc.item_name) || 0) + 1)
        summaryByPool.set(wrongPool, (summaryByPool.get(wrongPool) || 0) + 1)
      }

      if (byWrongPool.size) {
        console.log('误记来源分布:')
        for (const [pool, count] of [...byWrongPool.entries()].sort((a, b) => b[1] - a[1])) {
          console.log(`  - ${pool}: ${count} 条`)
        }
      }

      if (byItem.size) {
        console.log('涉及道具:')
        for (const [item, count] of [...byItem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
          console.log(`  - ${item}: ${count} 条`)
        }
        if (byItem.size > 20) console.log(`  ... 另有 ${byItem.size - 20} 种道具`)
      }

      if (!toFix.length || scanOnly) continue

      let doFix = yes
      if (!doFix) {
        const readline = require('readline')
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        const answer = await new Promise(resolve => {
          rl.question(`是否修复 ${sv} 的 ${toFix.length} 条记录? [y/N] `, resolve)
        })
        rl.close()
        doFix = /^y(es)?$/i.test(String(answer).trim())
      }

      if (!doFix) {
        console.log(`跳过 ${sv}`)
        continue
      }

      const ids = toFix.map(doc => doc._id)
      const res = await col.updateMany(
        { _id: { $in: ids } },
        { $set: { draw_pool: TARGET_POOL } }
      )
      totalFixed += res.modifiedCount
      console.log(`已修复 ${res.modifiedCount} 条`)
    }

    console.log('\n=== 汇总 ===')
    console.log(`待修复/已识别: ${totalCandidates} 条`)
    if (!scanOnly) console.log(`已修复: ${totalFixed} 条`)
    if (summaryByPool.size) {
      console.log('误记来源合计:')
      for (const [pool, count] of [...summaryByPool.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  - ${pool}: ${count} 条`)
      }
    }
    console.log(scanOnly ? '\n扫描完成（未写入）' : '\n处理完成')
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
