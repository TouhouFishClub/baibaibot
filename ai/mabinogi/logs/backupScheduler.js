const fs = require('fs')
const path = require('path')
const { SOURCE_ROOT, ARCH_ROOT, backupHourLocal } = require('./config')

const DAY_MS = 24 * 60 * 60 * 1000
let started = false

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateFolder(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function listFilesRecursive(dir, base = dir) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full, base))
      continue
    }
    results.push({
      absolutePath: full,
      relativePath: path.relative(base, full).replace(/\\/g, '/')
    })
  }
  return results
}

function getArchiveWindow(date) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    backupHourLocal,
    0,
    0,
    0
  )
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function getCurrentArchiveDate(now = new Date()) {
  const date = new Date(now)
  const boundary = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    backupHourLocal,
    0,
    0,
    0
  )
  if (now.getTime() < boundary.getTime()) {
    date.setDate(date.getDate() - 1)
  }
  return date
}

/**
 * 将 mabidata/logs 备份到 mabidata/arch/YYYY-MM-DD/
 * 每个日期目录只保存当天 03:00 到次日 03:00 之间写入的文件。
 */
function backupLogsToArch({
  date = getCurrentArchiveDate(),
  sourceRoot = SOURCE_ROOT,
  archRoot = ARCH_ROOT
} = {}) {
  const dayFolder = formatDateFolder(date)
  const destRoot = path.join(archRoot, dayFolder)
  const { start, end } = getArchiveWindow(date)
  fs.mkdirSync(destRoot, { recursive: true })

  if (!fs.existsSync(sourceRoot)) {
    console.warn(`[dps-logs][backup] 源目录不存在: ${sourceRoot}`)
    return { dayFolder, copied: 0, skipped: 0, total: 0 }
  }

  const files = listFilesRecursive(sourceRoot)
    .filter(file => file.relativePath.toLowerCase().endsWith('.json.gz'))
  let copied = 0
  let skipped = 0

  for (const file of files) {
    const modifiedAt = fs.statSync(file.absolutePath).mtimeMs
    if (modifiedAt < start.getTime() || modifiedAt >= end.getTime()) {
      skipped++
      continue
    }
    const dest = path.join(destRoot, file.relativePath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(file.absolutePath, dest)
    copied++
  }

  console.log(`[dps-logs][backup] ${dayFolder} 03:00 -> next day 03:00 total=${files.length} copied=${copied} skipped=${skipped} -> ${destRoot}`)
  return { dayFolder, start, end, copied, skipped, total: files.length, destRoot }
}

function msUntilNextBackupHour(hour = backupHourLocal) {
  const now = new Date()
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    0,
    0,
    0
  )
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

function startLogsBackupScheduler() {
  if (started) return
  started = true

  const delay = msUntilNextBackupHour()
  const nextAt = new Date(Date.now() + delay)
  console.log(`[dps-logs][backup] 定时备份已启动: ${SOURCE_ROOT} -> ${ARCH_ROOT}/YYYY-MM-DD`)
  console.log(`[dps-logs][backup] 下次执行: ${nextAt.toLocaleString('zh-CN')}（之后每 24 小时）`)

  setTimeout(() => {
    try {
      const archiveDate = new Date()
      archiveDate.setDate(archiveDate.getDate() - 1)
      backupLogsToArch({ date: archiveDate })
    } catch (error) {
      console.error('[dps-logs][backup] 执行失败', error)
    }
    setInterval(() => {
      try {
        const archiveDate = new Date()
        archiveDate.setDate(archiveDate.getDate() - 1)
        backupLogsToArch({ date: archiveDate })
      } catch (error) {
        console.error('[dps-logs][backup] 执行失败', error)
      }
    }, DAY_MS)
  }, delay)
}

module.exports = {
  ARCH_ROOT,
  backupLogsToArch,
  startLogsBackupScheduler,
  formatDateFolder,
  getArchiveWindow,
  getCurrentArchiveDate
}
