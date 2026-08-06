const assert = require('assert')
const {
  normalizeServerId,
  parseCli,
  loadMapping
} = require('./backfillRankingConsentServers')
const fs = require('fs')
const os = require('os')
const path = require('path')

assert.strictEqual(normalizeServerId('亚特'), 'yate')
assert.strictEqual(normalizeServerId('YILUXIA'), 'yiluxia')
assert.strictEqual(normalizeServerId('unknown'), '')
assert.deepStrictEqual(parseCli(['--mapping', 'servers.json']), { apply: false, mappingPath: 'servers.json' })
assert.deepStrictEqual(parseCli(['--mapping=servers.json', '--apply']), { apply: true, mappingPath: 'servers.json' })

const tempPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-server-map-')), 'mapping.json')
fs.writeFileSync(tempPath, JSON.stringify({ '100': '亚特', '200': 'yiluxia', '300': 'unknown' }))
const mapping = loadMapping(tempPath)
assert.strictEqual(mapping.get('100'), 'yate')
assert.strictEqual(mapping.get('200'), 'yiluxia')
assert.strictEqual(mapping.has('300'), false)
fs.rmSync(path.dirname(tempPath), { recursive: true, force: true })

console.log('backfillRankingConsentServers: passed')
