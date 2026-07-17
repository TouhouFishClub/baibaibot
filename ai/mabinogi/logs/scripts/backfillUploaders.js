/**
 * 为已有 DPS 记录回填 uploaderName / uploaderId（从 cl_mabinogi_dps_upload 按 runId 关联）。
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/backfillUploaders.js           # dry-run
 *   node ai/mabinogi/logs/scripts/backfillUploaders.js --yes    # 实际写入
 */
const { getClient } = require('../../../../mongo/index')

const DB_NAME = 'db_bot'
const COL_UPLOADS = 'cl_mabinogi_dps_upload'
const COL_RECORDS = 'cl_mabinogi_dps_records'

function parseArgs(argv) {
  return { yes: argv.includes('--yes') }
}

function normalizeRunId(id) {
  return String(id || '').trim().toLowerCase().replace(/-/g, '')
}

function buildUploadIndex(uploads) {
  const byExact = new Map()
  const byNorm = new Map()

  for (const upload of uploads) {
    const info = {
      uploaderName: upload.playerName || '',
      uploaderId: upload.playerId || ''
    }
    if (!info.uploaderName && !info.uploaderId) continue

    byExact.set(String(upload._id), info)
    const norm = normalizeRunId(upload._id)
    if (norm) byNorm.set(norm, info)
  }

  return { byExact, byNorm }
}

function resolveUploader(runId, index) {
  if (runId == null || runId === '') return null
  const exact = index.byExact.get(String(runId))
  if (exact) return exact

  const norm = normalizeRunId(runId)
  if (!norm) return null
  const byNorm = index.byNorm.get(norm)
  if (byNorm) return byNorm

  // 短 ID 前缀匹配（兼容历史展示用的 8 位短场次）
  if (norm.length >= 6 && norm.length < 32) {
    for (const [uploadNorm, info] of index.byNorm) {
      if (uploadNorm.startsWith(norm)) return info
    }
  }
  return null
}

function needsBackfill(record) {
  const hasName = String(record.uploaderName || '').trim()
  const hasId = String(record.uploaderId || '').trim()
  return !hasName && !hasId
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const client = await getClient()
  if (!client) {
    throw new Error('MongoDB 连接失败')
  }

  const uploadsCol = client.db(DB_NAME).collection(COL_UPLOADS)
  const recordsCol = client.db(DB_NAME).collection(COL_RECORDS)

  console.log('[backfillUploaders] loading uploads…')
  const uploads = await uploadsCol.find(
    {},
    { projection: { playerName: 1, playerId: 1 } }
  ).toArray()
  const index = buildUploadIndex(uploads)
  console.log(`[backfillUploaders] uploads=${uploads.length} indexed=${index.byNorm.size}`)

  console.log('[backfillUploaders] scanning records missing uploader…')
  const cursor = recordsCol.find({
    $or: [
      { uploaderName: { $exists: false } },
      { uploaderName: null },
      { uploaderName: '' },
      { uploaderId: { $exists: false } },
      { uploaderId: null },
      { uploaderId: '' }
    ]
  }, {
    projection: { _id: 1, runId: 1, uploaderName: 1, uploaderId: 1, characterName: 1 }
  })

  let scanned = 0
  let matched = 0
  let skippedHasValue = 0
  let missingUpload = 0
  let updated = 0
  const sampleMissing = []

  const bulk = []
  const flushBulk = async () => {
    if (!bulk.length) return
    if (args.yes) {
      const result = await recordsCol.bulkWrite(bulk, { ordered: false })
      updated += result.modifiedCount || 0
    }
    bulk.length = 0
  }

  while (await cursor.hasNext()) {
    const record = await cursor.next()
    scanned += 1
    if (!needsBackfill(record)) {
      skippedHasValue += 1
      continue
    }

    const info = resolveUploader(record.runId, index)
    if (!info) {
      missingUpload += 1
      if (sampleMissing.length < 10) {
        sampleMissing.push({
          recordId: record._id,
          runId: record.runId,
          characterName: record.characterName
        })
      }
      continue
    }

    matched += 1
    bulk.push({
      updateOne: {
        filter: { _id: record._id },
        update: {
          $set: {
            uploaderName: info.uploaderName,
            uploaderId: info.uploaderId
          }
        }
      }
    })

    if (bulk.length >= 500) {
      await flushBulk()
    }
  }

  await flushBulk()

  console.log(`[backfillUploaders] mode=${args.yes ? 'WRITE' : 'DRY-RUN'}`)
  console.log(`[backfillUploaders] scanned=${scanned} matched=${matched} missingUpload=${missingUpload} skippedHasValue=${skippedHasValue} updated=${updated}`)
  if (sampleMissing.length) {
    console.log('[backfillUploaders] sample missing upload mapping:')
    for (const item of sampleMissing) {
      console.log(`  runId=${item.runId} character=${item.characterName} record=${item.recordId}`)
    }
  }
  if (!args.yes) {
    console.log('[backfillUploaders] 预览完成。确认无误后加 --yes 写入。')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[backfillUploaders] failed', error)
    process.exit(1)
  })
