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

/**
 * 将 mabidata/logs 备份到 mabidata/arch/YYYY-MM-DD/
 * 已存在且同大小的文件跳过，不覆盖。
 */
function backupLogsToArch({ date = new Date() } = {}) {
  const dayFolder = formatDateFolder(date)
  const destRoot = path.join(ARCH_ROOT, dayFolder)
  fs.mkdirSync(destRoot, { recursive: true })

  if (!fs.existsSync(SOURCE_ROOT)) {
    console.warn(`[dps-logs][backup] 源目录不存在: ${SOURCE_ROOT}`)
    return { dayFolder, copied: 0, skipped: 0, total: 0 }
  }

  const files = listFilesRecursive(SOURCE_ROOT)
  let copied = 0
  let skipped = 0

  for (const file of files) {
    const dest = path.join(destRoot, file.relativePath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    if (fs.existsSync(dest)) {
      try {
        const srcStat = fs.statSync(file.absolutePath)
        const destStat = fs.statSync(dest)
        if (srcStat.size === destStat.size) {
          skipped++
          continue
        }
      } catch (error) {
        // fall through to copy
      }
    }
    fs.copyFileSync(file.absolutePath, dest)
    copied++
  }

  console.log(`[dps-logs][backup] ${dayFolder} total=${files.length} copied=${copied} skipped=${skipped} -> ${destRoot}`)
  return { dayFolder, copied, skipped, total: files.length, destRoot }
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
      backupLogsToArch()
    } catch (error) {
      console.error('[dps-logs][backup] 执行失败', error)
    }
    setInterval(() => {
      try {
        backupLogsToArch()
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
  formatDateFolder
}
