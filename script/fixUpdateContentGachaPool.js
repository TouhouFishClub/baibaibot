// 修复公告「更新内容：」被解析进蛋池名的记录。
// 默认仅扫描；传入 yes 或 --yes 后才写入，脚本可重复执行。
const { getClient } = require('../mongo/index')
const { normalizeGachaPoolName } = require('../ai/mabinogi/gacha/parser')

const DRAW_COLLECTIONS = ['cl_mbcd_ylx', 'cl_mbcd_yate']
const MALFORMED_POOL_PATTERN = /更新内容/

function isMalformedPool (pool) {
  const value = String(pool || '')
  if (!MALFORMED_POOL_PATTERN.test(value)) return false
  const normalized = normalizeGachaPoolName(value)
  return Boolean(normalized) && normalized !== value
}

function normalizeMalformedPool (pool) {
  return normalizeGachaPoolName(pool)
}

function repairInfo (info) {
  let changed = 0
  const renamed = (Array.isArray(info) ? info : []).map(item => {
    if (!item || !isMalformedPool(item.pool)) return item
    changed++
    return Object.assign({}, item, { pool: normalizeMalformedPool(item.pool) })
  })
  const seen = new Set()
  const repaired = []
  for (const item of renamed) {
    if (!item) {
      repaired.push(item)
      continue
    }
    const key = [item.pool, item.rare, item.color, item.rareTag].join('\u0000')
    if (seen.has(key)) continue
    seen.add(key)
    repaired.push(item)
  }
  return { repaired, changed }
}

function parseWriteFlag () {
  return process.argv.slice(2).some(arg => /^(yes|--yes)$/i.test(arg))
}

async function main () {
  const write = parseWriteFlag()
  const client = await getClient()
  if (!client) throw new Error('Unable to connect to MongoDB')

  const db = client.db('db_bot')
  const gachaCol = db.collection('cl_mabinogi_gacha_info')
  const fixes = []
  const badPools = new Set()
  const drawFixes = []

  try {
    const cursor = gachaCol.find({ 'info.pool': { $regex: '更新内容' } })
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      for (const item of doc.info || []) {
        if (item && isMalformedPool(item.pool)) badPools.add(String(item.pool))
      }
      const result = repairInfo(doc.info)
      if (result.changed) fixes.push({ _id: doc._id, info: result.repaired, changed: result.changed })
    }

    for (const colName of DRAW_COLLECTIONS) {
      const col = db.collection(colName)
      const variants = await col.distinct('draw_pool', { draw_pool: { $regex: '更新内容' } })
      const malformed = variants.filter(isMalformedPool).map(pool => String(pool))
      for (const pool of malformed) badPools.add(pool)
      drawFixes.push({ colName, malformed })
    }

    console.log(`Mode: ${write ? 'write' : 'scan only'}`)
    console.log(`Malformed pool variants: ${badPools.size}`)
    for (const pool of badPools) console.log(`  - ${JSON.stringify(pool)} -> ${JSON.stringify(normalizeMalformedPool(pool))}`)
    console.log(`Gacha item documents to repair: ${fixes.length}`)
    console.log(`Gacha info entries to repair: ${fixes.reduce((sum, fix) => sum + fix.changed, 0)}`)

    let drawRecords = 0
    for (const { colName, malformed } of drawFixes) {
      const count = malformed.length
        ? await db.collection(colName).count({ draw_pool: { $in: malformed } })
        : 0
      drawRecords += count
      console.log(`${colName} draw records to repair: ${count}`)
    }

    if (!write) {
      console.log('No data was changed. Run with "yes" to apply these repairs.')
      return
    }

    for (const fix of fixes) {
      await gachaCol.updateOne({ _id: fix._id }, { $set: { info: fix.info } })
    }

    let repairedDrawRecords = 0
    for (const { colName, malformed } of drawFixes) {
      for (const pool of malformed) {
        const result = await db.collection(colName).updateMany(
          { draw_pool: pool },
          { $set: { draw_pool: normalizeMalformedPool(pool) } }
        )
        repairedDrawRecords += result.modifiedCount || 0
      }
    }

    console.log(`Repaired gacha item documents: ${fixes.length}`)
    console.log(`Repaired draw records: ${repairedDrawRecords}/${drawRecords}`)
  } finally {
    await client.close()
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = {
  DRAW_COLLECTIONS,
  isMalformedPool,
  normalizeMalformedPool,
  repairInfo
}
