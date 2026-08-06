// Backfill cl_mabinogi_dps_ranking_consent.serverId from an explicit mapping.
// Usage:
//   node script/backfillRankingConsentServers.js --mapping ranking-servers.json
//   node script/backfillRankingConsentServers.js --mapping ranking-servers.json --apply
// Mapping format: { "playerId": "yate", "anotherPlayerId": "yiluxia" }
const fs = require('fs')
const path = require('path')
const { getClient } = require('../mongo/index')

const DB_NAME = 'db_bot'
const COLLECTION = 'cl_mabinogi_dps_ranking_consent'

function normalizeServerId(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (['yate', '亚特'].includes(raw)) return 'yate'
  if (['yiluxia', 'ylx', '伊鲁夏'].includes(raw)) return 'yiluxia'
  return ''
}

function parseCli(argv) {
  const apply = argv.includes('--apply')
  const mappingArg = argv.find(arg => arg.startsWith('--mapping='))
  const mappingIndex = argv.indexOf('--mapping')
  const mappingPath = mappingArg
    ? mappingArg.slice('--mapping='.length).trim()
    : mappingIndex >= 0 ? String(argv[mappingIndex + 1] || '').trim() : ''
  if (!mappingPath) throw new Error('--mapping requires a JSON file')
  return { apply, mappingPath }
}

function loadMapping(filePath) {
  const absolutePath = path.resolve(filePath)
  const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  const source = Array.isArray(parsed) ? parsed : Object.entries(parsed || {}).map(([playerId, serverId]) => ({ playerId, serverId }))
  const mapping = new Map()
  for (const item of source) {
    const playerId = String(item.playerId || item.id || '').trim()
    const serverId = normalizeServerId(item.serverId || item.server || item.name)
    if (!playerId || !serverId) continue
    mapping.set(playerId, serverId)
  }
  return mapping
}

async function main() {
  const { apply, mappingPath } = parseCli(process.argv.slice(2))
  const mapping = loadMapping(mappingPath)
  const client = await getClient()
  if (!client) throw new Error('Unable to connect to MongoDB')

  try {
    const collection = client.db(DB_NAME).collection(COLLECTION)
    const rows = await collection.find({}).sort({ createdAt: 1 }).toArray()
    const candidates = rows
      .map(row => ({ row, serverId: mapping.get(String(row.playerId || '').trim()) }))
      .filter(item => item.serverId && item.row.serverId !== item.serverId)

    console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
    console.log(`Mapping entries: ${mapping.size}`)
    console.log(`Candidates: ${candidates.length}`)
    for (const { row, serverId } of candidates) {
      console.log(`${row.playerId}: ${row.serverId || '(empty)'} -> ${serverId}`)
    }

    if (!apply) {
      console.log('No data changed. Re-run with --apply after checking the preview.')
      return
    }

    let updated = 0
    let skipped = 0
    for (const { row, serverId } of candidates) {
      const result = await collection.updateOne(
        { _id: row._id, $or: [{ serverId: { $exists: false } }, { serverId: '' }, { serverId: null }] },
        { $set: { serverId, serverUpdatedAt: new Date() } }
      )
      if (result.modifiedCount || result.nModified) updated++
      else skipped++
    }
    console.log(`Updated: ${updated}`)
    console.log(`Skipped because a server was already set or changed: ${skipped}`)
  } finally {
    await client.close()
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message || error)
    process.exit(1)
  })
}

module.exports = {
  normalizeServerId,
  parseCli,
  loadMapping
}
