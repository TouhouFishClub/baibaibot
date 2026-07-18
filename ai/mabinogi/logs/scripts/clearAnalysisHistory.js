/**
 * 清除指定日期之前的 DPS 排行记录，并重置 AI 分析历史。
 *
 * 默认仅预览：
 *   node ai/mabinogi/logs/scripts/clearAnalysisHistory.js --before 2026-07-18
 *
 * 确认删除：
 *   node ai/mabinogi/logs/scripts/clearAnalysisHistory.js --before 2026-07-18 --yes
 *
 * 日期按上海时区当天 00:00 解释。原始上传记录和 gzip 文件不会删除；如果以后
 * 对旧上传执行 reparseUploads.js，被删除的排行记录可能重新生成。
 */
const { getClient } = require('../../../../mongo/index')

const DB_NAME = 'db_bot'
const COL_RECORDS = 'cl_mabinogi_dps_records'
const COL_AI_SNAPSHOTS = 'cl_mabinogi_dps_ai_snapshots'
const COL_AI_REPORTS = 'cl_mabinogi_dps_ai_reports'
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

function parseArgs(argv) {
  const args = { before: '', yes: false }
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--before') {
      args.before = String(argv[++i] || '').trim()
    } else if (token === '--yes') {
      args.yes = true
    } else {
      throw new Error(`未知参数: ${token}`)
    }
  }
  return args
}

function parseShanghaiCutoff(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new Error('--before 必须使用 YYYY-MM-DD 格式')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new Error(`无效日期: ${value}`)
  }

  const cutoff = new Date(calendarDate.getTime() - SHANGHAI_OFFSET_MS)
  if (cutoff.getTime() > Date.now()) {
    throw new Error(`截止日期不能晚于今天: ${value}`)
  }
  return cutoff
}

function buildRecordQuery(cutoff) {
  return {
    $or: [
      { recordTime: { $type: 9, $lt: cutoff } },
      { recordTime: null, recordTs: { $lt: cutoff.getTime() } }
    ]
  }
}

function getDeletedCount(result) {
  return Number(result?.deletedCount ?? result?.result?.n) || 0
}

async function countPlan(db, recordQuery) {
  const records = db.collection(COL_RECORDS)
  return {
    records: await records.count(recordQuery),
    recordsWithoutTime: await records.count({
      recordTime: null,
      $or: [
        { recordTs: { $exists: false } },
        { recordTs: null }
      ]
    }),
    aiSnapshots: await db.collection(COL_AI_SNAPSHOTS).count({}),
    aiReports: await db.collection(COL_AI_REPORTS).count({})
  }
}

async function executePlan(db, recordQuery) {
  const recordResult = await db.collection(COL_RECORDS).deleteMany(recordQuery)
  const snapshotResult = await db.collection(COL_AI_SNAPSHOTS).deleteMany({})
  const reportResult = await db.collection(COL_AI_REPORTS).deleteMany({})
  return {
    records: getDeletedCount(recordResult),
    aiSnapshots: getDeletedCount(snapshotResult),
    aiReports: getDeletedCount(reportResult)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.before) {
    throw new Error('缺少 --before YYYY-MM-DD；脚本不会提供“无条件删除全部排行记录”模式')
  }

  const cutoff = parseShanghaiCutoff(args.before)
  const recordQuery = buildRecordQuery(cutoff)
  const client = await getClient()
  if (!client) throw new Error('MongoDB 连接失败')
  const db = client.db(DB_NAME)
  const plan = await countPlan(db, recordQuery)

  console.log(`[dps-ai-clear] 截止日期（上海时区）: ${args.before} 00:00`)
  console.log(`[dps-ai-clear] 将删除 ${COL_RECORDS}: ${plan.records} 条`)
  console.log(`[dps-ai-clear] 将删除 ${COL_AI_SNAPSHOTS}: ${plan.aiSnapshots} 条`)
  console.log(`[dps-ai-clear] 将删除 ${COL_AI_REPORTS}: ${plan.aiReports} 条`)
  if (plan.recordsWithoutTime) {
    console.warn(`[dps-ai-clear] 有 ${plan.recordsWithoutTime} 条排行记录缺少时间字段，本次不会删除`)
  }

  if (!args.yes) {
    console.log('[dps-ai-clear] 当前为预览模式；确认数量后加 --yes 执行')
    return
  }

  const removed = await executePlan(db, recordQuery)
  console.log(`[dps-ai-clear] 已删除排行记录: ${removed.records} 条`)
  console.log(`[dps-ai-clear] 已删除 AI 快照: ${removed.aiSnapshots} 条`)
  console.log(`[dps-ai-clear] 已删除 AI 日报: ${removed.aiReports} 条`)
  console.log('[dps-ai-clear] 原始上传记录和源文件均已保留')
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('[dps-ai-clear] 失败:', error.message || error)
      process.exit(1)
    })
}

module.exports = {
  parseArgs,
  parseShanghaiCutoff,
  buildRecordQuery
}
