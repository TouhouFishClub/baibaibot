const assert = require('assert')
const { canonicalAlias, planGachaInfoSpaceGroup } = require('./fixGachaInfoItemSpaces')

const spacedId = '特殊埃莉诺阿复古雅致服饰(男式) '
const cleanId = '特殊埃莉诺阿复古雅致服饰(男式)'
const poolInfo = [{ pool: '埃莉诺阿复古手帕礼包', rare: '6.13', color: 'eeffb1', rareTag: 'S' }]

assert.strictEqual(canonicalAlias(spacedId), '特殊埃莉诺阿复古雅致服饰男式')

const rename = planGachaInfoSpaceGroup(cleanId, [{
  _id: spacedId,
  alias: '特殊埃莉诺阿复古雅致服饰男式 ',
  info: poolInfo
}], null)
assert.strictEqual(rename.action, 'rename')
assert.deepStrictEqual(rename.sourceIds, [spacedId])
assert.strictEqual(rename.destinationId, cleanId)
assert.strictEqual(rename.alias, '特殊埃莉诺阿复古雅致服饰男式')
assert.strictEqual(rename.doc._id, cleanId)

const merge = planGachaInfoSpaceGroup(cleanId, [{
  _id: spacedId,
  alias: '特殊埃莉诺阿复古雅致服饰男式 ',
  info: poolInfo.concat([{ pool: '旧池', rare: '1', color: 'ffffff', rareTag: 'A' }])
}], {
  _id: cleanId,
  alias: '特殊埃莉诺阿复古雅致服饰男式',
  info: poolInfo
})
assert.strictEqual(merge.action, 'merge')
assert.strictEqual(merge.info.length, 2)
assert.strictEqual(merge.info[0].pool, '埃莉诺阿复古手帕礼包')
assert.strictEqual(merge.info[1].pool, '旧池')

const aliasOnly = planGachaInfoSpaceGroup(cleanId, [{
  _id: cleanId,
  alias: '特殊埃莉诺阿复古雅致服饰男式 ',
  info: poolInfo
}], null)
assert.deepStrictEqual(aliasOnly, {
  action: 'update-alias',
  _id: cleanId,
  alias: '特殊埃莉诺阿复古雅致服饰男式'
})

assert.strictEqual(planGachaInfoSpaceGroup(cleanId, [{
  _id: cleanId,
  alias: '特殊埃莉诺阿复古雅致服饰男式',
  info: poolInfo
}], null).action, 'skip')
assert.strictEqual(planGachaInfoSpaceGroup('   ', [{ _id: '   ', alias: ' ', info: [] }], null).action, 'skip')

console.log('gacha info item space repair tests passed')
