const path = require('path-extra')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const { resolveQueryType, BOSSES, DUNGEONS } = require('./bossConfig')
const { CLASSES, formatClassHelpLine, resolveClassQuery } = require('./classConfig')
const {
  listRecordsByCharacter,
  listRecordsByDungeon,
  listRecordsByBoss,
  getUploadersByRunIds,
  normalizeRunId
} = require('./db')
const { isRunIdKeyword, loadRunDetail } = require('./runQuery')
const { renderRunDetail } = require('./renderRunDetail')
const { renderMblogsList } = require('./renderMblogsList')
const { attachSkillBreakdowns } = require('./skillBreakdown')
const { resolveAiAnalysisCommand, runAiAnalysis } = require('./aiAnalysis')
const { resolveAiReviewCommand, runAiReview } = require('./aiReview')

const ADMIN_QQ = '799018865'
// const ALLOWED_GROUPS = new Set(['668217870', '885309800'])
const ALLOWED_GROUPS = new Set([])

const DEFAULT_DUNGEON = '布里列赫'
const DEFAULT_RANK = 10
const BOSS_DEFAULT_RANK = 30
const CHARACTER_DEFAULT_RANK = 3
const USER_MAX_RANK = 30

function isAdminUser(from) {
  return String(from || '') === ADMIN_QQ
}

function isMblogsHelpRequest(content) {
  const tokens = String(content || '').trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  return tokens.some(token => token === '--help' || token.toLowerCase() === 'help' || token === '帮助')
}

function buildMblogsHelp() {
  const bossNames = [...new Set(BOSSES.map(boss => boss.displayName))].join('、')
  const classNames = CLASSES.map(formatClassHelpLine).join('、')

  return [
    '【mblogs DPS 查询帮助】',
    '',
    '基本用法：',
    `  mblogs                    默认查询${DEFAULT_DUNGEON}，各 Boss 前${DEFAULT_RANK}名`,
    '  mblogs 角色名             查询该角色各 Boss 最高 DPS（按 Boss 分段）',
    `  mblogs ${DEFAULT_DUNGEON}           查询副本各 Boss 排行榜`,
    `  mblogs Boss名             查询单个 Boss，默认前${BOSS_DEFAULT_RANK}名`,
    '  mblogs <场次ID>           查询单场战斗详情图（支持短 ID）',
    '  mblogs AI锐评             从夯到拉，对比各阿尔卡纳职业（当天缓存，仅管理员）',
    '  mblogs 重新生成AI锐评     强制刷新职业锐评（仅管理员）',
    '  mblogs AI分析             生成/查看当日 AI 分析报告（当天缓存，仅管理员）',
    '  mblogs 重新生成AI分析     强制重新采集并生成 AI 分析（仅管理员）',
    '',
    '参数：',
    '  --rank N    显示前 N 名（副本默认 10，Boss 默认 30，角色默认 3；普通用户最多 30）',
    '  --job 职业名  只显示指定职业（模糊匹配）',
    '  --all       显示全部记录，不做「每角色仅保留最高 DPS」去重',
    '  --withskill 列表模式在角色条目下显示技能占比进度条',
    '  --show 模式  控制角色/队友/上传者显示（默认均隐藏）',
    '              脱敏角色名 / 脱敏队友 / 脱敏 / 角色 / 上传者 / all',
    '  --help      显示本帮助',
    '',
    '示例：',
    '  mblogs 布里列赫 --rank 20',
    '  mblogs 枯木之佩塔克 --job 流子',
    '  mblogs 枯木之佩塔克 --rank 15 --job 黑魔导士',
    '  mblogs 布里列赫 --all',
    '  mblogs 雷内恩的米耶尔 --withskill',
    '  mblogs 布里列赫 --show 脱敏',
    '  mblogs 布里列赫 --show all',
    '  mblogs AI锐评',
    '  mblogs 重新生成AI锐评',
    '  mblogs AI分析',
    '  mblogs 重新生成AI分析',
    '  mblogs c31651e9',
    '  mblogs --help',
    '',
    `支持副本：${DUNGEONS.map(item => item.name).join('、')}`,
    `支持 Boss：${bossNames}`,
    `支持职业：${classNames}`
  ].join('\n')
}

const SHOW_MODES = {
  hidden: 'hidden',
  maskCharacter: 'maskCharacter',
  maskTeammate: 'maskTeammate',
  mask: 'mask',
  character: 'character',
  uploader: 'uploader',
  all: 'all'
}

