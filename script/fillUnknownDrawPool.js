// 用法见 script/README.md
const { getClient } = require('../mongo/index')

function normalizeItemNameForAlias (itemName) {
  if (!itemName) return ''
  return String(itemName).replace(/[()（）]/g, '')
}

function getPoolFromGachaInfoDoc (gachaInfo) {
  if (!gachaInfo || !Array.isArray(gachaInfo.info) || !gachaInfo.info.length) return null
  const lastInfo = gachaInfo.info[gachaInfo.info.length - 1]
  const pool = lastInfo && lastInfo.pool
  return pool && String(pool).trim() ? String(pool).trim() : null
}

/** 先 alias，再 _id 精确匹配（兼容未写入 alias 的旧 gacha 文档） */
async function findGachaInfoByItemName (gachaCol, itemName, aliasKey) {
  let gachaInfo = await gachaCol.findOne({ alias: aliasKey })
  if (gachaInfo) return gachaInfo
  if (itemName && itemName !== aliasKey) {
    gachaInfo = await gachaCol.findOne({ _id: itemName })
    if (gachaInfo) return gachaInfo
  }
  return gachaCol.findOne({ _id: aliasKey })
}

function parseCli () {
  const argv = process.argv.slice(2)
  const scanOnly = argv.includes('scan') || argv.includes('--scan-only')
  const daysArg = argv.find((a) => /^\d+$/.test(a))
  const days = Number(daysArg || '1')
  return { scanOnly, days }
}

async function main () {
  const { scanOnly, days } = parseCli()
  if (Number.isNaN(days) || days <= 0) {
    console.error('时间范围(days) 必须是大于 0 的数字，例如: node script/fillUnknownDrawPool.js 30')
    process.exit(1)
  }

  const msRange = days * 24 * 60 * 60 * 1000
  const sinceTs = Date.now() - msRange

  const client = await getClient()
  if (!client) {
    console.error('无法连接 MongoDB，请检查网络与 baibaiConfigs 中的 mongourl')
    process.exit(1)
  }
  const db = client.db('db_bot')
  const gachaCol = db.collection('cl_mabinogi_gacha_info')

  const servers = ['ylx', 'yate']

  try {
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

      const cursor = col.find(queryUnknown)

      let fixedCount = 0
      let skipCount = 0
      const skipStats = {
        no_item_name: 0,
        gacha_not_found: new Map(),
        no_pool: new Map()
      }
      const processedItems = new Set()

      while (await cursor.hasNext()) {
        const doc = await cursor.next()
        const { item_name } = doc

        if (!item_name) {
          skipCount++
          skipStats.no_item_name++
          continue
        }

        const aliasKey = normalizeItemNameForAlias(item_name)
        if (!aliasKey) {
          skipCount++
          skipStats.no_item_name++
          continue
        }

        const gachaInfo = await findGachaInfoByItemName(gachaCol, item_name, aliasKey)
        const pool = getPoolFromGachaInfoDoc(gachaInfo)
        if (!pool) {
          skipCount++
          const reasonMap = gachaInfo ? skipStats.no_pool : skipStats.gacha_not_found
          reasonMap.set(item_name, (reasonMap.get(item_name) || 0) + 1)
          continue
        }

        if (scanOnly) {
          if (!processedItems.has(item_name)) {
            processedItems.add(item_name)
            console.log(
              `[scan][${sv}] item="${item_name}" (alias="${aliasKey}") 可回填手帕="${pool}"`
            )
          }
          continue
        }

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

      if (scanOnly) {
        console.log(`服 ${sv} 扫描完成: 可回填 ${processedItems.size} 种道具, 跳过 ${skipCount} 条`)
      } else {
        console.log(`服 ${sv} 回填完成: 修正 ${fixedCount} 条, 跳过 ${skipCount} 条`)
      }

      const printSkipGroup = (label, map) => {
        if (!map.size) return
        console.log(`  ${label} (${[...map.values()].reduce((a, b) => a + b, 0)} 条, ${map.size} 种道具):`)
        const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
        for (const [name, count] of sorted.slice(0, 15)) {
          console.log(`    - ${name} (${count} 条)`)
        }
        if (sorted.length > 15) {
          console.log(`    ... 另有 ${sorted.length - 15} 种道具`)
        }
      }

      if (skipCount) {
        printSkipGroup('gacha 表无匹配', skipStats.gacha_not_found)
        printSkipGroup('gacha 有记录但无 pool', skipStats.no_pool)
        if (skipStats.no_item_name) {
          console.log(`  缺少 item_name: ${skipStats.no_item_name} 条`)
        }
      }
    }

    console.log(scanOnly ? '\n扫描完成（未写入）' : '\n全部完成')
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
