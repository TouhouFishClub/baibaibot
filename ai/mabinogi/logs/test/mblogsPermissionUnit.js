const assert = require('assert')
const {
  mblogs,
  queryMblogs,
  parseMblogsInput,
  resolveRank,
  buildMblogsHelp
} = require('../mblogs')
const {
  buildHtml,
  getDpsTone,
  getDefaultCharacterName,
  ANONYMOUS_CHARACTER_NAME
} = require('../renderMblogsList')

async function run() {
  const ordinaryHelp = buildMblogsHelp()
  const adminHelp = buildMblogsHelp({ isAdmin: true })
  assert(!ordinaryHelp.includes('<场次ID>'))
  assert(!ordinaryHelp.includes('--show'))
  assert(!ordinaryHelp.includes('AI锐评'))
  assert(adminHelp.includes('<场次ID>'))
  assert(adminHelp.includes('--show all'))
  assert(adminHelp.includes('AI锐评'))

  const parsed = parseMblogsInput('布里列赫 --show all --rank 99')
  assert.strictEqual(parsed.showRequested, true)
  assert.strictEqual(parsed.showMode, 'all')
  assert.strictEqual(parsed.rank, 99)
  assert.strictEqual(resolveRank({ type: 'dungeon' }, 99, { isAdmin: false }), 30)
  assert.strictEqual(resolveRank({ type: 'dungeon' }, 99, { isAdmin: true }), 99)

  assert.deepStrictEqual(await queryMblogs('abcdef', { isAdmin: false }), { unauthorized: true })

  const callbackMessages = []
  await mblogs('--help', '123456789', message => callbackMessages.push(message), 'any-group')
  assert.strictEqual(callbackMessages.length, 1)
  const adminMessages = []
  await mblogs('--show 角色 --help', '799018865', message => adminMessages.push(message), 'any-group')
  assert.strictEqual(adminMessages.length, 1)
  const unauthorizedMessages = []
  await mblogs('--show all --help', '123456789', message => unauthorizedMessages.push(message), 'any-group')
  await mblogs('布里列赫 --job 人偶 --show 角色', '123456789', message => unauthorizedMessages.push(message), 'any-group')
  await mblogs('布里列赫 --show 不存在', '123456789', message => unauthorizedMessages.push(message), 'any-group')
  await mblogs('abcdef --help', '123456789', message => unauthorizedMessages.push(message), 'any-group')
  await mblogs('AI锐评 --help', '123456789', message => unauthorizedMessages.push(message), 'any-group')
  assert.strictEqual(unauthorizedMessages.length, 0)

  const rows = [
    {
      characterId: 'public-id',
      characterName: '公开角色名',
      characterClass: '战士',
      rankingVisibility: 'public',
      teammateNames: '队友甲、队友乙',
      dungeonName: '布里列赫',
      teamSize: 3,
      duration: 10,
      dps: 100,
      bossHp: 1000,
      totalDamage: 1000,
      damagePercent: 50,
      runId: 'abcdef12'
    },
    {
      characterId: 'anonymous-id',
      characterName: '匿名角色名',
      characterClass: '弓箭手',
      rankingVisibility: 'anonymous',
      teammateNames: '队友丙、队友丁',
      dungeonName: '布里列赫',
      teamSize: 3,
      duration: 10,
      dps: 90,
      bossHp: 1000,
      totalDamage: 900,
      damagePercent: 45,
      runId: 'abcdef13'
    },
    {
      characterId: 'optout-id',
      characterName: '不参与角色名',
      characterClass: '魔法师',
      rankingVisibility: 'optOut',
      teammateNames: '队友戊、队友己',
      dungeonName: '布里列赫',
      teamSize: 3,
      duration: 10,
      dps: 80,
      bossHp: 1000,
      totalDamage: 800,
      damagePercent: 40,
      runId: 'abcdef14'
    }
  ]

  assert.strictEqual(getDefaultCharacterName(rows[0]), '公开角色名')
  assert.strictEqual(getDefaultCharacterName(rows[1]), ANONYMOUS_CHARACTER_NAME)
  assert.strictEqual(getDefaultCharacterName(rows[2]), '')

  assert.strictEqual(getDefaultCharacterName({
    characterId: 'fallback-id',
    characterName: '',
    rankingVisibility: 'public'
  }), 'fallback-id')

  assert.strictEqual(getDpsTone(3_000_001), 'legendary')
  assert.strictEqual(getDpsTone(3_000_000), 'rainbow')
  assert.strictEqual(getDpsTone(2_000_001), 'rainbow')

  const html = buildHtml({
    title: 'DPS',
    description: 'default',
    sections: [{ rows }]
  })
  assert(html.includes('content: attr(data-text)'))
  assert(html.includes('-webkit-text-stroke: 1px #090b11'))
  assert(html.includes('color: #ff2f45'))
  assert(html.includes('color: #00f0ff'))
  assert(html.includes('公开角色名'))
  assert(html.includes(ANONYMOUS_CHARACTER_NAME))
  assert(!html.includes('public-id'))
  assert(!html.includes('匿名角色名'))
  assert(!html.includes('不参与角色名'))
  assert(!html.includes('队友甲'))
  assert(!html.includes('>队友<'))

  console.log('mblogsPermissionUnit: passed')
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
