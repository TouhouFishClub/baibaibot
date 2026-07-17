const { readSourceFile } = require('./storage')
const { parseGzipJson, validateSemantic } = require('./validate')
const { extractSummary } = require('./parser')
const {
  updateReportParsed,
  updateReportFailed,
  listPendingReports,
  insertDpsRecords,
  getReportById
} = require('./db')
const { buildDpsRecords } = require('./records')
const { logReceive } = require('./receiveLog')

const queue = []
let draining = false

async function processReportJob(job) {
  const { reportId, sourceRelPath, dungeonName } = job
  const upload = await getReportById(reportId)
  const buffer = readSourceFile(sourceRelPath)
  if (!buffer) {
    logReceive({ event: 'parse_fail', reportId, dungeonName, reason: 'source_file_missing' })
    await updateReportFailed(reportId, 'source_file_missing')
    return
  }

  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) {
    logReceive({ event: 'parse_fail', reportId, dungeonName, reason: parsed.reason })
    await updateReportFailed(reportId, parsed.reason)
    return
  }

  const semantic = validateSemantic(parsed.data, dungeonName)
  const summary = extractSummary(parsed.data)
  const dpsRecords = buildDpsRecords({
    runId: reportId,
    dungeonName,
    uploadedAt: upload?.uploadedAt || new Date(),
    data: parsed.data,
    uploaderName: upload?.playerName || '',
    uploaderId: upload?.playerId || ''
  })

  // 语义校验用于挡脏包；若仍能识别出有效击杀，优先入库（避免残局拖死整包）
  if (!semantic.ok && !dpsRecords.length) {
    logReceive({
      event: 'parse_fail',
      reportId,
      dungeonName,
      reason: semantic.reason,
      targetCount: summary.targetCount,
      targets: summary.targets.map(item => ({
        targetName: item.targetName,
        maxHp: item.maxHp,
        totalDamage: item.totalDamage,
        duration: item.duration
      }))
    })
    await updateReportFailed(reportId, semantic.reason)
    return
  }

  await updateReportParsed(reportId, {
    ...summary,
    validRecordCount: dpsRecords.length,
    semanticNote: semantic.ok ? null : semantic.reason
  })
  if (dpsRecords.length) {
    await insertDpsRecords(dpsRecords)
  }

  logReceive({
    event: 'parse_ok',
    reportId,
    dungeonName,
    playerId: upload?.playerId,
    playerName: upload?.playerName,
    targetCount: summary.targetCount,
    validRecordCount: dpsRecords.length,
    totalDamage: summary.totalDamage,
    records: dpsRecords.map(item => ({
      bossName: item.bossName,
      bossHp: item.bossHp,
      characterName: item.characterName,
      dps: item.dps,
      percent: item.percent
    }))
  })
}

async function drainQueue() {
  if (draining) return
  draining = true
  while (queue.length) {
    const job = queue.shift()
    try {
      await processReportJob(job)
    } catch (error) {
      console.error('[dps-logs] queue job failed', job?.reportId, error)
      if (job?.reportId) {
        await updateReportFailed(job.reportId, error.message || 'parse_error')
      }
    }
  }
  draining = false
}

function enqueueParseJob(job) {
  queue.push(job)
  setImmediate(drainQueue)
}

async function recoverPendingJobs() {
  const pending = await listPendingReports(100)
  for (const item of pending) {
    enqueueParseJob({
      reportId: item._id,
      sourceRelPath: item.sourceRelPath,
      dungeonName: item.dungeonName
    })
  }
  if (pending.length) {
    console.log(`[dps-logs] 恢复 ${pending.length} 条待解析任务`)
  }
}

module.exports = {
  enqueueParseJob,
  recoverPendingJobs,
  processReportJob
}
