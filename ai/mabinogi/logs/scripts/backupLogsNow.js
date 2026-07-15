/**
 * 立即执行一次 logs → arch 备份（不启动定时器）
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/backupLogsNow.js
 */
const { SOURCE_ROOT, ARCH_ROOT } = require('../config')
const { backupLogsToArch } = require('../backupScheduler')

console.log(`[backup] ${SOURCE_ROOT} -> ${ARCH_ROOT}`)
const result = backupLogsToArch()
console.log(result)
