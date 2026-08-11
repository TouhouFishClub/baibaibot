const assert = require('assert')
const crypto = require('crypto')
const zlib = require('zlib')
const {
  BUFF_MONITOR_SCHEMA_VERSION,
  parseBuffMonitorUpload
} = require('../buffMonitor')

function gzip(data) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(data)))
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function buildData() {
  return {
    schemaVersion: BUFF_MONITOR_SCHEMA_VERSION,
    definitions: [{
      conditionId: 680,
      conditionName: '战争序曲',
      strengthField: 'MCMBAMAX'
    }],
    targets: [{
      targetId: 'boss-1',
      players: [{
        playerId: '100',
        playerName: '测试角色',
        isSelf: true,
        battleSeconds: 30,
        buffs: [{
          conditionId: 680,
          conditionName: '战争序曲',
          activeSeconds: 20,
          coveragePercent: 66.6,
          strengthField: 'MCMBAMAX',
          averageStrength: 50.5,
          minStrength: 45,
          maxStrength: 53.2,
          segments: [{
            startedAt: 100,
            endedAt: 200,
            startOffset: 0,
            endOffset: 10,
            activeSeconds: 10,
            strength: 50.5,
            rawDetail: 'MCMBAMAX:f:50.5;',
            details: { MCMBAMAX: { type: 'f', value: '50.5' } }
          }]
        }]
      }]
    }]
  }
}

const primary = { targets: [{ targetId: 'boss-1' }] }

const absent = parseBuffMonitorUpload({}, [], primary)
assert.deepStrictEqual(absent, { ok: true, present: false })

const buffer = gzip(buildData())
const valid = parseBuffMonitorUpload({
  buffMonitorSchemaVersion: '1',
  buffMonitorSha256: sha256(buffer)
}, [{ fieldname: 'buffMonitorFile', buffer }], primary)
assert.strictEqual(valid.ok, true)
assert.strictEqual(valid.present, true)
assert.strictEqual(valid.stats.playerCount, 1)
assert.strictEqual(valid.stats.segmentCount, 1)
assert.strictEqual(valid.data.targets[0].players[0].buffs[0].segments[0].rawDetail, 'MCMBAMAX:f:50.5;')

const mismatch = parseBuffMonitorUpload({
  buffMonitorSchemaVersion: '1',
  buffMonitorSha256: '0'.repeat(64)
}, [{ fieldname: 'buffMonitorFile', buffer }], primary)
assert.strictEqual(mismatch.reason, 'buff_monitor_sha256_mismatch')

const wrongTarget = buildData()
wrongTarget.targets[0].targetId = 'other-boss'
const wrongTargetBuffer = gzip(wrongTarget)
const invalidTarget = parseBuffMonitorUpload({
  buffMonitorSchemaVersion: '1',
  buffMonitorSha256: sha256(wrongTargetBuffer)
}, [{ fieldname: 'buffMonitorFile', buffer: wrongTargetBuffer }], primary)
assert.strictEqual(invalidTarget.reason, 'buff_monitor_target_invalid')

const incomplete = parseBuffMonitorUpload({ buffMonitorSchemaVersion: '1' }, [], primary)
assert.strictEqual(incomplete.reason, 'buff_monitor_fields_incomplete')

const extensionPrimary = {
  targets: primary.targets,
  extensions: { buffMonitor: buildData() }
}
const extension = parseBuffMonitorUpload({}, [], extensionPrimary)
assert.strictEqual(extension.ok, true)
assert.strictEqual(extension.present, true)
assert.strictEqual(extension.source, 'extension')
assert.strictEqual(extension.stats.buffCount, 1)

const inlinePrimary = {
  targets: [{
    targetId: 'boss-1',
    buffCoverage: buildData().targets[0].players
  }]
}
const inline = parseBuffMonitorUpload({}, [], inlinePrimary)
assert.strictEqual(inline.ok, true)
assert.strictEqual(inline.present, true)
assert.strictEqual(inline.inline, true)
assert.strictEqual(inline.contentSha256, null)
assert.strictEqual(inline.data.definitions[0].conditionId, 680)
assert.strictEqual(inline.data.targets[0].players[0].buffs[0].coveragePercent, 66.6)

console.log('buffMonitorUnit: passed')
