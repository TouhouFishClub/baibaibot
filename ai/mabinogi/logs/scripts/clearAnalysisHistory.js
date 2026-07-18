/**
 * 重置 AI 分析快照、日报与锐评缓存，不删除 DPS 排行、上传记录或源文件。
 *
 * 默认仅预览：
 *   node ai/mabinogi/logs/scripts/clearAnalysisHistory.js
 *
 * 确认删除：
 *   node ai/mabinogi/logs/scripts/clearAnalysisHistory.js --yes
 */
const { getClient } = require('../../../../mongo/index')

const DB_NAME = 'db_bot'
const COLLECTIONS = [
  'cl_mabinogi_dps_ai_snapshots',
  'cl_mabinogi_dps_ai_reports',
  'cl_mabinogi_dps_ai_reviews'
]

function parseArgs(argv) {
  const args = { yes: false }
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--yes') {
      args.yes = true
    } else {
      throw new Error(`未知参数: ${token}`)
    }
  }
  return args
}

function getDeletedCount(result) {
  return Number(result?.deletedCount ?? result?.result?.n) || 0
}

async function countPlan(db) {
  const result = {}
  for (const name of COLLECTIONS) {
    result[name] = await db.collection(name).count({})
  }
  return result
}

async function executePlan(db) {
  const result = {}
  for (const name of COLLECTIONS) {
    const removed = await db.collection(name).deleteMany({})
    result[name] = getDeletedCount(removed)
  }
  return result
}

async function main() {
  const args = parseArgs(process.argv)
  const client = await getClient()
  if (!client) throw new Error('MongoDB 连接失败')
  const db = client.db(DB_NAME)
  const plan = await countPlan(db)

  console.log('[dps-ai-clear] 以下 AI 集合将被清空：')
  for (const name of COLLECTIONS) {
    console.log(`  ${DB_NAME}.${name}: ${plan[name]} 条`)
  }

  if (!args.yes) {
    console.log('[dps-ai-clear] 当前为预览模式；确认数量后加 --yes 执行')
    return
  }

  const removed = await executePlan(db)
  for (const name of COLLECTIONS) {
    console.log(`[dps-ai-clear] ${name}: 已删除 ${removed[name]} 条`)
  }
  console.log('[dps-ai-clear] DPS排行、上传记录和源文件均未修改')
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
  COLLECTIONS,
  parseArgs
}
