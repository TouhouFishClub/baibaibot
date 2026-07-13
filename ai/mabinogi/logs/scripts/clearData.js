/**
 * 清除 DPS 日志相关 MongoDB 数据
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/clearData.js --yes
 *   node ai/mabinogi/logs/scripts/clearData.js --yes --with-files
 */
const fs = require('fs')
const path = require('path')
const { getClient } = require('../../../../mongo/index')
const { SOURCE_ROOT } = require('../config')

const DB_NAME = 'db_bot'
const COLLECTIONS = [
  'cl_mabinogi_dps_upload',
  'cl_mabinogi_dps_records',
  'cl_mabinogi_dps_nonce'
]

function parseArgs(argv) {
  return {
    yes: argv.includes('--yes'),
    withFiles: argv.includes('--with-files')
  }
}

function removeDirContents(dir) {
  if (!fs.existsSync(dir)) return 0
  let removed = 0
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      removed += removeDirContents(fullPath)
      fs.rmdirSync(fullPath)
    } else {
      fs.unlinkSync(fullPath)
      removed++
    }
  }
  return removed
}

async function clearCollections() {
  const client = await getClient()
  const db = client.db(DB_NAME)
  const result = {}

  for (const name of COLLECTIONS) {
    const col = db.collection(name)
    const res = await col.deleteMany({})
    result[name] = res.deletedCount || 0
  }

  return result
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.yes) {
    console.error('此操作将删除以下 MongoDB 集合中的全部文档:')
    COLLECTIONS.forEach(name => console.error(`  - ${DB_NAME}.${name}`))
    if (args.withFiles) {
      console.error(`并删除源文件目录: ${SOURCE_ROOT}`)
    }
    console.error('\n确认后请加 --yes 参数执行')
    process.exit(1)
  }

  console.log('[dps-logs] 正在清除数据库...')
  const result = await clearCollections()
  for (const [name, count] of Object.entries(result)) {
    console.log(`  ${name}: 删除 ${count} 条`)
  }

  if (args.withFiles) {
    const removed = removeDirContents(SOURCE_ROOT)
    console.log(`[dps-logs] 已删除源文件 ${removed} 个 (${SOURCE_ROOT})`)
  }

  console.log('[dps-logs] 清除完成')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[dps-logs] 清除失败', error)
    process.exit(1)
  })
