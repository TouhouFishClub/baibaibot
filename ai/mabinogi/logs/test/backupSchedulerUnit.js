const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  backupLogsToArch,
  getArchiveWindow,
  getCurrentArchiveDate
} = require('../backupScheduler')

function writeFile(root, relativePath, content, modifiedAt) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
  fs.utimesSync(target, modifiedAt, modifiedAt)
}

function localDate(year, month, day, hour, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mblogs-backup-'))
  const sourceRoot = path.join(tempRoot, 'logs')
  const archRoot = path.join(tempRoot, 'arch')
  const archiveDate = localDate(2026, 7, 18, 12)

  try {
    const beforeWindow = '100_player/before.json.gz'
    const atWindowStart = '100_player/start.json.gz'
    const insideWindow = '100_player/inside.json.gz'
    const atWindowEnd = '200_player/end.json.gz'

    writeFile(sourceRoot, beforeWindow, 'before', localDate(2026, 7, 18, 2, 59))
    writeFile(sourceRoot, atWindowStart, 'start', localDate(2026, 7, 18, 3))
    writeFile(sourceRoot, insideWindow, 'inside', localDate(2026, 7, 18, 18))
    writeFile(sourceRoot, atWindowEnd, 'end', localDate(2026, 7, 19, 3))

    const result = backupLogsToArch({ date: archiveDate, sourceRoot, archRoot })
    assert.deepStrictEqual(
      { copied: result.copied, skipped: result.skipped, total: result.total },
      { copied: 2, skipped: 2, total: 4 }
    )
    assert(fs.existsSync(path.join(archRoot, '2026-07-18', atWindowStart)))
    assert(fs.existsSync(path.join(archRoot, '2026-07-18', insideWindow)))
    assert(!fs.existsSync(path.join(archRoot, '2026-07-18', beforeWindow)))
    assert(!fs.existsSync(path.join(archRoot, '2026-07-18', atWindowEnd)))

    const nextDay = backupLogsToArch({
      date: localDate(2026, 7, 19, 12),
      sourceRoot,
      archRoot
    })
    assert.strictEqual(nextDay.copied, 1)
    assert(fs.existsSync(path.join(archRoot, '2026-07-19', atWindowEnd)))

    const window = getArchiveWindow(archiveDate)
    assert.strictEqual(window.start.getTime(), localDate(2026, 7, 18, 3).getTime())
    assert.strictEqual(window.end.getTime(), localDate(2026, 7, 19, 3).getTime())
    assert.strictEqual(
      formatDate(getCurrentArchiveDate(localDate(2026, 7, 18, 2, 59))),
      '2026-07-17'
    )

    console.log('backupSchedulerUnit: 03:00 archive window passed')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

function formatDate(date) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

run()