function resolveShowMode(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return SHOW_MODES.hidden
  if (raw === 'all' || raw === '全部') return SHOW_MODES.all
  if (raw === '角色' || raw === 'character' || raw === 'name') return SHOW_MODES.character
  if (raw === '上传者' || raw === 'uploader') return SHOW_MODES.uploader
  if (raw === '脱敏') return SHOW_MODES.mask
  if (raw === '脱敏角色名' || raw === '脱敏角色') return SHOW_MODES.maskCharacter
  if (raw === '脱敏队友' || raw === '脱敏队友名') return SHOW_MODES.maskTeammate
  return null
}

function parseMblogsInput(content) {
  const tokens = String(content || '').trim().split(/\s+/).filter(Boolean)
  let showAll = false
  let help = false
  let withSkill = false
  let showMode = SHOW_MODES.hidden
  let showModeError = null
  let rank = null
  let job = null
  const keywordParts = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === '--help' || token.toLowerCase() === 'help' || token === '帮助') {
      help = true
      continue
    }
    if (token === '--all') {
      showAll = true
      continue
    }
    if (token === '--withskill') {
      withSkill = true
      continue
    }
    if (token === '--rank') {
      const value = Number(tokens[++i])
      if (Number.isFinite(value) && value > 0) {
        rank = Math.floor(value)
      }
      continue
    }
    if (token === '--job') {
      const jobParts = []
      while (i + 1 < tokens.length && !String(tokens[i + 1]).startsWith('--')) {
        jobParts.push(tokens[++i])
      }
      job = jobParts.join(' ').trim() || null
      continue
    }
    if (token === '--show') {
      const showParts = []
      while (i + 1 < tokens.length && !String(tokens[i + 1]).startsWith('--')) {
        showParts.push(tokens[++i])
      }
      const showValue = showParts.join(' ').trim()
      const resolved = resolveShowMode(showValue)
      if (!resolved) {
        showModeError = `无效的 --show 参数「${showValue || '(空)'}」，可选：脱敏角色名 / 脱敏队友 / 脱敏 / 角色 / 上传者 / all`
      } else {
        showMode = resolved
      }
      continue
    }
    keywordParts.push(token)
  }

  return {
    keyword: keywordParts.join(' '),
    showAll,
    help,
    withSkill,
    showMode,
    showModeError,
    rank,
    job
  }
}

function resolveRank(query, rank, { isAdmin = false } = {}) {
  let limit
  if (rank) {
    limit = rank
  } else if (query.type === 'boss') {
    limit = BOSS_DEFAULT_RANK
  } else if (query.type === 'character') {
    limit = CHARACTER_DEFAULT_RANK
  } else {
    limit = DEFAULT_RANK
  }

  if (!isAdmin && limit > USER_MAX_RANK) {
    return USER_MAX_RANK
  }
  return limit
}

function buildRankDescription({ mode, showAll, rank, job, withSkill }) {
  if (mode === 'character') {
    const parts = [`各 Boss 前 ${rank} 名（仅统计已击杀）`]
    if (job) parts.push(`职业：${job}`)
    if (withSkill) parts.push('含技能占比')
    return parts.join('，')
  }

  const scope = mode === 'dungeon' ? `各 Boss 前 ${rank} 名` : `前 ${rank} 名`
  const parts = [scope]
  if (showAll) {
    parts.push('仅统计已击杀')
  } else {
    parts.push('每角色仅保留最高 DPS')
  }
  if (job) parts.push(`职业：${job}`)
  if (withSkill) parts.push('含技能占比')
  return `${parts[0]}（${parts.slice(1).join('，')}）`
}

function buildTitle(baseTitle, job) {
  if (!job) return baseTitle
  return `${baseTitle} · ${job}`
}

function mapRow(record) {
  return {
    characterId: record.characterId,
    characterName: record.characterName,
    characterClass: record.characterClass || '未知',
    dungeonName: record.dungeonName,
    recordTime: record.recordTime,
    teamSize: record.teamSize,
    teammateNames: record.teammateNames,
    bossName: record.bossName,
    bossKey: record.bossKey,
    bossGroup: record.bossGroup,
    duration: record.duration,
    dps: record.dps,
    bossHp: record.bossHp,
    totalDamage: record.totalDamage,
    damagePercent: record.damagePercent,
    runId: record.runId,
    uploaderName: record.uploaderName || '',
    uploaderId: record.uploaderId || ''
  }
}

