const assert = require('assert')
const { getControlRequestBody } = require('../handler')

const getBody = getControlRequestBody({ method: 'GET', body: {} })
assert(Buffer.isBuffer(getBody))
assert.strictEqual(getBody.length, 0)

const rawBody = Buffer.from('{"mode":"public"}')
const putBody = getControlRequestBody({ method: 'PUT', body: { mode: 'public' }, rawBody })
assert.strictEqual(putBody, rawBody)

console.log('controlRequestUnit: passed')
