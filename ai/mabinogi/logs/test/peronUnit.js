const assert = require('assert')
const {
  matchesDungeonName, resolveBossQuery, resolveQueryType,
  matchBossTarget, isBossKillCompleted, isCompletePeronKill, matchBossByHp, isPetakCombinedKillCompleted
} = require('../bossConfig')
const { validateSemantic } = require('../validate')
const { buildDpsRecords, getKilledTargetsForRun } = require('../records')
const { buildSkillBreakdownForRecord } = require('../skillBreakdown')

function target() {
  const now = Math.floor(Date.now() / 10)
  return {
    targetId: 'peron-kill', targetName: '佩隆 #0411',
    totalDamage: 1_800_000_000, duration: 500,
    appearedAt: now - 50_000, cleanedAt: now, deathTime: now - 1,
    bossHP: {
      maxHp: 1_800_000_000, raceId: 193810,
      history: [{ currentHp: 1_800_000_128 }, { currentHp: 0 }]
    },
    attackers: [{
      id: '12345', name: '测试角色', isPC: true, totalDamage: 1_800_000_000,
      skillsDetail: [{ skillName: '击杀技能', totalDamage: 1_800_000_000 }]
    }]
  }
}

assert(matchesDungeonName('深渊之科隆巴斯'))
assert(!matchesDungeonName('科隆巴斯'))
assert.strictEqual(resolveQueryType('深渊之科隆巴斯').type, 'dungeon')
assert.strictEqual(resolveQueryType('佩隆').type, 'boss')
assert.strictEqual(resolveBossQuery('佩隆').groupKey, 'peron')
assert.strictEqual(resolveBossQuery('千猫').groupKey, 'peron')
for (const name of ['千猫', '深渊猫', '深渊科隆巴斯']) {
  const query = resolveQueryType(name)
  assert.strictEqual(query.type, 'dungeon', name)
  assert.strictEqual(query.dungeon.name, '深渊之科隆巴斯', name)
}
assert.strictEqual(resolveQueryType('布本').type, 'dungeon')
assert.strictEqual(resolveQueryType('布本').dungeon.name, '布里列赫')

const variants = [
  ['complete', () => {}, true],
  ['trimmed history', t => { t.bossHP.history.shift() }, true],
  ['wipe near kill', t => { t.totalDamage = 1_795_000_000; delete t.deathTime }, false],
  ['partial kill', t => { t.totalDamage = 1_600_000_000 }, false],
  ['HP not zero', t => { t.bossHP.history[1].currentHp = 1 }, false],
  ['missing history', t => { delete t.bossHP.history }, false],
  ['phantom name', t => { t.targetName = '佩隆的幻影 #0411' }, false],
  ['wrong race', t => { t.bossHP.raceId = 193813 }, false],
  ['normal boss HP', t => { t.bossHP.maxHp = 300_000_000; t.totalDamage = 300_000_000 }, false]
]
for (const [label, change, eligible] of variants) {
  const t = target()
  change(t)
  assert.strictEqual(isCompletePeronKill(t), eligible, label)
  assert.strictEqual(validateSemantic({ targets: [t] }, '深渊之科隆巴斯').ok, eligible, label)
  const records = buildDpsRecords({
    runId: 'test-run', dungeonName: '深渊之科隆巴斯', uploadedAt: new Date(), data: { targets: [t] }
  })
  assert.strictEqual(records.length, eligible ? 1 : 0, label)
  if (eligible) {
    assert.strictEqual(records[0].bossGroup, 'peron')
    assert.strictEqual(records[0].bossHp, 1_800_000_000)
    assert.strictEqual(records[0].dps, 3_600_000)
  }
}
const complete = target()
assert(isBossKillCompleted(complete))
assert.strictEqual(matchBossTarget(complete).key, 'peron')
const wipe = target()
wipe.targetId = 'wipe'
delete wipe.deathTime
wipe.attackers[0].skillsDetail = [{ skillName: '团灭技能', totalDamage: 1_800_000_000 }]
const other = { ...target(), targetName: '布隆塔纳斯', totalDamage: 1_143_400_000,
  bossHP: { maxHp: 1_143_400_000 } }
const data = { targets: [wipe, other, complete] }
const records = buildDpsRecords({ runId: 'mixed', dungeonName: '深渊之科隆巴斯', uploadedAt: new Date(), data })
assert.strictEqual(records.length, 1)
assert.strictEqual(records[0].bossGroup, 'peron')
assert.deepStrictEqual(getKilledTargetsForRun([wipe, complete]), [complete])
const skills = buildSkillBreakdownForRecord(data, records[0])
assert.strictEqual(skills.length, 1)
assert.strictEqual(skills[0].name, '击杀技能')
// 布里列赫原有击杀与佩塔克双阶段规则保持有效。
assert.strictEqual(buildDpsRecords({ runId: 'bri', dungeonName: '布里列赫', uploadedAt: new Date(), data: { targets: [other] } }).length, 1)
const p1 = { bossHP: { maxHp: 698_516_992 }, totalDamage: 698_516_992 / 2 }
const p2 = { bossHP: { maxHp: 850_368_576 }, totalDamage: 850_368_576 / 2 }
assert(isPetakCombinedKillCompleted([p1, p2].map(t => ({ boss: matchBossByHp(t.bossHP.maxHp), target: t }))))
assert(!isBossKillCompleted(p1))
console.log('peronUnit: ok')
