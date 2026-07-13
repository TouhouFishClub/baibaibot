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

const queue = []
let draining = false

async function processReportJob(job) {
  const { reportId, sourceRelPath, dungeonName } = job
  const upload = await getReportById(reportId)
  const buffer = readSourceFile(sourceRelPath)
  if (!buffer) {
    await updateReportFailed(reportId, 'source_file_missing')
    return
  }

  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) {
    await updateReportFailed(reportId, parsed.reason)
    return
  }

  const semantic = validateSemantic(parsed.data, dungeonName)
  if (!semantic.ok) {
    await updateReportFailed(reportId, semantic.reason)
    return
  }

  const summary = extractSummary(parsed.data)
  const dpsRecords = buildDpsRecords({
    runId: reportId,
    dungeonName,
    uploadedAt: upload?.uploadedAt || new Date(),
    data: parsed.data
  })

  await updateReportParsed(reportId, {
    ...summary,
    validRecordCount: dpsRecords.length
  })
  if (dpsRecords.length) {
    await insertDpsRecords(dpsRecords)
  }
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
