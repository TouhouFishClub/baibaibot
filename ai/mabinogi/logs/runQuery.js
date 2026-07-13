const { parseGzipJson } = require('./validate')
const { readSourceFile } = require('./storage')
const { findReportByRunId, listDpsRecords } = require('./db')
const { buildRunPanels } = require('./runChartData')
const { shortRunId } = require('./bossConfig')

function isRunIdKeyword(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return false
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kw)) {
    return true
  }
  return /^[0-9a-f]{6,32}$/i.test(kw)
}

function formatUploadTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  const pad = n => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function loadRunDetail(runId) {
  const report = await findReportByRunId(runId)
  if (!report) {
    return { error: `未找到场次「${runId}」` }
  }

  if (!report.sourceRelPath) {
    return { error: `场次「${shortRunId(report._id)}」缺少原始文件路径` }
  }

  const buffer = readSourceFile(report.sourceRelPath)
  if (!buffer) {
    return { error: `场次「${shortRunId(report._id)}」原始文件不存在：${report.sourceRelPath}` }
  }

  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) {
    return { error: `场次「${shortRunId(report._id)}」原始文件无法解析：${parsed.reason}` }
  }

  const panels = buildRunPanels(parsed.data)
  if (!panels.length) {
    return { error: `场次「${shortRunId(report._id)}」没有可展示的 Boss 数据` }
  }

  const records = await listDpsRecords({ runId: report._id }, { limit: 200 })
  const statusNote = report.status === 'failed'
    ? `（解析失败：${report.parseError || 'unknown'}，仍展示原始战斗数据）`
    : ''

  return {
    report,
    panels,
    records,
    title: `场次详情 #${shortRunId(report._id)}`,
    description: [
      report.dungeonName,
      report.playerName ? `${report.playerName}(${report.playerId})` : report.playerId,
      formatUploadTime(report.uploadedAt),
      `${panels.length} 个 Boss`,
      statusNote
    ].filter(Boolean).join(' · ')
  }
}

module.exports = {
  isRunIdKeyword,
  loadRunDetail
}
