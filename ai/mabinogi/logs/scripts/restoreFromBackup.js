/**
 * 从 logs 备份目录恢复源文件，并按当前规则重新写入 Mongo（upload + records）。
 *
 * clearData --with-files 会同时删库和 mabidata/logs；本脚本：
 * 1. 把备份里的 *.json.gz 拷回 SOURCE_ROOT（可跳过）
 * 2. 为每个包插入 upload + 可识别的 dps_records
 * 3. 同 playerId+contentSha256 已存在：
 *    - 若已有 records → 跳过（already_in_db）
 *    - 若 upload 在但 records 为空 → 补写 records（backfill_records）
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/restoreFromBackup.js --from "D:/backup/logs"
 *   node ai/mabinogi/logs/scripts/restoreFromBackup.js --from "D:/backup/logs" --yes
 *   node ai/mabinogi/logs/scripts/restoreFromBackup.js --from "G:/github/mabidata/logs" --yes --no-copy
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const zlib = require('zlib')
const { getClient } = require('../../../../mongo/index')
const { SOURCE_ROOT } = require('../config')
const { parseGzipJson, validateSemantic } = require('../validate')
const { extractSummary } = require('../parser')
const { buildDpsRecords } = require('../records')
const { buildTeamSignature } = require('../team')
const {
  newReportId,
  findDuplicate,
  insertPendingReport,
  updateReportParsed,
  updateReportFailed,
  insertDpsRecords
} = require('../db')

const DB_NAME = 'db_bot'
const COL_UPLOADS = 'cl_mabinogi_dps_upload'
const COL_RECORDS = 'cl_mabinogi_dps_records'

async function countRecordsForRun(runId) {
  const client = await getClient()
  // mongodb@2.x 无 countDocuments，用 count
  return client.db(DB_NAME).collection(COL_RECORDS).count({
    runId: String(runId)
  })
}

function parseArgs(argv) {
  const args = {
    from: null,
    yes: false,
    noCopy: false,
    limit: null
  }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--from') args.from = String(argv[++i] || '').trim() || null
    else if (token === '--yes') args.yes = true
    else if (token === '--no-copy') args.noCopy = true
    else if (token === '--limit') {
      const n = Number(argv[++i])
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n)
    }
  }
  return args
}

function parsePlayerDir(dirName) {
  const name = String(dirName || '').trim()
  const matched = name.match(/^(\d+)(?:_(.+))?$/)
  if (!matched) return null
  return {
    playerId: matched[1],
    playerName: matched[2] || ''
  }
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
      results.push({
        absolutePath: full,
        relativePath: [...relParts, entry.name].join('/'),
        playerDir: relParts[0] || '',
        fileName: entry.name
      })
    }
  }

  walk(rootDir, [])
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

function copyFileToSource(relPath, buffer) {
  const dest = path.join(SOURCE_ROOT, relPath)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buffer)
  return relPath.replace(/\\/g, '/')
}

function inferDungeonName(data, fileName) {
  const fromFile = String(fileName || '').match(/_([^_]+)\.json\.gz$/)
  if (fromFile && fromFile[1] && !/^[0-9a-f]{8,}$/i.test(fromFile[1])) {
    return fromFile[1]
  }
  // 从 targets 粗略猜：有佩塔克/布隆/米耶尔 → 布里列赫；有盖尔塔 → 佩斯皮亚德
  const names = (data.targets || []).map(t => String(t.targetName || ''))
  if (names.some(n => n.includes('盖尔塔') || n.includes('塔赫杜因'))) return '佩斯皮亚德'
  if (names.some(n => n.includes('佩塔克') || n.includes('布隆') || n.includes('米耶尔'))) return '布里列赫'
  return '布里列赫'
}

function inferUploadedAt(absolutePath, data) {
  try {
    const ms = Number(data?.targets?.[0]?.cleanedAt)
    if (Number.isFinite(ms) && ms > 1e10) {
      // centi → ms roughly
      const cleaned = Math.floor(ms / 100) * 1000
      if (cleaned > 1e12) return new Date(cleaned)
    }
  } catch (error) {
    // ignore
  }
  return fs.statSync(absolutePath).mtime
}

async function importOne({ absolutePath, relativePath, playerDir, fileName }, { yes, noCopy }) {
  const player = parsePlayerDir(playerDir)
  if (!player) {
    return { status: 'skip', reason: `bad_player_dir:${playerDir}` }
  }

  const buffer = fs.readFileSync(absolutePath)
  const contentSha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  const expectedSha = fileName.replace(/\.json\.gz$/i, '').toLowerCase()
  if (/^[0-9a-f]{64}$/.test(expectedSha) && expectedSha !== contentSha256) {
    return { status: 'skip', reason: 'sha256_filename_mismatch' }
  }

  const dup = await findDuplicate({
    playerId: player.playerId,
    contentSha256,
    fileName: `${playerDir}_${contentSha256.slice(0, 12)}.json.gz`
  })

  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) {
    return { status: 'skip', reason: `parse:${parsed.reason}` }
  }

  const dungeonName = inferDungeonName(parsed.data, fileName)
  const semantic = validateSemantic(parsed.data, dungeonName)
  const storeRelPath = noCopy
    ? relativePath.replace(/\\/g, '/')
    : copyFileToSource(relativePath, buffer)

  // upload 已在：有 records 则跳过；无 records 则尽量补写
  // 语义校验失败时仍尝试 buildDpsRecords（残局可能拖垮整包校验，但有效击杀仍可入库）
  if (dup) {
    const existingCount = await countRecordsForRun(dup._id)
    if (existingCount > 0) {
      return {
        status: 'skip',
        reason: 'already_in_db',
        reportId: dup._id,
        uploadStatus: dup.status,
        recordCount: existingCount,
        validRecordCount: dup.validRecordCount
      }
    }

    const uploadedAt = dup.uploadedAt || inferUploadedAt(absolutePath, parsed.data)
    const previewDungeon = dup.dungeonName || dungeonName
    const preview = buildDpsRecords({
      runId: dup._id,
      dungeonName: previewDungeon,
      uploadedAt,
      data: parsed.data,
      uploaderName: player.playerName || '',
      uploaderId: player.playerId || ''
    })

    if (!preview.length) {
      return {
        status: 'skip',
        reason: semantic.ok
          ? 'already_in_db_empty_no_records'
          : `already_in_db_empty_semantic:${semantic.reason}`,
        reportId: dup._id,
        uploadStatus: dup.status,
        recordCount: 0
      }
    }

    if (!yes) {
      return {
        status: 'dry',
        playerId: player.playerId,
        playerName: player.playerName,
        dungeonName: previewDungeon,
        semantic: semantic.ok ? 'backfill_records' : `backfill_despite_${semantic.reason}`,
        sourceRelPath: storeRelPath,
        reportId: dup._id,
        records: preview.length
      }
    }

    const summary = extractSummary(parsed.data)
    await updateReportParsed(dup._id, {
      ...summary,
      validRecordCount: preview.length,
      backfilledAt: new Date(),
      semanticNote: semantic.ok ? null : semantic.reason
    })
    await insertDpsRecords(preview)
    return {
      status: 'backfill',
      reportId: dup._id,
      records: preview.length,
      dungeonName: previewDungeon,
      playerName: player.playerName || player.playerId
    }
  }

  if (!yes) {
    return {
      status: 'dry',
      playerId: player.playerId,
      playerName: player.playerName,
      dungeonName,
      semantic: semantic.ok ? 'ok' : semantic.reason,
      sourceRelPath: storeRelPath
    }
  }

  const reportId = newReportId()
  const uploadedAt = inferUploadedAt(absolutePath, parsed.data)
  const teamSignature = buildTeamSignature(parsed.data)
  const uploadFileName = `${playerDir}_${contentSha256.slice(0, 12)}.json.gz`

  await insertPendingReport({
    _id: reportId,
    playerId: player.playerId,
    playerName: player.playerName,
    dungeonName,
    fileName: uploadFileName,
    clientVersion: 'restore',
    contentSha256,
    sourceRelPath: storeRelPath,
    teamSignature,
    status: 'pending',
    parseError: null,
    uploadedAt,
    uploadedTs: uploadedAt.getTime(),
    ip: 'restore-script',
    restoredAt: new Date()
  })

  const summary = extractSummary(parsed.data)
  const dpsRecords = buildDpsRecords({
    runId: reportId,
    dungeonName,
    uploadedAt,
    data: parsed.data,
    uploaderName: player.playerName || '',
    uploaderId: player.playerId || ''
  })

  if (!semantic.ok && !dpsRecords.length) {
    await updateReportFailed(reportId, semantic.reason)
    return { status: 'failed', reportId, reason: semantic.reason }
  }

  await updateReportParsed(reportId, {
    ...summary,
    validRecordCount: dpsRecords.length,
    semanticNote: semantic.ok ? null : semantic.reason
  })
  if (dpsRecords.length) {
    await insertDpsRecords(dpsRecords)
  }

  return {
    status: 'ok',
    reportId,
    records: dpsRecords.length,
    dungeonName,
    playerName: player.playerName || player.playerId
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.from) {
    console.error('用法: node ai/mabinogi/logs/scripts/restoreFromBackup.js --from <备份目录> [--yes] [--no-copy]')
    console.error(`当前 SOURCE_ROOT: ${SOURCE_ROOT}`)
    process.exit(1)
  }

  const fromDir = path.resolve(args.from)
  if (!fs.existsSync(fromDir)) {
    console.error(`备份目录不存在: ${fromDir}`)
    process.exit(1)
  }

  // 若备份就是正式目录，自动跳过拷贝
  const sameRoot = path.resolve(fromDir) === path.resolve(SOURCE_ROOT)
  const noCopy = args.noCopy || sameRoot

  let files = walkJsonGz(fromDir)
  if (args.limit) files = files.slice(0, args.limit)

  console.log(`[restore] from=${fromDir}`)
  console.log(`[restore] SOURCE_ROOT=${SOURCE_ROOT}`)
  console.log(`[restore] files=${files.length} mode=${args.yes ? 'WRITE' : 'DRY-RUN'} copy=${noCopy ? 'no' : 'yes'}`)

  await getClient()

  const summary = {
    scanned: 0,
    dry: 0,
    ok: 0,
    backfill: 0,
    failed: 0,
    skip: 0,
    records: 0,
    errors: 0
  }

  for (const file of files) {
    summary.scanned++
    try {
      const result = await importOne(file, { yes: args.yes, noCopy })
      if (result.status === 'ok') {
        summary.ok++
        summary.records += result.records || 0
        console.log(`[ok] ${file.relativePath} report=${result.reportId} records=${result.records} dungeon=${result.dungeonName}`)
      } else if (result.status === 'backfill') {
        summary.backfill++
        summary.records += result.records || 0
        console.log(`[backfill] ${file.relativePath} report=${result.reportId} records=${result.records} dungeon=${result.dungeonName}`)
      } else if (result.status === 'dry') {
        summary.dry++
        const extra = result.reportId
          ? ` report=${result.reportId} wouldRecords=${result.records || 0}`
          : ''
        console.log(`[dry] ${file.relativePath} player=${result.playerName || result.playerId} dungeon=${result.dungeonName} semantic=${result.semantic}${extra}`)
      } else if (result.status === 'failed') {
        summary.failed++
        console.log(`[failed] ${file.relativePath} ${result.reason} report=${result.reportId}`)
      } else {
        summary.skip++
        const extra = result.reportId
          ? ` report=${result.reportId} uploadStatus=${result.uploadStatus || '?'} records=${result.recordCount ?? 0}`
          : ''
        console.log(`[skip] ${file.relativePath} ${result.reason}${extra}`)
      }
    } catch (error) {
      summary.errors++
      console.error(`[error] ${file.relativePath}`, error.message || error)
    }
  }

  console.log('\n[restore] summary')
  console.log(summary)
  if (!args.yes) {
    console.log('\n预览完成。确认后加 --yes 写入数据库。')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[restore] failed', error)
    process.exit(1)
  })
