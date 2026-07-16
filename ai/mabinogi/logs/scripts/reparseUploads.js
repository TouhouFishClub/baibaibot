/**
 * 用当前规则重新解析已上传的 DPS 源文件，只「补缺」不覆盖。
 *
 * 去重策略（按 Boss 组）：
 * - 某场次若已存在该 bossGroup（如 brontanas / petak）的任意记录 → 整组跳过
 * - 仅插入「本场次完全没有」的 bossGroup（例如以前合击未过、现在才通过的佩塔克）
 * - 绝不更新/删除已有 records
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
const { resolveBossGroupKey } = require('../bossConfig')

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

function recordBossGroup(record) {
  return resolveBossGroupKey(record.bossGroup || record.bossKey || record.bossName || '')
}

function filterByBoss(records, boss) {
  if (!boss) return records
  const kw = String(boss).trim().toLowerCase()
  return records.filter(item => {
    const group = String(item.bossGroup || '').toLowerCase()
    const key = String(item.bossKey || '').toLowerCase()
    const name = String(item.bossName || '')
    const resolved = String(recordBossGroup(item) || '').toLowerCase()
    return group === kw || key === kw || resolved === kw || key.includes(kw) || name.includes(boss)
  })
}

async function loadExistingBossGroups(colRecords, runId) {
  const existing = await colRecords.find(
    { runId: String(runId) },
    { projection: { bossGroup: 1, bossKey: 1, bossName: 1 } }
  ).toArray()

  // 兼容 runId 偶发非字符串存储
  if (!existing.length) {
    const again = await colRecords.find(
      { runId },
      { projection: { bossGroup: 1, bossKey: 1, bossName: 1 } }
    ).toArray()
    return new Set(again.map(recordBossGroup).filter(Boolean))
  }
  return new Set(existing.map(recordBossGroup).filter(Boolean))
}

function pickMissingBossRecords(built, existingBossGroups) {
  const byGroup = new Map()
  for (const item of built) {
    const group = recordBossGroup(item)
    if (!group) continue
    if (existingBossGroups.has(group)) continue
    if (!byGroup.has(group)) byGroup.set(group, [])
    byGroup.get(group).push(item)
  }
  return [...byGroup.values()].flat()
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
  console.log('[reparse] strategy: skip bossGroup if any record already exists for this runId')

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
      let built = buildDpsRecords({
        runId: reportId,
        dungeonName,
        uploadedAt: upload.uploadedAt || new Date(),
        data: parsed.data
      })
      built = filterByBoss(built, args.boss)

      // 语义失败但能算出击杀记录时仍补缺（残局不应拖死有效击杀）
      if (!built.length) {
        if (!semantic.ok) {
          console.log(`[skip] ${label} semantic ${semantic.reason}`)
          summary.skipSemantic++
        } else {
          summary.skipNoNew++
        }
        continue
      }
      if (!semantic.ok) {
        console.log(`[warn] ${label} semantic ${semantic.reason} but built=${built.length}, continue`)
      }

      const existingBossGroups = await loadExistingBossGroups(recordsCol, reportId)
      const toInsert = pickMissingBossRecords(built, existingBossGroups)

      if (!toInsert.length) {
        console.log(`[ok] ${label} no missing boss groups (existing=[${[...existingBossGroups].join(',')}])`)
        summary.skipNoNew++
        continue
      }

      const byBoss = {}
      for (const item of toInsert) {
        const key = recordBossGroup(item) || 'unknown'
        byBoss[key] = (byBoss[key] || 0) + 1
      }
      console.log(`[new] ${label} +${toInsert.length} ${JSON.stringify(byBoss)} (had=[${[...existingBossGroups].join(',')}])`)
      summary.wouldInsert += toInsert.length

      if (!args.yes) continue

      await insertDpsRecords(toInsert)
      summary.inserted += toInsert.length

      const afterGroups = new Set([...existingBossGroups, ...toInsert.map(recordBossGroup)])
      const summaryData = extractSummary(parsed.data)
      // mongodb@2.x 无 countDocuments，用 count
      const totalRecords = await recordsCol.count({ runId: String(reportId) })
      await updateReportParsed(reportId, {
        ...summaryData,
        validRecordCount: totalRecords,
        reparsedAt: new Date(),
        reparseBossGroups: [...afterGroups]
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
