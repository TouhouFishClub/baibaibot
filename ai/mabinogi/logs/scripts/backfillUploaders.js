/**
 * 为已有 DPS 记录回填 uploaderName / uploaderId（从 cl_mabinogi_dps_upload 按 runId 关联）。
 *
 * 注意：项目使用 mongodb@2.x，find 第二参是 fields，不是 projection。
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
      uploaderName: String(upload.playerName || '').trim(),
      uploaderId: String(upload.playerId || '').trim()
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
  // mongodb@2.x：不要传 projection；第二参会被当成 fields 过滤器
  const uploads = await uploadsCol.find({}).toArray()
  console.log(`[backfillUploaders] sample upload keys=${Object.keys(uploads[0] || {}).join(',')}`)
  console.log(`[backfillUploaders] sample upload=`, {
    _id: uploads[0] && uploads[0]._id,
    playerId: uploads[0] && uploads[0].playerId,
    playerName: uploads[0] && uploads[0].playerName
  })

  const index = buildUploadIndex(uploads)
  console.log(`[backfillUploaders] uploads=${uploads.length} indexed=${index.byNorm.size}`)

  console.log('[backfillUploaders] loading records…')
  const records = await recordsCol.find({}).toArray()
  console.log(`[backfillUploaders] sample record keys=${Object.keys(records[0] || {}).join(',')}`)
  console.log(`[backfillUploaders] sample record=`, {
    _id: records[0] && records[0]._id,
    runId: records[0] && records[0].runId,
    characterName: records[0] && records[0].characterName,
    uploaderName: records[0] && records[0].uploaderName
  })

  let scanned = 0
  let matched = 0
  let skippedHasValue = 0
  let missingUpload = 0
  let missingRunId = 0
  let updated = 0
  const sampleMissing = []
  const bulk = []

  const flushBulk = async () => {
    if (!bulk.length) return
    if (args.yes) {
      // mongodb@2.x 也可能没有 bulkWrite；退化为逐条 update
      if (typeof recordsCol.bulkWrite === 'function') {
        const result = await recordsCol.bulkWrite(bulk, { ordered: false })
        updated += (result.modifiedCount || result.nModified || bulk.length)
      } else {
        for (const op of bulk) {
          const r = await recordsCol.updateOne(op.updateOne.filter, op.updateOne.update)
          updated += (r.modifiedCount || r.result && r.result.nModified || 0)
        }
      }
    }
    bulk.length = 0
  }

  for (const record of records) {
    scanned += 1
    if (!needsBackfill(record)) {
      skippedHasValue += 1
      continue
    }
    if (record.runId == null || record.runId === '') {
      missingRunId += 1
      if (sampleMissing.length < 10) {
        sampleMissing.push({
          reason: 'no-runId',
          recordId: record._id,
          keys: Object.keys(record)
        })
      }
      continue
    }

    const info = resolveUploader(record.runId, index)
    if (!info) {
      missingUpload += 1
      if (sampleMissing.length < 10) {
        sampleMissing.push({
          reason: 'no-upload',
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

    if (bulk.length >= 200) {
      await flushBulk()
    }
  }

  await flushBulk()

  console.log(`[backfillUploaders] mode=${args.yes ? 'WRITE' : 'DRY-RUN'}`)
  console.log(`[backfillUploaders] scanned=${scanned} matched=${matched} missingUpload=${missingUpload} missingRunId=${missingRunId} skippedHasValue=${skippedHasValue} updated=${updated}`)
  if (sampleMissing.length) {
    console.log('[backfillUploaders] sample issues:')
    for (const item of sampleMissing) {
      console.log(' ', JSON.stringify(item))
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
