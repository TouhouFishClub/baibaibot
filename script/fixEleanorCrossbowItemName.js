// 概率页把「埃莉诺阿复古雅致破坏者十字弩外形咒语书」写成了
// 「埃莉诺阿复古雅致十字弩外形咒语书」。把 gacha_info 改成游戏内名称，
// 并给缺 draw_pool 的抽蛋记录补上埃莉诺阿复古手帕礼包。
// 默认仅扫描；传入 yes 或 --yes 后才写入，脚本可重复执行。
const { getClient } = require('../mongo/index')
const {
  ELEANOR_RETRO_ITEM_NAME_CORRECTIONS,
  ELEANOR_RETRO_POOL
} = require('../ai/mabinogi/gacha/parser')

const DRAW_COLLECTIONS = ['cl_mbcd_ylx', 'cl_mbcd_yate']
const WRONG_NAME = Object.keys(ELEANOR_RETRO_ITEM_NAME_CORRECTIONS)[0]
const CORRECT_NAME = ELEANOR_RETRO_ITEM_NAME_CORRECTIONS[WRONG_NAME]

function infoKey (item) {
  return [item.pool, item.rare, item.color, item.rareTag].join('\u0000')
}

function uniqueInfo (info) {
  const seen = new Set()
  const repaired = []
  for (const item of Array.isArray(info) ? info : []) {
    if (!item) continue
    const key = infoKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    repaired.push(item)
  }
  return repaired
}

function missingDrawPoolQuery () {
  return {
    item_name: CORRECT_NAME,
    $or: [
      { draw_pool: { $exists: false } },
      { draw_pool: null },
      { draw_pool: '' },
      { draw_pool: '未知手帕' }
    ]
  }
}

function planItemRename (sourceDoc, destinationDoc) {
  if (!sourceDoc || sourceDoc._id === CORRECT_NAME) return { action: 'skip' }
  const alias = CORRECT_NAME.replace(/[()（）]/g, '')
  const sourceInfo = Array.isArray(sourceDoc.info) ? sourceDoc.info : []
  if (!destinationDoc) {
    return {
      action: 'rename',
      sourceId: sourceDoc._id,
      destinationId: CORRECT_NAME,
      alias,
      info: sourceInfo,
      doc: Object.assign({}, sourceDoc, { _id: CORRECT_NAME, alias, info: sourceInfo })
    }
  }
  const info = uniqueInfo([].concat(destinationDoc.info || [], sourceInfo))
  return {
    action: 'merge',
    sourceId: sourceDoc._id,
    destinationId: CORRECT_NAME,
    alias,
    info,
    destinationNeedsWrite: String(destinationDoc.alias || '') !== alias ||
      JSON.stringify(destinationDoc.info || []) !== JSON.stringify(info)
  }
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

  try {
    const sourceDoc = await gachaCol.findOne({ _id: WRONG_NAME })
    const destinationDoc = await gachaCol.findOne({ _id: CORRECT_NAME })
    const plan = planItemRename(sourceDoc, destinationDoc)
    const drawCounts = []
    for (const colName of DRAW_COLLECTIONS) {
      const count = await db.collection(colName).count(missingDrawPoolQuery())
      drawCounts.push({ colName, count })
    }

    console.log(`Mode: ${write ? 'write' : 'scan only'}`)
    console.log(`Pool: ${ELEANOR_RETRO_POOL}`)
    console.log(`Item: ${JSON.stringify(WRONG_NAME)} -> ${JSON.stringify(CORRECT_NAME)}`)
    console.log(`Gacha document action: ${plan.action}`)
    for (const { colName, count } of drawCounts) {
      console.log(`${colName} draw records to repair: ${count}`)
    }

    if (!write) {
      console.log('No data was changed. Run with "yes" to apply these repairs.')
      return
    }

    if (plan.action === 'rename') {
      await gachaCol.save(plan.doc)
      await gachaCol.remove({ _id: plan.sourceId })
    } else if (plan.action === 'merge') {
      if (plan.destinationNeedsWrite) {
        await gachaCol.updateOne(
          { _id: plan.destinationId },
          { $set: { alias: plan.alias, info: plan.info } }
        )
      }
      await gachaCol.remove({ _id: plan.sourceId })
    }

    let repairedDrawRecords = 0
    for (const { colName } of drawCounts) {
      const result = await db.collection(colName).updateMany(
        missingDrawPoolQuery(),
        { $set: { draw_pool: ELEANOR_RETRO_POOL } }
      )
      repairedDrawRecords += result.modifiedCount || 0
    }

    console.log(`Gacha document action applied: ${plan.action}`)
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
  CORRECT_NAME,
  DRAW_COLLECTIONS,
  ELEANOR_RETRO_POOL,
  WRONG_NAME,
  missingDrawPoolQuery,
  planItemRename
}
