const assert = require('assert')
const queries = []
const rowsByGroup = {}
const mongoPath = require.resolve('../../../../mongo/index')
const collection = {
  createIndex: async () => {},
  find(query) {
    const call = { query, limit: null, hint: null }
    queries.push(call)
    return {
      sort() { return this },
      limit(n) { call.limit = n; return this },
      hint(index) { call.hint = index; return this },
      async toArray() {
        let rows = (rowsByGroup[query.bossGroup] || []).slice()
        rows.sort((a, b) => b.dps - a.dps)
        if (query.dps && query.dps.$lt != null) {
          rows = rows.filter(row => row.dps < query.dps.$lt)
        }
        return call.limit == null ? rows : rows.slice(0, call.limit)
      }
    }
  }
}
require.cache[mongoPath] = { id: mongoPath, filename: mongoPath, loaded: true, exports: {
  getClient: async () => ({ db: () => ({ collection: () => collection }) })
} }
const { listRecordsByCharacter, listRecordsByDungeon, listRecordsByBossGroups } = require('../db')

async function run() {
  const options = { bossGroup: 'peron', characterIds: ['12345'], characterClass: '流星射手' }
  await listRecordsByCharacter('测试角色', 3, options)
  await listRecordsByDungeon('深渊之科隆巴斯', 10, options)

  assert(queries[0].query.characterName.test('测试角色'))
  assert.strictEqual(queries[0].limit, 500)
  assert.deepStrictEqual(queries[0].query.$and, [{
    $or: [{ bossGroup: 'peron' }, { bossKey: { $in: ['peron'] } }]
  }])
  assert.deepStrictEqual(queries[0].query.characterId, { $in: ['12345'] })
  assert.strictEqual(queries[0].query.characterClass, '流星射手')

  assert.strictEqual(queries.length, 2)
  assert.strictEqual(queries[1].query.dungeonName, '深渊之科隆巴斯')
  assert.strictEqual(queries[1].query.bossGroup, 'peron')
  assert.strictEqual(queries[1].query.$and, undefined)
  assert.deepStrictEqual(queries[1].query.characterId, { $in: ['12345'] })
  assert.strictEqual(queries[1].query.characterClass, '流星射手')
  assert.strictEqual(queries[1].limit, 100)
  assert.strictEqual(queries[1].hint, 'dungeon_bossGroup_dps')

  const before = queries.length
  await listRecordsByDungeon('布里列赫', 10)
  const dungeonQueries = queries.slice(before)
  assert.deepStrictEqual(dungeonQueries.map(call => call.query.bossGroup), [
    'petak', 'brontanas', 'mayer', 'mayer_regret', 'peron'
  ])
  for (const call of dungeonQueries) {
    assert.strictEqual(call.query.dungeonName, '布里列赫')
    assert.strictEqual(call.query.$and, undefined)
    assert.strictEqual(call.limit, 100)
    assert.strictEqual(call.hint, 'dungeon_bossGroup_dps')
  }

  rowsByGroup.petak = [
    { characterId: 'a', characterName: '低伤甲', bossGroup: 'petak', bossKey: 'petak', bossName: '枯木之佩塔克', dps: 1_000_000 },
    { characterId: 'a', characterName: '低伤甲', bossGroup: 'petak', bossKey: 'petak', bossName: '枯木之佩塔克', dps: 800_000 },
    { characterId: 'b', characterName: '低伤乙', bossGroup: 'petak', bossKey: 'petak', bossName: '枯木之佩塔克', dps: 900_000 }
  ]
  rowsByGroup.mayer = Array.from({ length: 30 }, (_, index) => ({
    characterId: 'high',
    characterName: '高伤',
    bossGroup: 'mayer',
    bossKey: 'mayer',
    bossName: '雷内恩的米耶尔',
    dps: 5_000_000 - index
  }))
  const groups = await listRecordsByDungeon('布里列赫', 10)
  assert.strictEqual(groups[0].bossKey, 'petak')
  assert.deepStrictEqual(groups[0].records.map(row => [row.characterId, row.dps]), [
    ['a', 1_000_000],
    ['b', 900_000]
  ])
  assert.strictEqual(groups.find(group => group.bossKey === 'mayer').records.length, 1)

  rowsByGroup.petak = [
    ...Array.from({ length: 350 }, (_, index) => ({
      characterId: 'farmer',
      characterName: '农场主',
      bossGroup: 'petak',
      bossKey: 'petak',
      bossName: '枯木之佩塔克',
      dps: 9_000_000 - index
    })),
    ...Array.from({ length: 9 }, (_, index) => ({
      characterId: `p${index}`,
      characterName: `玩家${index}`,
      bossGroup: 'petak',
      bossKey: 'petak',
      bossName: '枯木之佩塔克',
      dps: 1_000_000 - index
    }))
  ]
  const farmerAt = queries.length
  const dominated = await listRecordsByDungeon('布里列赫', 10, { bossGroup: 'petak' })
  assert.strictEqual(dominated[0].records.length, 10)
  assert.strictEqual(dominated[0].records[0].characterId, 'farmer')
  assert.deepStrictEqual(
    dominated[0].records.slice(1).map(row => row.characterId),
    ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
  )
  const farmerPages = queries.slice(farmerAt)
  assert.strictEqual(farmerPages.length, 4)
  assert.strictEqual(farmerPages[1].query.dps.$lt, 9_000_000 - 99)

  const allMode = queries.length
  await listRecordsByDungeon('布里列赫', 10, { bestPerCharacter: false, bossGroup: 'petak' })
  assert.strictEqual(queries.length, allMode + 1)
  assert.strictEqual(queries.at(-1).query.bossGroup, 'petak')
  assert.strictEqual(queries.at(-1).limit, 10)

  const boardAt = queries.length
  rowsByGroup.mayer = [{
    characterId: 'a', characterName: '三王玩家', bossGroup: 'mayer', bossKey: 'mayer',
    bossName: '雷内恩的米耶尔', dps: 3_000_000
  }]
  rowsByGroup.peron = [{
    characterId: 'b', characterName: '千猫玩家', bossGroup: 'peron', bossKey: 'peron',
    bossName: '佩隆', dps: 4_000_000
  }]
  const board = await listRecordsByBossGroups(['mayer', 'mayer_regret', 'peron'], 10)
  assert.deepStrictEqual(board.map(section => section.bossKey), ['mayer', 'peron'])
  const boardCalls = queries.slice(boardAt)
  assert.deepStrictEqual(boardCalls.map(call => call.query.bossGroup), ['mayer', 'mayer_regret', 'peron'])
  for (const call of boardCalls) {
    assert.strictEqual(call.query.dungeonName, undefined)
    assert.strictEqual(call.hint, 'bossGroup_dps')
  }

  console.log('dbBossFilterUnit: ok')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