function mapSections(groups) {
  return groups.map(group => ({
    title: group.bossName,
    rows: group.records.map(mapRow)
  }))
}

async function attachUploaders(sections) {
  const needLookup = []
  for (const section of sections || []) {
    for (const row of section.rows || []) {
      if (row.runId && !row.uploaderName && !row.uploaderId) {
        needLookup.push(row.runId)
      }
    }
  }

  const uploaderMap = needLookup.length
    ? await getUploadersByRunIds(needLookup)
    : new Map()

  for (const section of sections || []) {
    for (const row of section.rows || []) {
      if (row.uploaderName || row.uploaderId) continue
      const uploader = uploaderMap.get(String(row.runId))
        || uploaderMap.get(normalizeRunId(row.runId))
      row.uploaderName = uploader?.playerName || ''
      row.uploaderId = uploader?.playerId || ''
    }
  }
  return sections
}

async function queryMblogs(content, { showAll = false, rank, job, withSkill = false, isAdmin = false } = {}) {
  if (isMblogsHelpRequest(content)) {
    return { help: buildMblogsHelp() }
  }

  const keyword = String(content || '').trim()
  if (isRunIdKeyword(keyword)) {
    const detail = await loadRunDetail(keyword)
    if (detail.error) {
      return { error: detail.error }
    }
    return {
      mode: 'run',
      ...detail
    }
  }

  const query = resolveQueryType(content)
  if (query.type === 'help') {
    return { error: '用法：mblogs 角色名 / mblogs 布里列赫 / mblogs Boss名 / mblogs 布里列赫 --all / mblogs 布里列赫 --rank 20 / mblogs Boss名 --job 流星射手 / mblogs Boss名 --withskill' }
  }

  const limit = resolveRank(query, rank, { isAdmin })
  const resolvedJob = job ? resolveClassQuery(job) : undefined
  const queryOptions = {
    bestPerCharacter: !showAll,
    characterClass: resolvedJob || undefined
  }

  let result
  if (query.type === 'character') {
    const groups = await listRecordsByCharacter(query.name, limit, queryOptions)
    const sections = mapSections(groups)
    if (!sections.some(section => section.rows.length)) {
      const suffix = job ? `（职业：${resolvedJob || job}）` : ''
      return { error: `未找到角色「${query.name}」的通关 DPS 记录${suffix}` }
    }
    result = {
      title: buildTitle(`DPS记录：${query.name}`, resolvedJob || job),
      description: buildRankDescription({ mode: 'character', showAll, rank: limit, job: resolvedJob || job, withSkill }),
      mode: 'character',
      sections
    }
  } else if (query.type === 'dungeon') {
    const groups = await listRecordsByDungeon(query.dungeon.name, limit, queryOptions)
    if (!groups.length) {
      const suffix = job ? `（职业：${resolvedJob || job}）` : ''
      return { error: `未找到副本「${query.dungeon.name}」的 DPS 记录${suffix}` }
    }
    result = {
      title: buildTitle(`DPS记录：${query.dungeon.name}`, resolvedJob || job),
      description: buildRankDescription({ mode: 'dungeon', showAll, rank: limit, job: resolvedJob || job, withSkill }),
      mode: 'dungeon',
      sections: mapSections(groups)
    }
  } else {
    const records = await listRecordsByBoss(query.boss.groupKey, limit, queryOptions)
    const rows = records.map(mapRow)
    if (!rows.length) {
      const suffix = job ? `（职业：${job}）` : ''
      return { error: `未找到 Boss「${query.boss.displayName}」的 DPS 记录${suffix}` }
    }
    result = {
      title: buildTitle(`DPS记录：${query.boss.displayName}`, resolvedJob || job),
      description: buildRankDescription({ mode: 'boss', showAll, rank: limit, job: resolvedJob || job, withSkill }),
      mode: 'boss',
      sections: [{ rows }]
    }
  }

  result.sections = await attachUploaders(result.sections)

  if (withSkill) {
    result.sections = await attachSkillBreakdowns(result.sections)
    result.withSkill = true
  }

  return result
}

function canUseMblogs(from, groupid) {
  if (String(from) === ADMIN_QQ) return true
  return ALLOWED_GROUPS.has(String(groupid || ''))
}

