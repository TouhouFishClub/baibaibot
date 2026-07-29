const assert = require('assert')
const { CORRECT_POOL, isMalformedLatestPool, repairInfo } = require('./fixLatestGachaPoolName')

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

console.log('latest gacha pool repair tests passed')
