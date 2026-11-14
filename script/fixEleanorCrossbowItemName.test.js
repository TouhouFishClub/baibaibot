const assert = require('assert')
const {
  CORRECT_NAME,
  WRONG_NAME,
  missingDrawPoolQuery,
  planItemRename
} = require('./fixEleanorCrossbowItemName')

assert.strictEqual(WRONG_NAME, '埃莉诺阿复古雅致十字弩外形咒语书')
assert.strictEqual(CORRECT_NAME, '埃莉诺阿复古雅致破坏者十字弩外形咒语书')

const info = [{ pool: '埃莉诺阿复古手帕礼包', rare: '6.13', color: 'eeffb1', rareTag: 'S' }]
const rename = planItemRename({ _id: WRONG_NAME, alias: WRONG_NAME, info }, null)
assert.strictEqual(rename.action, 'rename')
assert.strictEqual(rename.doc._id, CORRECT_NAME)
assert.strictEqual(rename.doc.alias, CORRECT_NAME)
assert.deepStrictEqual(rename.sourceId, WRONG_NAME)

const merge = planItemRename(
  { _id: WRONG_NAME, alias: WRONG_NAME, info },
  { _id: CORRECT_NAME, alias: CORRECT_NAME, info: info.concat([{ pool: '旧池', rare: '1', color: 'ffffff', rareTag: 'A' }]) }
)
assert.strictEqual(merge.action, 'merge')
assert.strictEqual(merge.info.length, 2)
assert.strictEqual(merge.info[0].pool, '埃莉诺阿复古手帕礼包')

assert.strictEqual(planItemRename(null, { _id: CORRECT_NAME, alias: CORRECT_NAME, info }).action, 'skip')
assert.strictEqual(missingDrawPoolQuery().item_name, CORRECT_NAME)

console.log('eleanor crossbow item name repair tests passed')
