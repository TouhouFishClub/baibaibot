/**
 * 检查 SOURCE_ROOT（或指定目录）里已有 *.json.gz，但未正确入库的文件。
 *
 * 分类：
 *   missing_upload   目录有文件，库里无对应 upload（按 contentSha256 / sourceRelPath）
 *   missing_records  有 upload，但 cl_mabinogi_dps_records 无该 runId 记录
 *   failed_upload    有 upload 且 status=failed（或 validRecordCount=0）
 *   ok               有 upload 且有 records
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/checkOrphanSources.js
 *   node ai/mabinogi/logs/scripts/checkOrphanSources.js --dir "G:/github/mabidata/logs"
 *   node ai/mabinogi/logs/scripts/checkOrphanSources.js --json
 *   node ai/mabinogi/logs/scripts/checkOrphanSources.js --only missing_upload,missing_records
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getClient } = require('../../../../mongo/index')
const { SOURCE_ROOT } = require('../config')

const DB_NAME = 'db_bot'
const COL_UPLOADS = 'cl_mabinogi_dps_upload'
const COL_RECORDS = 'cl_mabinogi_dps_records'

const ALL_KINDS = ['missing_upload', 'missing_records', 'failed_upload', 'ok']

function parseArgs(argv) {
  const args = {
    dir: SOURCE_ROOT,
    json: false,
    only: null,
    limit: null
  }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--dir') args.dir = String(argv[++i] || '').trim() || SOURCE_ROOT
    else if (token === '--json') args.json = true
    else if (token === '--only') {
      const raw = String(argv[++i] || '').trim()
      args.only = new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
    } else if (token === '--limit') {
      const n = Number(argv[++i])
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n)
    }
  }
  return args
}

function walkJsonGz(rootDir) {
  const results = []
  if (!fs.existsSync(rootDir)) return results

  function walk(dir, relParts) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, [...relParts, entry.name])
        continue
      }
      if (!entry.name.endsWith('.json.gz')) continue
      const contentSha256 = entry.name.replace(/\.json\.gz$/i, '').toLowerCase()
      results.push({
        absolutePath: full,
        relativePath: [...relParts, entry.name].join('/'),
        contentSha256,
        bytes: fs.statSync(full).size
      })
    }
  }

  walk(rootDir, [])
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function normalizeRel(rel) {
  return String(rel || '').replace(/\\/g, '/').toLowerCase()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rootDir = path.resolve(args.dir)

  console.log(`[check] SOURCE_ROOT=${SOURCE_ROOT}`)
  console.log(`[check] scanDir=${rootDir}`)

  const files = walkJsonGz(rootDir)
  console.log(`[check] files=${files.length}`)

  if (!files.length) {
    console.log('[check] 目录为空或不存在，结束')
    return
  }

  const client = await getClient()
  const uploadsCol = client.db(DB_NAME).collection(COL_UPLOADS)
  const recordsCol = client.db(DB_NAME).collection(COL_RECORDS)

  const uploads = await uploadsCol.find(
    {},
    {
      projection: {
        _id: 1,
        playerId: 1,
        playerName: 1,
        contentSha256: 1,
        sourceRelPath: 1,
        status: 1,
        validRecordCount: 1,
        dungeonName: 1,
        uploadedAt: 1,
        failReason: 1
      }
    }
  ).toArray()

  const bySha = new Map()
  const byRel = new Map()
  for (const upload of uploads) {
    const sha = String(upload.contentSha256 || '').toLowerCase()
    if (sha) {
      if (!bySha.has(sha)) bySha.set(sha, [])
      bySha.get(sha).push(upload)
    }
    const rel = normalizeRel(upload.sourceRelPath)
    if (rel) {
      if (!byRel.has(rel)) byRel.set(rel, [])
      byRel.get(rel).push(upload)
    }
  }

  const runIds = uploads.map(u => u._id)
  const recordCounts = new Map()
  if (runIds.length) {
    const grouped = await recordsCol.aggregate([
      { $match: { runId: { $in: runIds.map(String) } } },
      { $group: { _id: '$runId', count: { $sum: 1 } } }
    ]).toArray()
    for (const row of grouped) {
      recordCounts.set(String(row._id), row.count)
    }
  }

  const summary = {
    files: files.length,
    uploads: uploads.length,
    missing_upload: 0,
    missing_records: 0,
    failed_upload: 0,
    ok: 0,
    hash_mismatch: 0
  }

  const details = {
    missing_upload: [],
    missing_records: [],
    failed_upload: [],
    ok: [],
    hash_mismatch: []
  }

  let scanned = 0
  for (const file of files) {
    scanned++
    if (args.limit && scanned > args.limit) break

    let matched = bySha.get(file.contentSha256) || []
    if (!matched.length) {
      matched = byRel.get(normalizeRel(file.relativePath)) || []
    }

    // 文件名不是 sha 时，用内容 hash 再匹配一次
    let contentHash = file.contentSha256
    const looksLikeSha = /^[0-9a-f]{64}$/i.test(file.contentSha256)
    if (!matched.length || !looksLikeSha) {
      contentHash = sha256File(file.absolutePath)
      if (contentHash !== file.contentSha256) {
        details.hash_mismatch.push({
          relativePath: file.relativePath,
          fileNameSha: file.contentSha256,
          contentSha256: contentHash
        })
        summary.hash_mismatch++
      }
      if (!matched.length) {
        matched = bySha.get(contentHash) || []
      }
    }

    if (!matched.length) {
      const item = {
        kind: 'missing_upload',
        relativePath: file.relativePath,
        contentSha256: contentHash,
        bytes: file.bytes
      }
      details.missing_upload.push(item)
      summary.missing_upload++
      continue
    }

    // 同一 sha 可能有多条（异常）；取第一条，并汇总 records
    const upload = matched[0]
    const recordCount = matched.reduce(
      (sum, row) => sum + (recordCounts.get(String(row._id)) || 0),
      0
    )
    const status = String(upload.status || '')
    const validCount = Number(upload.validRecordCount) || 0

    const base = {
      relativePath: file.relativePath,
      contentSha256: contentHash,
      reportId: upload._id,
      playerId: upload.playerId,
      playerName: upload.playerName,
      status,
      validRecordCount: validCount,
      recordCount,
      dungeonName: upload.dungeonName,
      failReason: upload.failReason || null
    }

    if (recordCount <= 0) {
      if (status === 'failed' || validCount <= 0) {
        details.failed_upload.push({ kind: 'failed_upload', ...base })
        summary.failed_upload++
      } else {
        details.missing_records.push({ kind: 'missing_records', ...base })
        summary.missing_records++
      }
      continue
    }

    details.ok.push({ kind: 'ok', ...base })
    summary.ok++
  }

  const showKinds = args.only || new Set(['missing_upload', 'missing_records', 'failed_upload'])

  if (args.json) {
    const payload = { summary, details: {} }
    for (const kind of ALL_KINDS) {
      if (showKinds.has(kind)) payload.details[kind] = details[kind]
    }
    if (details.hash_mismatch.length) payload.details.hash_mismatch = details.hash_mismatch
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  console.log('\n[check] summary')
  console.log(summary)

  for (const kind of ['missing_upload', 'missing_records', 'failed_upload']) {
    if (!showKinds.has(kind)) continue
    const list = details[kind]
    console.log(`\n[check] ${kind} (${list.length})`)
    for (const item of list) {
      if (kind === 'missing_upload') {
        console.log(`  - ${item.relativePath} sha=${item.contentSha256.slice(0, 12)}… ${item.bytes}B`)
      } else {
        console.log(
          `  - ${item.relativePath} report=${item.reportId} status=${item.status}`
          + ` records=${item.recordCount} valid=${item.validRecordCount}`
          + (item.failReason ? ` reason=${item.failReason}` : '')
          + ` player=${item.playerName || item.playerId || '?'}`
        )
      }
    }
  }

  if (details.hash_mismatch.length) {
    console.log(`\n[check] hash_mismatch (${details.hash_mismatch.length}) 文件名与内容 sha 不一致`)
    for (const item of details.hash_mismatch.slice(0, 20)) {
      console.log(`  - ${item.relativePath}`)
      console.log(`      name=${item.fileNameSha}`)
      console.log(`      body=${item.contentSha256}`)
    }
  }

  console.log('\n[check] 修复建议')
  if (summary.missing_upload) {
    console.log('  missing_upload → node ai/mabinogi/logs/scripts/restoreFromBackup.js --from "<目录>" --no-copy --yes')
  }
  if (summary.missing_records || summary.failed_upload) {
    console.log('  missing_records/failed → node ai/mabinogi/logs/scripts/reparseUploads.js --yes')
    console.log('  或 failed-only → node ai/mabinogi/logs/scripts/reparseUploads.js --yes --failed-only')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[check] failed', error)
    process.exit(1)
  })
