// Repair the malformed pool and item names from the 2026-07-29 gacha update.
// Default mode is read-only. Pass "yes" only after reviewing the scan output.
const { getClient } = require('../mongo/index')

const CORRECT_POOL = '\u79c1\u5bb6\u4fa6\u63a2\u624b\u5e15\u793c\u5305'
const DRAW_COLLECTIONS = ['cl_mbcd_ylx', 'cl_mbcd_yate']
const DRAW_SINCE = new Date('2026-07-28T16:00:00.000Z')
const ITEM_NAME_CORRECTIONS = {
  '\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957': '\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957',
  '\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5939\u514b': '\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5939\u514b'
}
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const poolSuffixRegex = new RegExp(`${escapeRegex(CORRECT_POOL)}$`)

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

function itemInfoKey (item) {
  return [item.pool, item.rare, item.color, item.rareTag].join('\u0000')
}

function uniqueInfoEntries (info) {
  const seen = new Set()
  return info.filter(item => {
    const key = itemInfoKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Build an idempotent repair without mutating either MongoDB document.
function planItemNameRepair (sourceDoc, destinationDoc, correctName) {
  const sourceInfo = sourceDoc && Array.isArray(sourceDoc.info) ? sourceDoc.info.slice() : []
  const destinationInfo = destinationDoc && Array.isArray(destinationDoc.info)
    ? destinationDoc.info.slice()
    : []
  const movedInfo = sourceInfo.filter(item => item && item.pool === CORRECT_POOL)
  const repairedSourceInfo = sourceInfo.filter(item => !item || item.pool !== CORRECT_POOL)
  const historicalDestinationInfo = destinationInfo.filter(item => !item || item.pool !== CORRECT_POOL)
  const currentDestinationInfo = destinationInfo.filter(item => item && item.pool === CORRECT_POOL)
  const repairedDestinationInfo = historicalDestinationInfo.concat(
    uniqueInfoEntries(currentDestinationInfo.concat(movedInfo))
  )
  const destinationAlias = correctName.replace(/[()（）]/g, '')
  const sourceNeedsWrite = movedInfo.length > 0
  const destinationNeedsWrite = movedInfo.length > 0 || Boolean(
    destinationDoc && (
      destinationDoc.alias !== destinationAlias ||
      JSON.stringify(destinationInfo) !== JSON.stringify(repairedDestinationInfo)
    )
  )

  return {
    sourceId: sourceDoc && sourceDoc._id,
    destinationId: correctName,
    destinationAlias,
    movedInfo,
    repairedSourceInfo,
    repairedDestinationInfo,
    sourceNeedsWrite,
    destinationNeedsWrite
  }
}

function unknownDrawPoolQuery (correctNames) {
  return {
    item_name: { $in: correctNames },
    time: { $gte: DRAW_SINCE },
    $or: [
      { draw_pool: { $exists: false } },
      { draw_pool: null },
      { draw_pool: '' },
      { draw_pool: '\u672a\u77e5\u624b\u5e15' },
      { draw_pool: '\u672a\u77e5\u86cb\u6c60' }
    ]
  }
}

async function main () {
  const write = process.argv.slice(2).some(arg => /^(yes|--yes)$/i.test(arg))
  const client = await getClient()
  if (!client) throw new Error('Unable to connect to MongoDB')

  const db = client.db('db_bot')
  const gachaCol = db.collection('cl_mabinogi_gacha_info')
  const cursor = gachaCol.find({ 'info.pool': { $regex: poolSuffixRegex } })
  const fixes = []
  const badPools = new Set()
  const drawFixes = []
  const itemNameFixes = []
  const correctItemNames = Object.keys(ITEM_NAME_CORRECTIONS).map(name => ITEM_NAME_CORRECTIONS[name])
  const unknownQuery = unknownDrawPoolQuery(correctItemNames)

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

    // Scan draw collections independently. A previous/partial run may already
    // have repaired gacha_info, so it can no longer be the only source of bad
    // pool variants.
    for (const colName of DRAW_COLLECTIONS) {
      const col = db.collection(colName)
      const variants = await col.distinct('draw_pool', { draw_pool: { $regex: poolSuffixRegex } })
      const malformed = variants
        .map(pool => String(pool || '').trim())
        .filter(isMalformedLatestPool)
      for (const pool of malformed) badPools.add(pool)
      drawFixes.push({ colName, malformed })
    }

    for (const wrongName of Object.keys(ITEM_NAME_CORRECTIONS)) {
      const correctName = ITEM_NAME_CORRECTIONS[wrongName]
      const sourceDoc = await gachaCol.findOne({ _id: wrongName })
      const destinationDoc = await gachaCol.findOne({ _id: correctName })
      const normalizedSource = sourceDoc
        ? Object.assign({}, sourceDoc, { info: repairInfo(sourceDoc.info).repaired })
        : null
      const normalizedDestination = destinationDoc
        ? Object.assign({}, destinationDoc, { info: repairInfo(destinationDoc.info).repaired })
        : null
      itemNameFixes.push(planItemNameRepair(normalizedSource, normalizedDestination, correctName))
    }

    console.log(`Mode: ${write ? 'write' : 'scan only'}`)
    console.log(`Correct pool: ${CORRECT_POOL}`)
    console.log(`Malformed pool variants: ${badPools.size}`)
    for (const pool of badPools) console.log(`  - ${pool}`)
    console.log(`Gacha item documents to repair: ${fixes.length}`)
    console.log(`Gacha info entries to repair: ${fixes.reduce((sum, fix) => sum + fix.changed, 0)}`)

    for (const fix of itemNameFixes) {
      console.log(
        'Item name repair ' + (fix.sourceId || '(source missing)') + ' -> ' + fix.destinationId + ': ' +
        fix.movedInfo.length + ' current-pool entries'
      )
    }

    let drawRecords = 0
    for (const { colName, malformed } of drawFixes) {
      const count = malformed.length
        ? await db.collection(colName).count({ draw_pool: { $in: malformed } })
        : 0
      drawRecords += count
      console.log(`${colName} draw records to repair: ${count}`)
    }

    let unknownDrawRecords = 0
    for (const colName of DRAW_COLLECTIONS) {
      const count = await db.collection(colName).count(unknownQuery)
      unknownDrawRecords += count
      console.log(colName + ' unknown private-detective records to repair: ' + count)
    }

    if (!write) {
      console.log('No data was changed. Run with "yes" to apply these repairs.')
      return
    }

    for (const fix of fixes) {
      await gachaCol.updateOne({ _id: fix._id }, { $set: { info: fix.info } })
    }

    let repairedItemDocuments = 0
    for (const fix of itemNameFixes) {
      // Write the destination first. If the second write fails, rerunning is safe.
      if (fix.destinationNeedsWrite) {
        await gachaCol.updateOne(
          { _id: fix.destinationId },
          { $set: { alias: fix.destinationAlias, info: fix.repairedDestinationInfo } },
          { upsert: true }
        )
        repairedItemDocuments++
      }
      if (fix.sourceNeedsWrite) {
        await gachaCol.updateOne(
          { _id: fix.sourceId },
          { $set: { info: fix.repairedSourceInfo } }
        )
        repairedItemDocuments++
      }
    }

    let repairedDrawRecords = 0
    for (const { colName, malformed } of drawFixes) {
      if (malformed.length) {
        const result = await db.collection(colName).updateMany(
          { draw_pool: { $in: malformed } },
          { $set: { draw_pool: CORRECT_POOL } }
        )
        repairedDrawRecords += result.modifiedCount || 0
      }
    }

    let repairedUnknownDrawRecords = 0
    for (const colName of DRAW_COLLECTIONS) {
      const result = await db.collection(colName).updateMany(
        unknownQuery,
        { $set: { draw_pool: CORRECT_POOL } }
      )
      repairedUnknownDrawRecords += result.modifiedCount || 0
    }

    console.log(`Repaired gacha item documents: ${fixes.length}`)
    console.log(`Repaired draw records: ${repairedDrawRecords}/${drawRecords}`)
    console.log('Repaired wrong/correct item-name documents: ' + repairedItemDocuments)
    console.log(
      'Repaired unknown private-detective records: ' +
      repairedUnknownDrawRecords + '/' + unknownDrawRecords
    )
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
  DRAW_SINCE,
  ITEM_NAME_CORRECTIONS,
  isMalformedLatestPool,
  planItemNameRepair,
  unknownDrawPoolQuery,
  repairInfo
}
