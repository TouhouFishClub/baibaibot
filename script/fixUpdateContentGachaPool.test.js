const assert = require('assert')
const { isMalformedPool, normalizeMalformedPool, repairInfo } = require('./fixUpdateContentGachaPool')

const malformed = '更新内容：        - 埃莉诺阿复古手帕礼包'
assert.strictEqual(isMalformedPool(malformed), true)
assert.strictEqual(isMalformedPool('埃莉诺阿复古手帕礼包'), false)
assert.strictEqual(normalizeMalformedPool(malformed), '埃莉诺阿复古手帕礼包')

const result = repairInfo([
  { pool: malformed, rare: '5.86', color: 'eeffb1', rareTag: 'S' },
  { pool: '埃莉诺阿复古手帕礼包', rare: '5.86', color: 'eeffb1', rareTag: 'S' },
  { pool: '梦魇幻想曲手帕礼包', rare: '0.03', color: 'eeffb1', rareTag: 'S' }
])
assert.strictEqual(result.changed, 1)
assert.deepStrictEqual(result.repaired, [
  { pool: '埃莉诺阿复古手帕礼包', rare: '5.86', color: 'eeffb1', rareTag: 'S' },
  { pool: '梦魇幻想曲手帕礼包', rare: '0.03', color: 'eeffb1', rareTag: 'S' }
])

assert.deepStrictEqual(repairInfo(null), { repaired: [], changed: 0 })
assert.strictEqual(repairInfo([
  { pool: '埃莉诺阿复古手帕礼包', rare: '1', rareTag: 'A' }
]).changed, 0)

console.log('update-content gacha pool repair tests passed')
