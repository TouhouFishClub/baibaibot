const crypto = require('crypto')
const { getClient } = require('../../../mongo/index')
const { TEAM_DEDUP_MS } = require('./team')
const { nonceTtlSeconds } = require('./config')
const { getBossKeysByGroup, getGroupSortHp, resolveBossGroupKey } = require('./bossConfig')

const DB_NAME = 'db_bot'
const COL_UPLOADS = 'cl_mabinogi_dps_upload'
const COL_RECORDS = 'cl_mabinogi_dps_records'
const COL_NONCE = 'cl_mabinogi_dps_nonce'

let indexesReady = false

async function ensureIndexes() {
  if (indexesReady) return
  const client = await getClient()
  const uploads = client.db(DB_NAME).collection(COL_UPLOADS)
  const records = client.db(DB_NAME).collection(COL_RECORDS)
  const nonces = client.db(DB_NAME).collection(COL_NONCE)

  await uploads.createIndex({ playerId: 1, contentSha256: 1 }, { unique: true, name: 'uniq_player_sha' })
  await uploads.createIndex({ playerId: 1, fileName: 1 }, { unique: true, name: 'uniq_player_filename' })
  await uploads.createIndex({ status: 1, uploadedAt: 1 }, { name: 'status_uploadedAt' })
  await uploads.createIndex({ uploadedAt: -1 }, { name: 'uploadedAt_desc' })
  await uploads.createIndex({ teamSignature: 1, dungeonName: 1, uploadedAt: -1 }, { name: 'team_dedup' })
  await uploads.createIndex({ 'targets.targetId': 1, uploadedAt: -1 }, { name: 'target_uploadedAt' })

  await records.createIndex({ characterName: 1, bossKey: 1, dps: -1 }, { name: 'char_boss_dps' })
  await records.createIndex({ characterName: 1, bossGroup: 1, dps: -1 }, { name: 'char_bossGroup_dps' })
  await records.createIndex({ dungeonName: 1, bossKey: 1, dps: -1 }, { name: 'dungeon_boss_dps' })
  await records.createIndex({ dungeonName: 1, bossGroup: 1, dps: -1 }, { name: 'dungeon_bossGroup_dps' })
  await records.createIndex({ bossKey: 1, dps: -1 }, { name: 'boss_dps' })
  await records.createIndex({ bossGroup: 1, dps: -1 }, { name: 'bossGroup_dps' })
  await records.createIndex({ runId: 1 }, { name: 'runId' })
  await records.createIndex({ characterId: 1, bossKey: 1, dps: -1 }, { name: 'charId_boss_dps' })

  await nonces.createIndex({ createdAt: 1 }, { expireAfterSeconds: nonceTtlSeconds, name: 'nonce_ttl' })

  indexesReady = true
}

function newReportId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return crypto.randomBytes(16).toString('hex')
}

async function findDuplicate({ playerId, contentSha256, fileName }) {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)
  return col.findOne({
    $or: [
      { playerId, contentSha256 },
      { playerId, fileName }
    ]
  })
}

async function insertPendingReport(doc) {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)
  await col.insertOne(doc)
  return doc
}

async function updateReportParsed(reportId, summary) {
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)
  await col.updateOne(
    { _id: reportId },
    {
      $set: {
        status: 'parsed',
        parseError: null,
        parsedAt: new Date(),
        ...summary
      }
    }
  )
}

async function updateReportFailed(reportId, parseError) {
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)
  await col.updateOne(
    { _id: reportId },
    {
      $set: {
        status: 'failed',
        parseError,
        parsedAt: new Date()
      }
    }
  )
}

async function getReportById(reportId) {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_UPLOADS).findOne({ _id: reportId })
}

async function listReports({ playerId, limit = 20, skip = 0 } = {}) {
  await ensureIndexes()
  const client = await getClient()
  const query = {}
  if (playerId) query.playerId = String(playerId)
  return client.db(DB_NAME).collection(COL_UPLOADS)
    .find(query, {
      projection: {
        sourceRelPath: 0
      }
    })
    .sort({ uploadedAt: -1 })
    .skip(skip)
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray()
}

async function listPendingReports(limit = 50) {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_UPLOADS)
    .find({ status: 'pending' })
    .sort({ uploadedAt: 1 })
    .limit(limit)
    .toArray()
}

async function reserveNonce(nonce) {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_NONCE)
  try {
    await col.insertOne({ _id: nonce, createdAt: new Date() })
    return true
  } catch (error) {
    if (error && error.code === 11000) {
      return false
    }
    throw error
  }
}

async function findTeamDuplicate({ dungeonName, teamSignature }) {
  if (!teamSignature) return null
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)
  const since = new Date(Date.now() - TEAM_DEDUP_MS)
  return col.findOne({
    dungeonName,
    teamSignature,
    uploadedAt: { $gte: since },
    status: { $in: ['pending', 'parsed'] }
  })
}

async function insertDpsRecords(items) {
  if (!items || !items.length) return
  await ensureIndexes()
  const client = await getClient()
  await client.db(DB_NAME).collection(COL_RECORDS).insertMany(items)
}

async function listDpsRecords(query, { sort = { dps: -1 }, limit = 100 } = {}) {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_RECORDS)
    .find(query)
    .sort(sort)
    .limit(limit)
    .toArray()
}

async function listRecordsByCharacter(characterName, limitPerBoss = 3) {
  const regex = new RegExp(characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const all = await listDpsRecords({ characterName: regex }, { limit: 500 })
  return groupTopByBoss(all, limitPerBoss)
}

async function listRecordsByDungeon(dungeonName, limitPerBoss = 10) {
  const regex = new RegExp(dungeonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const all = await listDpsRecords({ dungeonName: regex }, { limit: 1000 })
  return groupTopByBoss(all, limitPerBoss)
}

async function listRecordsByBoss(groupKey, limit = 10) {
  const bossKeys = getBossKeysByGroup(groupKey)
  const all = await listDpsRecords({
    $or: [
      { bossGroup: groupKey },
      { bossKey: { $in: bossKeys } }
    ]
  }, { limit: 500 })
  return all.sort((a, b) => b.dps - a.dps).slice(0, limit)
}

function groupTopByBoss(records, limitPerBoss) {
  const groups = new Map()
  for (const record of records) {
    const key = resolveBossGroupKey(record.bossGroup || record.bossKey || record.bossName || 'unknown')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(record)
  }

  const result = []
  for (const [groupKey, items] of groups) {
    const sorted = items.sort((a, b) => b.dps - a.dps).slice(0, limitPerBoss)
    result.push({
      bossKey: groupKey,
      bossName: sorted[0]?.bossName || groupKey,
      records: sorted
    })
  }

  result.sort((a, b) => getGroupSortHp(a.bossKey) - getGroupSortHp(b.bossKey))
  return result
}

module.exports = {
  newReportId,
  findDuplicate,
  findTeamDuplicate,
  insertPendingReport,
  insertDpsRecords,
  updateReportParsed,
  updateReportFailed,
  getReportById,
  listReports,
  listPendingReports,
  listDpsRecords,
  listRecordsByCharacter,
  listRecordsByDungeon,
  listRecordsByBoss,
  reserveNonce
}