async function mblogs(content, from, callback, groupid) {
  if (!canUseMblogs(from, groupid)) {
    // callback('无权限查询 DPS 记录（仅限指定群内使用）')
    return
  }

  const keyword = String(content || '').trim()
  const parsed = parseMblogsInput(keyword)
  if (isMblogsHelpRequest(keyword) || parsed.help) {
    callback(buildMblogsHelp())
    return
  }

  const aiReviewCommand = resolveAiReviewCommand(parsed.keyword || keyword)
  if (aiReviewCommand) {
    if (!isAdminUser(from)) {
      return
    }
    const outputDir = path.join(IMAGE_DATA, 'mabi_other', 'MabiAiReview.png')
    try {
      callback(aiReviewCommand.force
        ? '正在重新采集排行并生成 AI 锐评，请稍候…'
        : '正在生成/读取「从夯到拉」AI 锐评，请稍候…')
      const result = await runAiReview({ force: aiReviewCommand.force, outputPath: outputDir })
      if (result.status === 'busy') {
        callback(result.message)
        return
      }
      const msg = result.message ? `${result.message}\n` : ''
      callback(`${msg}[CQ:image,file=${path.join('send', 'mabi_other', 'MabiAiReview.png')}]`)
    } catch (error) {
      console.error('[mblogs] ai review error', error)
      callback(`AI 锐评失败：${error.message || '请稍后再试'}`)
    }
    return
  }

  const aiCommand = resolveAiAnalysisCommand(parsed.keyword || keyword)
  if (aiCommand) {
    if (!isAdminUser(from)) {
      return
    }
    const outputDir = path.join(IMAGE_DATA, 'mabi_other', 'MabiAiAnalysis.png')
    try {
      callback(aiCommand.force
        ? '正在重新采集排行并生成 AI 分析，请稍候…'
        : '正在生成/读取 AI 分析，请稍候…')
      const result = await runAiAnalysis({ force: aiCommand.force, outputPath: outputDir })
      if (result.status === 'busy') {
        callback(result.message)
        return
      }
      const msg = result.message ? `${result.message}\n` : ''
      callback(`${msg}[CQ:image,file=${path.join('send', 'mabi_other', 'MabiAiAnalysis.png')}]`)
    } catch (error) {
      console.error('[mblogs] ai analysis error', error)
      callback(`AI 分析失败：${error.message || '请稍后再试'}`)
    }
    return
  }

  if (parsed.showModeError) {
    callback(parsed.showModeError)
    return
  }

  const { keyword: queryKeyword, showAll, rank, job, withSkill, showMode } = parsed
  const resolvedKeyword = queryKeyword || DEFAULT_DUNGEON
  const isAdmin = isAdminUser(from)

  try {
    const result = await queryMblogs(resolvedKeyword, { showAll, rank, job, withSkill, isAdmin })
    if (result.help) {
      callback(result.help)
      return
    }
    if (result.error) {
      callback(result.error)
      return
    }

    if (result.mode === 'run') {
      const outputDir = path.join(IMAGE_DATA, 'mabi_other', 'MabiRunDetail.png')
      await renderRunDetail({
        title: result.title,
        description: result.description,
        panels: result.panels,
        output: outputDir
      })
      callback(`[CQ:image,file=${path.join('send', 'mabi_other', 'MabiRunDetail.png')}]`)
      return
    }

    const outputDir = path.join(IMAGE_DATA, 'mabi_other', 'MabiLogs.png')
    await renderMblogsList({
      title: result.title,
      description: result.description,
      output: outputDir,
      withSkill: Boolean(result.withSkill),
      showMode,
      sections: result.sections || [{ rows: result.rows || [] }]
    })

    callback(`[CQ:image,file=${path.join('send', 'mabi_other', 'MabiLogs.png')}]`)
  } catch (error) {
    console.error('[mblogs] error', error)
    callback('查询 DPS 记录失败，请稍后再试')
  }
}

module.exports = {
  mblogs,
  queryMblogs,
  parseMblogsInput,
  resolveRank,
  resolveShowMode,
  SHOW_MODES,
  buildMblogsHelp,
  isMblogsHelpRequest,
  isRunIdKeyword,
  resolveAiReviewCommand,
  runAiReview,
  resolveAiAnalysisCommand,
  runAiAnalysis
}
