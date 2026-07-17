const { getClient } = require('../../../mongo/index')

const DB_NAME = 'db_bot'
const COL_SNAPSHOTS = 'cl_mabinogi_dps_ai_snapshots'
const COL_REPORTS = 'cl_mabinogi_dps_ai_reports'

let indexesReady = false

function getShanghaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

async function ensureIndexes() {
  if (indexesReady) return
  const client = await getClient()
  const snapshots = client.db(DB_NAME).collection(COL_SNAPSHOTS)
  const reports = client.db(DB_NAME).collection(COL_REPORTS)

  await snapshots.createIndex({ createdAt: -1 }, { name: 'createdAt_desc' })
  await snapshots.createIndex({ dateKey: 1, createdAt: -1 }, { name: 'dateKey_createdAt' })
  await reports.createIndex({ dateKey: 1 }, { unique: true, name: 'uniq_dateKey' })

  indexesReady = true
}

async function insertAiSnapshot(doc) {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_SNAPSHOTS)
  await col.insertOne(doc)
  return doc
}

async function getLatestAiSnapshot() {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_SNAPSHOTS)
  const rows = await col.find({}).sort({ createdAt: -1 }).limit(1).toArray()
  return rows[0] || null
}

async function getAiSnapshotById(id) {
  if (!id) return null
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_SNAPSHOTS).findOne({ _id: id })
}

async function getDailyAiReport(dateKey = getShanghaiDateKey()) {
  await ensureIndexes()
  const client = await getClient()
  return client.db(DB_NAME).collection(COL_REPORTS).findOne({ dateKey })
}

async function upsertDailyAiReport(doc) {
  await ensureIndexes()
  const client = await getClient()
  const col = client.db(DB_NAME).collection(COL_REPORTS)
  const dateKey = doc.dateKey || getShanghaiDateKey()
  const now = new Date()
  const payload = {
    ...doc,
    dateKey,
    updatedAt: now
  }
  await col.updateOne(
    { dateKey },
    {
      $set: payload,
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  )
  return payload
}

module.exports = {
  getShanghaiDateKey,
  insertAiSnapshot,
  getLatestAiSnapshot,
  getAiSnapshotById,
  getDailyAiReport,
  upsertDailyAiReport
}
