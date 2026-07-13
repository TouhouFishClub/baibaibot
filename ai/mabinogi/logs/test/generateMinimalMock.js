const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const MOCK_DIR = path.join(__dirname, 'mock')

const nowCenti = Math.floor(Date.now() / 10)

const minimalPayload = {
  targets: [{
    targetId: '900001',
    targetName: '测试Boss',
    totalDamage: 123456789,
    dps: 50000,
    duration: 120,
    cleanedAt: nowCenti,
    appearedAt: nowCenti - 12000,
    deathTime: nowCenti,
    bossHP: { maxHp: 250000000 },
    attackers: [{
      id: '123456789',
      name: '测试角色',
      totalDamage: 123456789,
      dps: 50000,
      percent: 100,
      isPC: true,
      skills: [],
      skillsDetail: []
    }]
  }]
}

const filteredPayload = {
  targets: [{
    targetId: '900002',
    targetName: '弱小Boss',
    totalDamage: 1000,
    dps: 10,
    duration: 30,
    cleanedAt: nowCenti,
    appearedAt: nowCenti - 3000,
    bossHP: { maxHp: 100000000 },
    attackers: [{
      id: '123456789',
      name: '测试角色',
      totalDamage: 1000,
      dps: 10,
      percent: 100,
      isPC: true,
      skills: [],
      skillsDetail: []
    }]
  }]
}

function writeGz(name, data) {
  fs.mkdirSync(MOCK_DIR, { recursive: true })
  const json = Buffer.from(JSON.stringify(data))
  const gz = zlib.gzipSync(json)
  fs.writeFileSync(path.join(MOCK_DIR, name), gz)
  return gz
}

const minimalGz = writeGz('01_minimal_single_boss.json.gz', minimalPayload)
writeGz('05_should_be_filtered_out.json.gz', filteredPayload)

const crypto = require('crypto')
const sha256 = crypto.createHash('sha256').update(minimalGz).digest('hex')
const manifest = {
  endpoint: 'http://127.0.0.1:10086/mabinogi/dpsPusher',
  testSecret: 'blony-upload-test-secret',
  samples: [
    {
      id: '01',
      file: '01_minimal_single_boss.json.gz',
      clientShouldUpload: true,
      playerId: '123456789',
      playerName: '测试角色',
      dungeonName: '布里列赫',
      fileName: '2026-07-12_15-04-05_布里列赫.json.gz',
      clientVersion: '2.2.2',
      contentSha256: sha256
    },
    {
      id: '05',
      file: '05_should_be_filtered_out.json.gz',
      clientShouldUpload: false,
      playerId: '123456789',
      playerName: '测试角色',
      dungeonName: '布里列赫',
      fileName: 'filtered_out.json.gz',
      clientVersion: '2.2.2'
    }
  ]
}

fs.writeFileSync(path.join(MOCK_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('generated minimal mock in', MOCK_DIR)
