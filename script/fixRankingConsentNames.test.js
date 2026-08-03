const assert = require('assert')
const { parseCli, recoverUtf8Name } = require('./fixRankingConsentNames')

function corruptUtf8AsLatin1 (value) {
	return Buffer.from(value, 'utf8').toString('latin1')
}

for (const name of ['\u9cf3\u68a8', '\u4e2d\u6587\u89d2\u8272', '\u30c6\u30b9\u30c8', '\ud55c\uae00']) {
	assert.strictEqual(recoverUtf8Name(corruptUtf8AsLatin1(name)), name)
}

assert.strictEqual(recoverUtf8Name('Flandre'), null)
assert.strictEqual(recoverUtf8Name('Danilla'), null)
assert.strictEqual(recoverUtf8Name('\u9cf3\u68a8'), null)
assert.strictEqual(recoverUtf8Name(''), null)

assert.deepStrictEqual(parseCli([]), { apply: false, playerId: '' })
assert.deepStrictEqual(parseCli(['--apply', '--player-id', '123']), { apply: true, playerId: '123' })
assert.deepStrictEqual(parseCli(['--player-id=456']), { apply: false, playerId: '456' })
assert.throws(() => parseCli(['--player-id']), /requires a value/)

console.log('fixRankingConsentNames.test: passed')
