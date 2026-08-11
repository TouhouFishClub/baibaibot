const crypto = require('crypto')
const { getClient } = require('../../../mongo/index')
const { TEAM_DEDUP_MS } = require('./team')
const { nonceTtlSeconds } = require('./config')
const { getBossKeysByGroup, getGroupSortHp, resolveBossGroupKey } = require('./bossConfig')

const DB_NAME = 'db_bot'
const COL_UPLOADS = 'cl_mabinogi_dps_upload'
const COL_RECORDS = 'cl_mabinogi_dps_records'
const COL_NONCE = 'cl_mabinogi_dps_nonce'
const COL_RANKING_CONSENT = 'cl_mabinogi_dps_ranking_consent'
const COL_ANNOUNCEMENTS = 'cl_mabinogi_dps_announcements'
const COL_BUFF_MONITOR = 'cl_mabinogi_dps_buff_monitor'

let indexesReady = false

async function ensureIndexes() {
  if (indexesReady) return
  const client = await getClient()
  const uploads = client.db(DB_NAME).collection(COL_UPLOADS)
  const records = client.db(DB_NAME).collection(COL_RECORDS)
  const nonces = client.db(DB_NAME).collection(COL_NONCE)
  const rankingConsent = client.db(DB_NAME).collection(COL_RANKING_CONSENT)
  const announcements = client.db(DB_NAME).collection(COL_ANNOUNCEMENTS)
  const buffMonitors = client.db(DB_NAME).collection(COL_BUFF_MONITOR)

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
  await rankingConsent.createIndex({ playerId: 1 }, { unique: true, name: 'uniq_player_id' })
  await rankingConsent.createIndex({ mode: 1, playerId: 1 }, { name: 'mode_player_id' })
  await announcements.createIndex({ timestamp: -1 }, { name: 'timestamp_desc' })
  await announcements.createIndex({ sourceHash: 1 }, { unique: true, sparse: true, name: 'uniq_source_hash' })
  await buffMonitors.createIndex({ 'targets.targetId': 1 }, { name: 'target_id' })
  await buffMonitors.createIndex({ 'targets.players.playerId': 1 }, { name: 'player_id' })
  await buffMonitors.createIndex({ 'targets.players.buffs.conditionId': 1 }, { name: 'condition_id' })

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

function normalizeRunId(id) {
  return String(id || '').trim().toLowerCase().replace(/-/g, '')
}

async function findReportByRunId(runId) {
  const raw = String(runId || '').trim()
  if (!raw) return null

  await ensureIndexes()
  const exact = await getReportById(raw)
  if (exact) return exact

  const normalized = raw.toLowerCase().replace(/-/g, '')
  if (!/^[0-9a-f]{6,32}$/.test(normalized)) {
    return null
  }

  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)
  const rows = await col.find({
    status: { $in: ['parsed', 'failed'] }
  })
    .sort({ uploadedAt: -1 })
    .limit(300)
    .toArray()

  for (const item of rows) {
    const id = String(item._id || '').toLowerCase().replace(/-/g, '')
    if (id === normalized || id.startsWith(normalized)) {
      return item
    }
  }
  return null
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

async function upsertBuffMonitor(reportId, payload, { onlyIfMissing = false } = {}) {
  await ensureIndexes()
  const client = await getClient()
  const db = client.db(DB_NAME)
  const col = db.collection(COL_BUFF_MONITOR)
  const id = String(reportId)

  if (onlyIfMissing) {
    const existing = await col.findOne({ _id: id }, { _id: 1 })
    if (existing) return { stored: false, existing: true }
  }

  const now = new Date()
  try {
    await col.updateOne(
      { _id: id },
      {
        $set: {
          source: payload.source,
          schemaVersion: payload.schemaVersion,
          contentSha256: payload.contentSha256,
          definitions: payload.definitions,
          targets: payload.targets,
          stats: payload.stats,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    )
  } catch (error) {
    if (!(onlyIfMissing && error?.code === 11000)) throw error
    return { stored: false, existing: true }
  }

  await db.collection(COL_UPLOADS).updateOne(
    { _id: reportId },
    {
      $set: {
        buffMonitor: {
          available: true,
          schemaVersion: payload.schemaVersion,
          contentSha256: payload.contentSha256,
          stats: payload.stats,
          updatedAt: now
        }
      }
    }
  )
  return { stored: true, existing: false }
}

async function getBuffMonitorByReportId(reportId) {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_BUFF_MONITOR).findOne({ _id: String(reportId) })
}

async function getRankingConsent(playerId) {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_RANKING_CONSENT).findOne({ playerId: String(playerId) })
}

async function getRankingConsentsByPlayerIds(playerIds) {
  const ids = [...new Set((playerIds || []).map(id => String(id || '').trim()).filter(Boolean))]
  const result = new Map()
  if (!ids.length) return result

  await ensureIndexes()
  const client = await getClient()
  const rows = await client.db(DB_NAME).collection(COL_RANKING_CONSENT)
    .find({ playerId: { $in: ids } })
    .toArray()
  for (const row of rows) result.set(String(row.playerId), row)
  return result
}

async function listConsentedPlayerIds() {
  await ensureIndexes()
  const client = await getClient()
  const rows = await client.db(DB_NAME).collection(COL_RANKING_CONSENT)
    .find({ mode: { $in: ['anonymous', 'public'] } }, { playerId: 1 })
    .toArray()
  return rows.map(row => String(row.playerId || '')).filter(Boolean)
}

async function upsertRankingConsent({ playerId, mode, playerName = '', serverId = '', clientVersion = '' }) {
  await ensureIndexes()
  const client = await getClient()
  const now = new Date()
  const id = String(playerId)
  const set = {
    mode,
    playerName: String(playerName || '').trim(),
    clientVersion: String(clientVersion || '').trim(),
    updatedAt: now
  }
  const normalizedServerId = String(serverId || '').trim().toLowerCase()
  if (normalizedServerId) set.serverId = normalizedServerId

  await client.db(DB_NAME).collection(COL_RANKING_CONSENT).updateOne(
    { playerId: id },
    {
      $set: set,
      $setOnInsert: { playerId: id, createdAt: now }
    },
    { upsert: true }
  )
  return { playerId: id, mode, serverId: normalizedServerId, updatedAt: now }
}

async function updateRankingConsentName(playerId, playerName) {
  const id = String(playerId || '').trim()
  const name = String(playerName || '').trim()
  if (!id || !name) return false

  await ensureIndexes()
  const client = await getClient()
  const result = await client.db(DB_NAME).collection(COL_RANKING_CONSENT).updateOne(
    { playerId: id, mode: 'public', playerName: { $ne: name } },
    { $set: { playerName: name, nameUpdatedAt: new Date() } }
  )
  return Boolean(result.modifiedCount || result.nModified)
}

async function listAnnouncements() {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_ANNOUNCEMENTS)
    .find({}, { _id: 0, timestamp: 1, title: 1, html: 1 })
    .sort({ timestamp: -1 })
    .limit(100)
    .toArray()
}

