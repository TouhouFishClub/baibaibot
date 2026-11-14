const assert = require('assert')
const queries = []
const mongoPath = require.resolve('../../../../mongo/index')
const collection = {
  createIndex: async () => {},
  find(query) {
    queries.push(query)
    return { sort() { return this }, limit() { return this }, async toArray() { return [] } }
  }
}
require.cache[mongoPath] = { id: mongoPath, filename: mongoPath, loaded: true, exports: {
  getClient: async () => ({ db: () => ({ collection: () => collection }) })
} }
const { listRecordsByCharacter, listRecordsByDungeon } = require('../db')

async function run() {
  const options = { bossGroup: 'peron', characterIds: ['12345'], characterClass: '流星射手' }
  await listRecordsByCharacter('测试角色', 3, options)
  await listRecordsByDungeon('深渊之科隆巴斯', 10, options)
  assert(queries[0].characterName.test('测试角色'))
  assert(queries[1].dungeonName.test('深渊之科隆巴斯'))
  for (const query of queries) {
    assert.deepStrictEqual(query.$and, [{ $or: [{ bossGroup: 'peron' }, { bossKey: { $in: ['peron'] } }] }])
    assert.deepStrictEqual(query.characterId, { $in: ['12345'] })
    assert.strictEqual(query.characterClass, '流星射手')
  }
  await listRecordsByDungeon('布里列赫', 10)
  assert.strictEqual(queries.at(-1).$and, undefined)
  console.log('dbBossFilterUnit: ok')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
