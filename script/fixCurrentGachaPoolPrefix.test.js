const assert = require('assert')
const { MALFORMED_POOLS, TARGET_POOLS, repairInfo } = require('./fixCurrentGachaPoolPrefix')

assert.deepStrictEqual(MALFORMED_POOLS, ['新增沧澜海韵手帕礼包', '新增神秘手帕礼包'])
assert.deepStrictEqual(TARGET_POOLS, ['沧澜海韵手帕礼包', '神秘手帕礼包'])

const result = repairInfo([
  { pool: '新增沧澜海韵手帕礼包', rare: '5.86', rareTag: 'S' },
  { pool: '神秘手帕礼包', rare: '0.03', rareTag: 'S' },
  { pool: 'older pool', rare: '1', rareTag: 'A' }
])
assert.strictEqual(result.changed, 1)
assert.deepStrictEqual(result.repaired, [
  { pool: '沧澜海韵手帕礼包', rare: '5.86', rareTag: 'S' },
  { pool: '神秘手帕礼包', rare: '0.03', rareTag: 'S' },
  { pool: 'older pool', rare: '1', rareTag: 'A' }
])

assert.deepStrictEqual(repairInfo(null), { repaired: [], changed: 0 })

console.log('current gacha pool prefix repair tests passed')
