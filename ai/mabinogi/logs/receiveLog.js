const fs = require('fs')
const path = require('path')
const { MODULE_DIR } = require('./config')

const LOG_PATH = path.join(MODULE_DIR, 'receive.log')

function formatBrief(entry) {
  const parts = [entry.event]
  if (entry.reason) parts.push(`reason=${entry.reason}`)
  if (entry.playerId) parts.push(`player=${entry.playerName || entry.playerId}`)
  if (entry.dungeonName) parts.push(`dungeon=${entry.dungeonName}`)
  if (entry.reportId) parts.push(`report=${entry.reportId}`)
  if (entry.targetCount != null) parts.push(`targets=${entry.targetCount}`)
  if (entry.validRecordCount != null) parts.push(`records=${entry.validRecordCount}`)
  if (entry.duplicate) parts.push('duplicate')
  return parts.join(' ')
}

function logReceive(entry) {
  const record = { ts: new Date().toISOString(), ...entry }
  const line = `${JSON.stringify(record)}\n`
  fs.appendFile(LOG_PATH, line, error => {
    if (error) {
      console.error('[dps-logs] receive.log 写入失败', error.message)
    }
  })
  console.log(`[dps-logs] receive ${formatBrief(record)}`)
}

module.exports = {
  LOG_PATH,
  logReceive
}
