/**
 * 用当前规则重新解析已上传的 DPS 源文件，只「补缺」不覆盖。
 *
 * - 已存在的 dps_records（同 runId + bossGroup + characterId）不改、不删、不覆盖
 * - 仅 insert 新增可识别击杀记录（例如放宽后才通过的佩塔克）
 * - 不修改已成功入库的记录字段
 *
 * 用法:
 *   node ai/mabinogi/logs/scripts/reparseUploads.js            # dry-run 预览
 *   node ai/mabinogi/logs/scripts/reparseUploads.js --yes      # 实际写入
 *   node ai/mabinogi/logs/scripts/reparseUploads.js --yes --failed-only
 *   node ai/mabinogi/logs/scripts/reparseUploads.js --yes --boss petak
 */
const { getClient } = require('../../../../mongo/index')
const { SOURCE_ROOT } = require('../config')
const { readSourceFile } = require('../storage')
const { parseGzipJson, validateSemantic } = require('../validate')
const { extractSummary } = require('../parser')
const { buildDpsRecords } = require('../records')
const { insertDpsRecords, updateReportParsed } = require('../db')

const DB_NAME = 'db_bot'
const COL_UPLOADS = 'cl_mabinogi_dps_upload'
const COL_RECORDS = 'cl_mabinogi_dps_records'

function parseArgs(argv) {
  const args = {
    yes: false,
    failedOnly: false,
    boss: null,
    limit: null
  }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--yes') args.yes = true
    else if (token === '--failed-only') args.failedOnly = true
    else if (token === '--boss') args.boss = String(argv[++i] || '').trim() || null
    else if (token === '--limit') {
      const n = Number(argv[++i])
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n)
    }
  }
  return args
}

function recordIdentity(record) {
  const runId = String(record.runId || '')
  const bossGroup = String(record.bossGroup || record.bossKey || '')
  const characterId = String(record.characterId || record.characterName || '')
  return `${runId}|${bossGroup}|${characterId}`
}

function filterByBoss(records, boss) {
  if (!boss) return records
  const kw = String(boss).trim().toLowerCase()
  return records.filter(item => {
    const group = String(item.bossGroup || '').toLowerCase()
    const key = String(item.bossKey || '').toLowerCase()
    const name = String(item.bossName || '')
    return group === kw || key === kw || key.includes(kw) || name.includes(boss)
  })
}

async function loadExistingIdentities(colRecords, runId) {
  const existing = await colRecords.find({ runId }, {
    projection: {
      runId: 1,
      bossGroup: 1,
      bossKey: 1,
      characterId: 1,
      characterName: 1
    }
  }).toArray()
  return new Set(existing.map(recordIdentity))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const client = await getClient()
  const uploads = client.db(DB_NAME).collection(COL_UPLOADS)
  const recordsCol = client.db(DB_NAME).collection(COL_RECORDS)

  const statusFilter = args.failedOnly
    ? { status: 'failed' }
    : { status: { $in: ['parsed', 'failed'] } }

  let cursor = uploads.find(statusFilter).sort({ uploadedAt: 1 })
  if (args.limit) cursor = cursor.limit(args.limit)
  const rows = await cursor.toArray()

  console.log(`[reparse] SOURCE_ROOT=${SOURCE_ROOT}`)
  console.log(`[reparse] uploads=${rows.length} mode=${args.yes ? 'WRITE' : 'DRY-RUN'}${args.boss ? ` boss=${args.boss}` : ''}`)

  const summary = {
    scanned: 0,
    skipNoFile: 0,
    skipParse: 0,
    skipSemantic: 0,
    skipNoNew: 0,
    wouldInsert: 0,
    inserted: 0,
    updatedUpload: 0,
    errors: 0
  }

  for (const upload of rows) {
    summary.scanned++
    const reportId = upload._id
    const dungeonName = upload.dungeonName
    const label = `${reportId} ${upload.playerName || upload.playerId} ${upload.dungeonName || ''}`

    try {
      if (!upload.sourceRelPath) {
        console.log(`[skip] ${label} no sourceRelPath`)
        summary.skipNoFile++
        continue
      }

      const buffer = readSourceFile(upload.sourceRelPath)
      if (!buffer) {
        console.log(`[skip] ${label} missing file ${upload.sourceRelPath}`)
        summary.skipNoFile++
        continue
      }

      const parsed = parseGzipJson(buffer)
      if (!parsed.ok) {
        console.log(`[skip] ${label} parse ${parsed.reason}`)
        summary.skipParse++
        continue
      }

      const semantic = validateSemantic(parsed.data, dungeonName)
      if (!semantic.ok) {
        console.log(`[skip] ${label} semantic ${semantic.reason}`)
        summary.skipSemantic++
        continue
      }

      let built = buildDpsRecords({
        runId: reportId,
        dungeonName,
        uploadedAt: upload.uploadedAt || new Date(),
        data: parsed.data
      })
      built = filterByBoss(built, args.boss)

      if (!built.length) {
        summary.skipNoNew++
        continue
      }

      const existingKeys = await loadExistingIdentities(recordsCol, reportId)
      const toInsert = built.filter(item => !existingKeys.has(recordIdentity(item)))

      if (!toInsert.length) {
        console.log(`[ok] ${label} no missing records (built=${built.length})`)
        summary.skipNoNew++
        continue
      }

      const byBoss = {}
      for (const item of toInsert) {
        const key = item.bossGroup || item.bossKey || 'unknown'
        byBoss[key] = (byBoss[key] || 0) + 1
      }
      console.log(`[new] ${label} +${toInsert.length} ${JSON.stringify(byBoss)}`)
      summary.wouldInsert += toInsert.length

      if (!args.yes) continue

      await insertDpsRecords(toInsert)
      summary.inserted += toInsert.length

      // 仅刷新摘要计数/状态，不碰已有 records 内容
      const allIdentities = new Set([...existingKeys, ...toInsert.map(recordIdentity)])
      const summaryData = extractSummary(parsed.data)
      await updateReportParsed(reportId, {
        ...summaryData,
        validRecordCount: allIdentities.size,
        reparsedAt: new Date()
      })
      summary.updatedUpload++
    } catch (error) {
      summary.errors++
      console.error(`[error] ${label}`, error.message || error)
    }
  }

  console.log('\n[reparse] summary')
  console.log(summary)
  if (!args.yes) {
    console.log('\n预览完成。确认无误后加 --yes 执行写入。')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[reparse] failed', error)
    process.exit(1)
  })
