const assert = require('assert')
const { randomBytes } = require('crypto')
// Stub config before loading the logger so tests never consume private configuration.
const endpoint = 'https://127.0.0.1:34567/upload'
const secret = randomBytes(32).toString('base64')
const configPath = require.resolve('../config')
require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: {
  MODULE_DIR: __dirname, uploadEndpoint: endpoint, uploadSecret: secret
} }
const { maskUploadText } = require('../privacy')
const message = `lookup 127.0.0.1; endpoint=${endpoint}; key=${secret}`
const result = maskUploadText(message)
assert(!result.includes('127.0.0.1'))
assert(!result.includes(secret))
assert(result.includes('[server]'))
assert(result.includes('[secret]'))
assert(!maskUploadText(Buffer.from(secret, 'base64').toString('hex')).includes(Buffer.from(secret, 'base64').toString('hex')))
const custom = randomBytes(24).toString('base64')
assert(!maskUploadText(custom, { secret: custom }).includes(custom))
const output = []
const fs = require('fs')
const originalAppend = fs.appendFile
const originalLog = console.log
try {
  fs.appendFile = (path, text, done) => { output.push(text); done(null) }
  console.log = text => output.push(text)
  require('../receiveLog').logReceive({ event: 'upload_reject', reason: message })
} finally {
  fs.appendFile = originalAppend
  console.log = originalLog
}
assert.strictEqual(output.length, 2)
JSON.parse(output[0])
for (const line of output) {
  assert(!line.includes('127.0.0.1'))
  assert(!line.includes(secret))
}
console.log('privacyUnit: ok')
