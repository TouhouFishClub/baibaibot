const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  parseAnnouncementHtml,
  announcementHash,
  syncAnnouncementFile
} = require('../announcementSync')

async function run() {
  assert.strictEqual(parseAnnouncementHtml('<html><head><title>空</title></head><body></body></html>'), null)

  const parsed = parseAnnouncementHtml(`
    <html>
      <head><title> 排行规则更新 </title></head>
      <body><h1>标题</h1><p>正文 <strong>加粗</strong></p></body>
    </html>
  `)
  assert.strictEqual(parsed.title, '排行规则更新')
  assert(parsed.html.includes('<strong>加粗</strong>'))
  assert.strictEqual(announcementHash(parsed), announcementHash(parsed))

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'announcement-sync-'))
  const filePath = path.join(tempDir, 'announcement.html')
  fs.writeFileSync(filePath, '<html><head><title>测试公告</title></head><body><p>测试正文</p></body></html>')

  let published
  let storedHash = null
  const result = await syncAnnouncementFile({
    filePath,
    publish: async value => {
      published = value
      if (storedHash === value.sourceHash) {
        return { created: false, announcement: { ...value, timestamp: 123 } }
      }
      storedHash = value.sourceHash
      return { created: true, announcement: { ...value, timestamp: 123 } }
    }
  })
  assert.strictEqual(result.status, 'published')
  assert.strictEqual(result.announcement.timestamp, 123)
  assert.strictEqual(published.title, '测试公告')
  assert.strictEqual(published.html, '<p>测试正文</p>')
  assert(/^[0-9a-f]{64}$/.test(published.sourceHash))

  const unchanged = await syncAnnouncementFile({
    filePath,
    publish: async value => ({
      created: storedHash !== value.sourceHash,
      announcement: { ...value, timestamp: 123 }
    })
  })
  assert.strictEqual(unchanged.status, 'unchanged')

  fs.rmSync(tempDir, { recursive: true, force: true })
  console.log('announcementSyncUnit: passed')
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
