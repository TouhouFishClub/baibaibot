// ai/mabinogi/Television/fillUnknownDrawPool.js
const { getClient } = require('../../../mongo/index')

function normalizeItemNameForAlias (itemName) {
  if (!itemName) return ''
  // 去掉中英文括号字符本身，便于用 alias 精确匹配
  return String(itemName).replace(/[()（）]/g, '')
}

function getPoolFromGachaInfoDoc (gachaInfo) {
  if (!gachaInfo || !Array.isArray(gachaInfo.info) || !gachaInfo.info.length) return null
  const lastInfo = gachaInfo.info[gachaInfo.info.length - 1]
  const pool = lastInfo && lastInfo.pool
  return pool && String(pool).trim() ? String(pool).trim() : null
}

/**
 * 使用方式：
 *   node ai/mabinogi/Television/fillUnknownDrawPool.js          // 默认 1 天内
 *   node ai/mabinogi/Television/fillUnknownDrawPool.js 3        // 近 3 天内
 */
async function main () {
  const days = Number(process.argv[2] || '1')
  if (Number.isNaN(days) || days <= 0) {
    console.error('时间范围(days) 必须是大于 0 的数字')
    process.exit(1)
  }

  const msRange = days * 24 * 60 * 60 * 1000
  const sinceTs = Date.now() - msRange

  const client = await getClient()
  const db = client.db('db_bot')
  const gachaCol = db.collection('cl_mabinogi_gacha_info')

  // 目前支持的服务器集合
  const servers = ['ylx', 'yate']  // 如果以后有更多服，在这里加

  for (const sv of servers) {
    const colName = `cl_mbcd_${sv}`
    const col = db.collection(colName)

    console.log(`\n=== 处理服: ${sv} (${colName}) ===`)
    const queryUnknown = {
      ts: { $gte: sinceTs },
      $or: [
        { draw_pool: { $exists: false } },
        { draw_pool: null },
        { draw_pool: '' },
        { draw_pool: '未知手帕' }
      ]
    }

    const totalUnknown = await col.count(queryUnknown)
    console.log(`待回填未知手帕记录数: ${totalUnknown}`)

    if (!totalUnknown) continue

    // 逐条处理，实际可按批量优化
    const cursor = col.find(queryUnknown)

    let fixedCount = 0
    let skipCount = 0

    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      const { item_name } = doc

      if (!item_name) {
        skipCount++
        continue
      }

      const aliasKey = normalizeItemNameForAlias(item_name)
      if (!aliasKey) {
        skipCount++
        continue
      }

      const gachaInfo = await gachaCol.findOne({ alias: aliasKey })
      const pool = getPoolFromGachaInfoDoc(gachaInfo)
      if (!pool) {
        skipCount++
        continue
      }

      // 批量回填：同 item_name、同时间窗口内所有未知手帕
      const bulkQuery = {
        ts: { $gte: sinceTs },
        $or: [
          { draw_pool: { $exists: false } },
          { draw_pool: null },
          { draw_pool: '' },
          { draw_pool: '未知手帕' }
        ],
        item_name
      }

      const res = await col.updateMany(
        bulkQuery,
        { $set: { draw_pool: pool } }
      )

      fixedCount += res.modifiedCount

      console.log(
        `[${sv}] item="${item_name}" (alias="${aliasKey}") 回填手帕="${pool}"，修改 ${res.modifiedCount} 条`
      )
    }

    console.log(`服 ${sv} 回填完成: 修正 ${fixedCount} 条, 跳过 ${skipCount} 条`)
  }

  await client.close()
  console.log('\n全部完成')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})