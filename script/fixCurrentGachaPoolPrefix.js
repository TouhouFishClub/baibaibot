// 修复 2026-08-12 公告中的“新增”前缀污染。
// 默认仅扫描；传入 yes 或 --yes 后才写入，脚本可重复执行。
const { getClient } = require('../mongo/index')

const DRAW_COLLECTIONS = ['cl_mbcd_ylx', 'cl_mbcd_yate']
const TARGET_POOLS = ['沧澜海韵手帕礼包', '神秘手帕礼包']
const PREFIX = '新增'
const MALFORMED_POOLS = TARGET_POOLS.map(pool => PREFIX + pool)

function repairInfo (info) {
  let changed = 0
  const repaired = (Array.isArray(info) ? info : []).map(item => {
    if (!item || !MALFORMED_POOLS.includes(String(item.pool || '').trim())) return item
    changed++
    return Object.assign({}, item, { pool: String(item.pool).trim().replace(/^新增/, '') })
  })
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
  const drawFixes = []

  try {
    const cursor = gachaCol.find({ 'info.pool': { $in: MALFORMED_POOLS } })
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      const result = repairInfo(doc.info)
      if (result.changed) fixes.push({ _id: doc._id, info: result.repaired, changed: result.changed })
    }

    for (const colName of DRAW_COLLECTIONS) {
      const col = db.collection(colName)
      const count = await col.count({ draw_pool: { $in: MALFORMED_POOLS } })
      drawFixes.push({ colName, count })
    }

    console.log(`Mode: ${write ? 'write' : 'scan only'}`)
    console.log(`Pool prefix: ${PREFIX}`)
    console.log(`Gacha item documents to repair: ${fixes.length}`)
    console.log(`Gacha info entries to repair: ${fixes.reduce((sum, fix) => sum + fix.changed, 0)}`)
    for (const fix of drawFixes) console.log(`${fix.colName} draw records to repair: ${fix.count}`)

    if (!write) {
      console.log('No data was changed. Run with "yes" to apply these repairs.')
      return
    }

    for (const fix of fixes) {
      await gachaCol.updateOne({ _id: fix._id }, { $set: { info: fix.info } })
    }

    let repairedDrawRecords = 0
    for (const { colName } of drawFixes) {
      for (let i = 0; i < MALFORMED_POOLS.length; i++) {
        const result = await db.collection(colName).updateMany(
          { draw_pool: MALFORMED_POOLS[i] },
          { $set: { draw_pool: TARGET_POOLS[i] } }
        )
        repairedDrawRecords += result.modifiedCount || 0
      }
    }

    console.log(`Repaired gacha item documents: ${fixes.length}`)
    console.log(`Repaired draw records: ${repairedDrawRecords}`)
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
  MALFORMED_POOLS,
  TARGET_POOLS,
  repairInfo
}
