const { registerRoutes } = require('./handler')
const { recoverPendingJobs } = require('./queue')
const { startLogsBackupScheduler } = require('./backupScheduler')
const { startAnnouncementSync } = require('./announcementSync')

let started = false

function initDpsLogs(app) {
  registerRoutes(app)
  if (!started) {
    started = true
    recoverPendingJobs().catch(error => {
      console.error('[dps-logs] recover pending failed', error)
    })
    startLogsBackupScheduler()
    startAnnouncementSync()
  }
}

module.exports = {
  initDpsLogs
}
