// Repair the malformed pool name produced by the 2026-07-29 maintenance notice.
// Default mode is read-only. Pass "yes" only after reviewing the scan output.
const { getClient } = require('../mongo/index')

const CORRECT_POOL = '\u79c1\u5bb6\u4fa6\u63a2\u624b\u5e15\u793c\u5305'
const DRAW_COLLECTIONS = ['cl_mbcd_ylx', 'cl_mbcd_yate']

function isMalformedLatestPool (pool) {
  if (!pool) return false
  const value = String(pool).trim()
  return value !== CORRECT_POOL && value.endsWith(CORRECT_POOL)
}

function repairInfo (info) {
  const repaired = []
  const seenCorrectPool = new Set()
  let changed = 0

  for (const item of Array.isArray(info) ? info : []) {
    if (!item) {
      repaired.push(item)
      continue
    }

    const malformed = isMalformedLatestPool(item.pool)
    const nextItem = malformed ? Object.assign({}, item, { pool: CORRECT_POOL }) : item
    if (malformed) changed++

    if (nextItem.pool !== CORRECT_POOL) {
      repaired.push(nextItem)
      continue
    }

    const key = [nextItem.rare, nextItem.color, nextItem.rareTag].join('\u0000')
    if (seenCorrectPool.has(key)) continue
    repaired.push(nextItem)
    seenCorrectPool.add(key)
  }

  return { repaired, changed }
}

async function main () {
  const write = process.argv.slice(2).some(arg => /^(yes|--yes)$/i.test(arg))
  const client = await getClient()
  if (!client) throw new Error('Unable to connect to MongoDB')

  const db = client.db('db_bot')
  const gachaCol = db.collection('cl_mabinogi_gacha_info')
  const cursor = gachaCol.find({ 'info.pool': { $regex: `${CORRECT_POOL}$` } })
  const fixes = []
  const badPools = new Set()

  try {
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      const result = repairInfo(doc.info)
      if (!result.changed) continue

      for (const item of doc.info || []) {
        if (item && isMalformedLatestPool(item.pool)) badPools.add(String(item.pool).trim())
      }
      fixes.push({ _id: doc._id, info: result.repaired, changed: result.changed })
    }

    console.log(`Mode: ${write ? 'write' : 'scan only'}`)
    console.log(`Correct pool: ${CORRECT_POOL}`)
    console.log(`Malformed pool variants: ${badPools.size}`)
    for (const pool of badPools) console.log(`  - ${pool}`)
    console.log(`Gacha item documents to repair: ${fixes.length}`)
    console.log(`Gacha info entries to repair: ${fixes.reduce((sum, fix) => sum + fix.changed, 0)}`)

    const badPoolList = [...badPools]
    let drawRecords = 0
    for (const colName of DRAW_COLLECTIONS) {
      const count = badPoolList.length
        ? await db.collection(colName).count({ draw_pool: { $in: badPoolList } })
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
    if (badPoolList.length) {
      for (const colName of DRAW_COLLECTIONS) {
        const result = await db.collection(colName).updateMany(
          { draw_pool: { $in: badPoolList } },
          { $set: { draw_pool: CORRECT_POOL } }
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
  CORRECT_POOL,
  isMalformedLatestPool,
  repairInfo
}
