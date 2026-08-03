const assert = require('assert')
const { getControlRequestBody, getRankingNameRefreshes } = require('../handler')

const getBody = getControlRequestBody({ method: 'GET', body: {} })
assert(Buffer.isBuffer(getBody))
assert.strictEqual(getBody.length, 0)

const rawBody = Buffer.from('{"mode":"public"}')
const putBody = getControlRequestBody({ method: 'PUT', body: { mode: 'public' }, rawBody })
assert.strictEqual(putBody, rawBody)

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

console.log('controlRequestUnit: passed')
