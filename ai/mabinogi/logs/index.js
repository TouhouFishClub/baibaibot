const { registerRoutes } = require('./handler')
const { recoverPendingJobs } = require('./queue')

let started = false

function initDpsLogs(app) {
  registerRoutes(app)
  if (!started) {
    started = true
    recoverPendingJobs().catch(error => {
      console.error('[dps-logs] recover pending failed', error)
    })
  }
}

module.exports = {
  initDpsLogs
}