async function publishAnnouncement({ title, html, sourceHash, sourceMtimeMs }) {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_ANNOUNCEMENTS)
  const existing = await col.findOne({ sourceHash })
  if (existing) return { created: false, announcement: existing }

  const latest = await col.find({}).sort({ timestamp: -1 }).limit(1).toArray()
  const latestTimestamp = Number(latest[0]?.timestamp) || 0
  const timestamp = Math.max(Math.floor(Date.now() / 1000), latestTimestamp + 1)
  const announcement = {
    timestamp,
    title: String(title),
    html: String(html),
    sourceHash,
    sourceMtimeMs: Number(sourceMtimeMs) || null,
    source: 'announcement.html',
    publishedAt: new Date()
  }

  try {
    await col.insertOne(announcement)
    return { created: true, announcement }
  } catch (error) {
    if (error?.code === 11000) {
      return { created: false, announcement: await col.findOne({ sourceHash }) }
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

function dedupeBestPerCharacter(records) {
  const best = new Map()
  for (const record of records) {
    const key = String(record.characterId || record.characterName || '').trim()
    if (!key) continue
    const prev = best.get(key)
    if (!prev || Number(record.dps) > Number(prev.dps)) {
      best.set(key, record)
    }
  }
  return [...best.values()]
}

function appendRecordFilters(query, { characterClass, characterIds } = {}) {
  const result = { ...query }
  if (characterClass) result.characterClass = String(characterClass)
  if (Array.isArray(characterIds)) {
    result.characterId = { $in: characterIds.map(id => String(id)) }
  }
  return result
}

async function listRecordsByCharacter(characterName, limitPerBoss = 3, { characterClass, characterIds } = {}) {
  const regex = new RegExp(characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const all = await listDpsRecords(appendRecordFilters({ characterName: regex }, { characterClass, characterIds }), { limit: 500 })
  return groupTopByBoss(all, limitPerBoss)
}

async function listRecordsByDungeon(dungeonName, limitPerBoss = 10, { bestPerCharacter = true, characterClass, characterIds } = {}) {
  const regex = new RegExp(dungeonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const all = await listDpsRecords(appendRecordFilters({ dungeonName: regex }, { characterClass, characterIds }), { limit: 1000 })
  return groupTopByBoss(all, limitPerBoss, { bestPerCharacter })
}

async function listRecordsByBoss(groupKey, limit = 10, { bestPerCharacter = true, characterClass, characterIds } = {}) {
  const bossKeys = getBossKeysByGroup(groupKey)
  const all = await listDpsRecords(appendRecordFilters({
    $or: [
      { bossGroup: groupKey },
      { bossKey: { $in: bossKeys } }
    ]
  }, { characterClass, characterIds }), { limit: 500 })
  let sorted = all.sort((a, b) => b.dps - a.dps)
  if (bestPerCharacter) {
    sorted = dedupeBestPerCharacter(sorted)
  }
  return sorted.slice(0, limit)
}

function groupTopByBoss(records, limitPerBoss, { bestPerCharacter = false } = {}) {
  const groups = new Map()
  for (const record of records) {
    const key = resolveBossGroupKey(record.bossGroup || record.bossKey || record.bossName || 'unknown')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(record)
  }

  const result = []
  for (const [groupKey, items] of groups) {
    let candidates = items
    if (bestPerCharacter) {
      candidates = dedupeBestPerCharacter(items)
    }
    const sorted = candidates.sort((a, b) => b.dps - a.dps).slice(0, limitPerBoss)
    result.push({
      bossKey: groupKey,
      bossName: sorted[0]?.bossName || groupKey,
      records: sorted
    })
  }

  result.sort((a, b) => getGroupSortHp(a.bossKey) - getGroupSortHp(b.bossKey))
  return result
}

async function getUploadersByRunIds(runIds) {
  const rawIds = [...new Set((runIds || []).filter(id => id != null && String(id).trim()))]
  const map = new Map()
  if (!rawIds.length) return map

  const put = (key, info) => {
    if (key == null || key === '') return
    map.set(String(key), info)
    const norm = normalizeRunId(key)
    if (norm) map.set(norm, info)
  }

  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_UPLOADS)

  // 仅按本次需要的 runId 精确查，不做全表扫描（日常查询兜底用）
  const queryIds = [...new Set(rawIds.flatMap(id => [id, String(id)]))]
  // mongodb@2.x：第二参是 fields，不能用 projection（会被当成只要名叫 projection 的字段）
  const rows = await col.find(
    { _id: { $in: queryIds } },
    { _id: 1, playerName: 1, playerId: 1 }
  ).toArray()

  for (const row of rows) {
    put(row._id, {
      playerName: row.playerName || '',
      playerId: row.playerId || ''
    })
  }

  for (const runId of rawIds) {
    if (map.get(String(runId)) || map.get(normalizeRunId(runId))) continue
    const report = await findReportByRunId(runId)
    if (!report) continue
    put(runId, {
      playerName: report.playerName || '',
      playerId: report.playerId || ''
    })
    put(report._id, {
      playerName: report.playerName || '',
      playerId: report.playerId || ''
    })
  }

  return map
}

module.exports = {
  newReportId,
  findDuplicate,
  findTeamDuplicate,
  insertPendingReport,
  upsertBuffMonitor,
  getBuffMonitorByReportId,
  insertDpsRecords,
  updateReportParsed,
  updateReportFailed,
  getReportById,
  findReportByRunId,
  getUploadersByRunIds,
  normalizeRunId,
  listReports,
  listPendingReports,
  listDpsRecords,
  listRecordsByCharacter,
  listRecordsByDungeon,
  listRecordsByBoss,
  dedupeBestPerCharacter,
  reserveNonce,
  getRankingConsent,
  getRankingConsentsByPlayerIds,
  upsertRankingConsent,
  updateRankingConsentName,
  listAnnouncements,
  publishAnnouncement,
  listConsentedPlayerIds
}
