const assert = require('assert')
const calls = []
const row = {
  characterId: '12345', characterName: '测试角色', bossKey: 'peron', bossGroup: 'peron',
  bossName: '佩隆', dungeonName: '深渊之科隆巴斯', dps: 3_600_000, runId: 'test', uploaderName: '测试'
}
// 查询测试不连接实际数据库，也不修改排行参与状态。
const dbPath = require.resolve('../db')
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  listRecordsByCharacter: async (...args) => { calls.push(['character', ...args]); return [{ bossName: '佩隆', records: [row] }] },
  listRecordsByDungeon: async (...args) => { calls.push(['dungeon', ...args]); return [{ bossName: '佩隆', records: [row] }] },
  listRecordsByBoss: async (...args) => { calls.push(['boss', ...args]); return [row] },
  listConsentedPlayerIds: async () => ['12345'],
  getRankingConsentsByPlayerIds: async () => new Map([['12345', { mode: 'public' }]]),
  getUploadersByRunIds: async () => new Map(),
  normalizeRunId: value => value
} }
const { parseMblogsInput, queryMblogs, buildMblogsHelp } = require('../mblogs')

async function run() {
  for (const name of ['佩隆', '千猫']) {
    const parsed = parseMblogsInput(`--boss ${name} --rank 15 --job 流子`)
    assert.strictEqual(parsed.keyword, '')
    assert.strictEqual(parsed.boss, name)
    assert.strictEqual(parsed.rank, 15)
    const result = await queryMblogs(parsed.keyword, parsed)
    assert.strictEqual(result.mode, 'boss')
    assert.strictEqual(calls.at(-1)[1], 'peron')
    assert.strictEqual(calls.at(-1)[2], 15)
  }
  for (const [keyword, type] of [['测试角色', 'character'], ['深渊之科隆巴斯', 'dungeon']]) {
    const parsed = parseMblogsInput(`${keyword} --boss 千猫 --withskill --all`)
    assert.strictEqual(parsed.keyword, keyword)
    assert.strictEqual(parsed.boss, '千猫')
    assert.strictEqual(parsed.withSkill, true)
    assert.strictEqual(parsed.showAll, true)
    const result = await queryMblogs(keyword, { boss: parsed.boss, showAll: true })
    assert.strictEqual(result.mode, type)
    assert(result.title.includes('佩隆'))
    const call = calls.at(-1)
    assert.strictEqual(call[0], type)
    assert.strictEqual(call[3].bossGroup, 'peron')
    assert.strictEqual(call[3].bestPerCharacter, false)
  }
  const count = calls.length
  assert((await queryMblogs('', { boss: '不存在' })).error.includes('--boss'))
  assert((await queryMblogs('', { boss: '' })).error.includes('--boss'))
  assert((await queryMblogs('布隆塔纳斯', { boss: '佩隆' })).error.includes('不一致'))
  assert.strictEqual(calls.length, count)
  assert(buildMblogsHelp().includes('--boss 佩隆'))
  assert(buildMblogsHelp().includes('千猫'))
  console.log('mblogsBossUnit: ok')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
