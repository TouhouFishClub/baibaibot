/**
 * 初始化 DPS 日志相关 MongoDB 集合索引
 *
 * 用法: node ai/mabinogi/logs/scripts/initIndexes.js
 *
 * MongoDB 无需预先建表，首次写入时集合会自动创建；
 * 本脚本仅创建索引（与 db.js ensureIndexes 一致）。
 */
const { getClient } = require('../../../mongo/index')
const { nonceTtlSeconds } = require('../config')

const DB_NAME = 'db_bot'

async function initIndexes() {
  const client = await getClient()
  const db = client.db(DB_NAME)

  const uploads = db.collection('cl_mabinogi_dps_upload')
  const records = db.collection('cl_mabinogi_dps_records')
  const nonces = db.collection('cl_mabinogi_dps_nonce')

  console.log(`[dps-logs] 初始化数据库 ${DB_NAME} 索引...`)

  await uploads.createIndex(
    { playerId: 1, contentSha256: 1 },
    { unique: true, name: 'uniq_player_sha' }
  )
  await uploads.createIndex(
    { playerId: 1, fileName: 1 },
    { unique: true, name: 'uniq_player_filename' }
  )
  await uploads.createIndex(
    { status: 1, uploadedAt: 1 },
    { name: 'status_uploadedAt' }
  )
  await uploads.createIndex(
    { uploadedAt: -1 },
    { name: 'uploadedAt_desc' }
  )
  await uploads.createIndex(
    { teamSignature: 1, dungeonName: 1, uploadedAt: -1 },
    { name: 'team_dedup' }
  )
  await uploads.createIndex(
    { 'targets.targetId': 1, uploadedAt: -1 },
    { name: 'target_uploadedAt' }
  )

  await records.createIndex(
    { characterName: 1, bossKey: 1, dps: -1 },
    { name: 'char_boss_dps' }
  )
  await records.createIndex(
    { characterName: 1, bossGroup: 1, dps: -1 },
    { name: 'char_bossGroup_dps' }
  )
  await records.createIndex(
    { dungeonName: 1, bossKey: 1, dps: -1 },
    { name: 'dungeon_boss_dps' }
  )
  await records.createIndex(
    { dungeonName: 1, bossGroup: 1, dps: -1 },
    { name: 'dungeon_bossGroup_dps' }
  )
  await records.createIndex(
    { bossKey: 1, dps: -1 },
    { name: 'boss_dps' }
  )
  await records.createIndex(
    { bossGroup: 1, dps: -1 },
    { name: 'bossGroup_dps' }
  )
  await records.createIndex(
    { runId: 1 },
    { name: 'runId' }
  )
  await records.createIndex(
    { characterId: 1, bossKey: 1, dps: -1 },
    { name: 'charId_boss_dps' }
  )

  await nonces.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: nonceTtlSeconds, name: 'nonce_ttl' }
  )

  console.log('[dps-logs] 索引创建完成')
  console.log('  - cl_mabinogi_dps_upload')
  console.log('  - cl_mabinogi_dps_records')
  console.log('  - cl_mabinogi_dps_nonce (TTL 600s)')
}

initIndexes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[dps-logs] 索引初始化失败', error)
    process.exit(1)
  })
