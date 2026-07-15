/**
 * 清理 cl_mabinogi_dps_records 中「同场次 + 同 Boss 组 + 同角色」的重复记录。
 * 每个指纹只保留 DPS 最高的一条（并列则保留最先插入的一条）。
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/dedupeRecords.js           # dry-run
 *   node ai/mabinogi/logs/scripts/dedupeRecords.js --yes    # 实际删除多余记录
 */
const { getClient } = require('../../../../mongo/index')
const { resolveBossGroupKey } = require('../bossConfig')

const DB_NAME = 'db_bot'
const COL_RECORDS = 'cl_mabinogi_dps_records'

function parseArgs(argv) {
  return { yes: argv.includes('--yes') }
}

function fingerprint(record) {
  const runId = String(record.runId || '')
  const bossGroup = resolveBossGroupKey(record.bossGroup || record.bossKey || record.bossName || '')
  const characterId = String(record.characterId || '').trim()
  const characterName = String(record.characterName || '').trim()
  const character = characterId || characterName
  return `${runId}|${bossGroup}|${character}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_RECORDS)
  const all = await col.find({}).toArray()

  const best = new Map()
  const removeIds = []

  for (const record of all) {
    const key = fingerprint(record)
    const prev = best.get(key)
    if (!prev) {
      best.set(key, record)
      continue
    }

    const prevDps = Number(prev.dps) || 0
    const curDps = Number(record.dps) || 0
    // 保留 DPS 更高的；并列保留已在 map 中的（先出现的）
    if (curDps > prevDps) {
      removeIds.push(prev._id)
      best.set(key, record)
    } else {
      removeIds.push(record._id)
    }
  }

  console.log(`[dedupe] total=${all.length} unique=${best.size} duplicates=${removeIds.length} mode=${args.yes ? 'WRITE' : 'DRY-RUN'}`)

  if (!removeIds.length) {
    console.log('[dedupe] 无重复')
    return
  }

  if (!args.yes) {
    console.log('[dedupe] 预览完成。加 --yes 删除多余记录。')
    return
  }

  const result = await col.deleteMany({ _id: { $in: removeIds } })
  console.log(`[dedupe] deleted=${result.deletedCount}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[dedupe] failed', error)
    process.exit(1)
  })
