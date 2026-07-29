const assert = require('assert')
const {
  CORRECT_POOL,
  DRAW_SINCE,
  ITEM_NAME_CORRECTIONS,
  isMalformedLatestPool,
  planItemNameRepair,
  repairInfo,
  unknownDrawPoolQuery
} = require('./fixLatestGachaPoolName')

const badPool = `13:00 maintenance text - ${CORRECT_POOL}`
assert.strictEqual(isMalformedLatestPool(badPool), true)
assert.strictEqual(isMalformedLatestPool(CORRECT_POOL), false)

const result = repairInfo([
  { pool: badPool, rare: '5.86', color: 'eeffb1', rareTag: 'S' },
  { pool: CORRECT_POOL, rare: '5.86', color: 'eeffb1', rareTag: 'S' },
  { pool: 'older pool', rare: '1', color: 'fff', rareTag: 'A' }
])
assert.strictEqual(result.changed, 1)
assert.deepStrictEqual(result.repaired, [
  { pool: CORRECT_POOL, rare: '5.86', color: 'eeffb1', rareTag: 'S' },
  { pool: 'older pool', rare: '1', color: 'fff', rareTag: 'A' }
])

const wrongName = Object.keys(ITEM_NAME_CORRECTIONS)[0]
const correctName = ITEM_NAME_CORRECTIONS[wrongName]
const oldSourceInfo = { pool: 'historical dark pool', rare: '1', color: '111', rareTag: 'A' }
const oldDestinationInfo = { pool: 'historical pure pool', rare: '2', color: '222', rareTag: 'B' }
const currentInfo = { pool: CORRECT_POOL, rare: '5.86', color: 'eeffb1', rareTag: 'S' }
const itemRepair = planItemNameRepair(
  { _id: wrongName, alias: wrongName, info: [oldSourceInfo, currentInfo] },
  { _id: correctName, alias: 'stale alias', info: [oldDestinationInfo, currentInfo] },
  correctName
)
assert.deepStrictEqual(itemRepair.repairedSourceInfo, [oldSourceInfo])
assert.deepStrictEqual(itemRepair.repairedDestinationInfo, [oldDestinationInfo, currentInfo])
assert.strictEqual(itemRepair.repairedDestinationInfo[itemRepair.repairedDestinationInfo.length - 1].pool, CORRECT_POOL)
assert.strictEqual(itemRepair.destinationAlias, correctName)
assert.strictEqual(itemRepair.sourceNeedsWrite, true)
assert.strictEqual(itemRepair.destinationNeedsWrite, true)

const missingDestinationRepair = planItemNameRepair(
  { _id: wrongName, alias: wrongName, info: [oldSourceInfo, currentInfo] },
  null,
  correctName
)
assert.deepStrictEqual(missingDestinationRepair.repairedDestinationInfo, [currentInfo])
assert.strictEqual(missingDestinationRepair.destinationNeedsWrite, true)

const rerun = planItemNameRepair(
  { _id: wrongName, alias: wrongName, info: itemRepair.repairedSourceInfo },
  { _id: correctName, alias: correctName, info: itemRepair.repairedDestinationInfo },
  correctName
)
assert.strictEqual(rerun.sourceNeedsWrite, false)
assert.strictEqual(rerun.destinationNeedsWrite, false)

const unknownQuery = unknownDrawPoolQuery(Object.values(ITEM_NAME_CORRECTIONS))
assert.deepStrictEqual(unknownQuery.item_name.$in, Object.values(ITEM_NAME_CORRECTIONS))
assert.strictEqual(unknownQuery.time.$gte, DRAW_SINCE)
assert.deepStrictEqual(unknownQuery.$or, [
  { draw_pool: { $exists: false } },
  { draw_pool: null },
  { draw_pool: '' },
  { draw_pool: '\u672a\u77e5\u624b\u5e15' },
  { draw_pool: '\u672a\u77e5\u86cb\u6c60' }
])

console.log('latest gacha pool repair tests passed')
