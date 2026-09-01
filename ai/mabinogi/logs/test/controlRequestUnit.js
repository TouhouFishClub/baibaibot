const assert = require('assert')
const {
  getControlRequestBody,
  getRankingConsentPlayerName,
  consentServerId,
  getRankingNameRefreshes
} = require('../handler')
const {
  isRankingConsentClientVersionBlocked,
  isRankingConsentPlayerIdAllowed,
  upsertRankingConsent
} = require('../db')

const getBody = getControlRequestBody({ method: 'GET', body: {} })
assert(Buffer.isBuffer(getBody))
assert.strictEqual(getBody.length, 0)

const rawBody = Buffer.from('{"mode":"public"}')
const putBody = getControlRequestBody({ method: 'PUT', body: { mode: 'public' }, rawBody })
assert.strictEqual(putBody, rawBody)

const playerName = '\u4e2d\u6587\u89d2\u8272'
const mojibakeHeader = Buffer.from(playerName, 'utf8').toString('latin1')
assert.strictEqual(getRankingConsentPlayerName({
  body: { playerName },
  headers: { 'x-player-name': mojibakeHeader }
}), playerName)
assert.strictEqual(consentServerId('亚特'), 'yate')
assert.strictEqual(consentServerId('yiluxia'), 'yiluxia')
assert.strictEqual(consentServerId('unknown'), '')
assert.strictEqual(isRankingConsentClientVersionBlocked('2.7.1'), true)
assert.strictEqual(isRankingConsentClientVersionBlocked(' 2.7.1 '), true)
assert.strictEqual(isRankingConsentClientVersionBlocked('2.7.10'), false)
assert.strictEqual(isRankingConsentClientVersionBlocked('2.7.2'), false)
assert.strictEqual(isRankingConsentPlayerIdAllowed('4503599631735307'), true)
assert.strictEqual(isRankingConsentPlayerIdAllowed('4767482444036715'), false)
assert.strictEqual(isRankingConsentPlayerIdAllowed('4503599631735307x'), false)

const nameRefreshes = getRankingNameRefreshes({
  targets: [{
    attackers: [
      { isPC: true, id: '100', name: '改名后的角色' },
      { isPC: true, id: '200', name: '' },
      { isPC: false, id: '300', name: '非玩家' }
    ]
  }]
})
assert.deepStrictEqual(nameRefreshes, [{ id: '100', name: '改名后的角色' }])

upsertRankingConsent({
  playerId: '123',
  mode: 'public',
  playerName: 'blocked-version-name',
  serverId: 'yate',
  clientVersion: '2.7.1'
}).then(result => {
  assert.strictEqual(result.ignored, true)
  assert.strictEqual(result.updatedAt, null)
  return upsertRankingConsent({
    playerId: '4767482444036715',
    mode: 'public',
    playerName: 'invalid-pet-name',
    clientVersion: '2.7.5'
  })
}).then(result => {
  assert.strictEqual(result.ignored, true)
  assert.strictEqual(result.ignoredReason, 'blocked_player_id_prefix')
  console.log('controlRequestUnit: passed')
}).catch(error => {
  console.error(error)
  process.exitCode = 1
})
