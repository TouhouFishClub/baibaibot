const path = require('path-extra')
const { render } = require('../Television/render')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const { resolveQueryType, formatHp, formatDuration, formatPercent, formatDps, formatDamage, shortRunId, BOSSES, DUNGEONS } = require('./bossConfig')
const { CLASSES, formatClassHelpLine, resolveClassQuery } = require('./classConfig')
const {
  listRecordsByCharacter,
  listRecordsByDungeon,
  listRecordsByBoss
} = require('./db')
const { isRunIdKeyword, loadRunDetail } = require('./runQuery')
const { renderRunDetail } = require('./renderRunDetail')

const ADMIN_QQ = '799018865'
const ALLOWED_GROUPS = new Set(['668217870'])

const DEFAULT_DUNGEON = '布里列赫'
const DEFAULT_RANK = 10
const BOSS_DEFAULT_RANK = 30
const CHARACTER_DEFAULT_RANK = 3

const addZero = n => (n < 10 ? '0' + n : n)

const formatTime = ts => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}

const truncate = (text, max = 18) => {
  const value = String(text || '')
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function flattenGroups(groups) {
  const rows = []
  for (const group of groups) {
    for (const record of group.records) {
      rows.push(record)
    }
  }
  return rows
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
    '  mblogs 角色名             查询该角色各 Boss 最高 DPS',
    `  mblogs ${DEFAULT_DUNGEON}           查询副本各 Boss 排行榜`,
    `  mblogs Boss名             查询单个 Boss，默认前${BOSS_DEFAULT_RANK}名`,
    '  mblogs <场次ID>           查询单场战斗详情图（支持短 ID）',
    '',
    '参数：',
    '  --rank N    显示前 N 名（副本默认 10，Boss 默认 30，角色默认 3）',
    '  --job 职业名  只显示指定职业（模糊匹配）',
    '  --all       显示全部记录，不做「每角色仅保留最高 DPS」去重',
    '  --help      显示本帮助',
    '',
    '示例：',
    '  mblogs 布里列赫 --rank 20',
    '  mblogs 枯木之佩塔克 --job 流子',
    '  mblogs 枯木之佩塔克 --rank 15 --job 黑魔导士',
    '  mblogs 布里列赫 --all',
    '  mblogs c31651e9',
    '  mblogs --help',
    '',
    `支持副本：${DUNGEONS.map(item => item.name).join('、')}`,
    `支持 Boss：${bossNames}`,
    `支持职业：${classNames}`
  ].join('\n')
}

function parseMblogsInput(content) {
  const tokens = String(content || '').trim().split(/\s+/).filter(Boolean)
  let showAll = false
  let help = false
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
    keywordParts.push(token)
  }

  return {
    keyword: keywordParts.join(' '),
    showAll,
    help,
    rank,
    job
  }
}

function resolveRank(query, rank) {
  if (rank) return rank
  if (query.type === 'boss') return BOSS_DEFAULT_RANK
  if (query.type === 'character') return CHARACTER_DEFAULT_RANK
  return DEFAULT_RANK
}

function buildRankDescription({ mode, showAll, rank, job }) {
  if (mode === 'character') {
    const parts = [`各 Boss 前 ${rank} 名（仅统计已击杀）`]
    if (job) parts.push(`职业：${job}`)
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
  return `${parts[0]}（${parts.slice(1).join('，')}）`
}

function buildTitle(baseTitle, job) {
  if (!job) return baseTitle
  return `${baseTitle} · ${job}`
}

function buildColumns(mode) {
  const common = [
    { label: '副本', key: 'dungeonName', format: v => truncate(v, 8) },
    { label: '记录时间', key: 'recordTime', format: v => formatTime(v) },
    { label: '队友数', key: 'teamSize' },
    { label: '队友', key: 'teammateNames', format: v => truncate(v, 14) },
    { label: '攻略时间', key: 'duration', format: v => formatDuration(v) },
    { label: 'DPS', key: 'dps', format: v => formatDps(v) },
    { label: 'Boss血量', key: 'bossHp', format: v => formatHp(v) },
    { label: '角色伤害', key: 'totalDamage', format: v => formatDamage(v) },
    { label: '占比', key: 'damagePercent', format: v => formatPercent(v) },
    { label: '场次ID', key: 'runId', format: v => shortRunId(v) }
  ]

  if (mode === 'dungeon') {
    return [
      { label: '角色', key: 'characterName', format: v => truncate(v, 10) },
      { label: '职业', key: 'characterClass', format: v => truncate(v, 8) },
      ...common
    ]
  }

  if (mode === 'boss') {
    return [
      { label: '角色', key: 'characterName', format: v => truncate(v, 10) },
      { label: '职业', key: 'characterClass', format: v => truncate(v, 8) },
      { label: '副本', key: 'dungeonName', format: v => truncate(v, 8) },
      { label: '记录时间', key: 'recordTime', format: v => formatTime(v) },
      { label: '队友数', key: 'teamSize' },
      { label: '队友', key: 'teammateNames', format: v => truncate(v, 14) },
      { label: 'Boss', key: 'bossName', format: v => truncate(v, 12) },
      { label: '攻略时间', key: 'duration', format: v => formatDuration(v) },
      { label: 'DPS', key: 'dps', format: v => formatDps(v) },
      { label: 'Boss血量', key: 'bossHp', format: v => formatHp(v) },
      { label: '角色伤害', key: 'totalDamage', format: v => formatDamage(v) },
      { label: '占比', key: 'damagePercent', format: v => formatPercent(v) },
      { label: '场次ID', key: 'runId', format: v => shortRunId(v) }
    ]
  }

  return [
    { label: '职业', key: 'characterClass', format: v => truncate(v, 8) },
    { label: '副本', key: 'dungeonName', format: v => truncate(v, 8) },
    { label: '记录时间', key: 'recordTime', format: v => formatTime(v) },
    { label: '队友数', key: 'teamSize' },
    { label: '队友', key: 'teammateNames', format: v => truncate(v, 14) },
    { label: 'Boss', key: 'bossName', format: v => truncate(v, 12) },
    { label: '攻略时间', key: 'duration', format: v => formatDuration(v) },
    { label: 'DPS', key: 'dps', format: v => formatDps(v) },
    { label: 'Boss血量', key: 'bossHp', format: v => formatHp(v) },
    { label: '角色伤害', key: 'totalDamage', format: v => formatDamage(v) },
    { label: '占比', key: 'damagePercent', format: v => formatPercent(v) },
    { label: '场次ID', key: 'runId', format: v => shortRunId(v) }
  ]
}

function mapRow(record) {
  return {
    characterName: record.characterName,
    characterClass: record.characterClass || '未知',
    dungeonName: record.dungeonName,
    recordTime: record.recordTime,
    teamSize: record.teamSize,
    teammateNames: record.teammateNames,
    bossName: record.bossName,
    duration: record.duration,
    dps: record.dps,
    bossHp: record.bossHp,
    totalDamage: record.totalDamage,
    damagePercent: record.damagePercent,
    runId: record.runId
  }
}

async function queryMblogs(content, { showAll = false, rank, job } = {}) {
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
    return { error: '用法：mblogs 角色名 / mblogs 布里列赫 / mblogs Boss名 / mblogs 布里列赫 --all / mblogs 布里列赫 --rank 20 / mblogs Boss名 --job 流星射手' }
  }

  const limit = resolveRank(query, rank)
  const resolvedJob = job ? resolveClassQuery(job) : undefined
  const queryOptions = {
    bestPerCharacter: !showAll,
    characterClass: resolvedJob || undefined
  }

  if (query.type === 'character') {
    const groups = await listRecordsByCharacter(query.name, limit, queryOptions)
    const rows = flattenGroups(groups).map(mapRow)
    if (!rows.length) {
      const suffix = job ? `（职业：${resolvedJob || job}）` : ''
      return { error: `未找到角色「${query.name}」的通关 DPS 记录${suffix}` }
    }
    return {
      title: buildTitle(`DPS记录：${query.name}`, resolvedJob || job),
      description: buildRankDescription({ mode: 'character', showAll, rank: limit, job: resolvedJob || job }),
      mode: 'character',
      rows
    }
  }

  if (query.type === 'dungeon') {
    const groups = await listRecordsByDungeon(query.dungeon.name, limit, queryOptions)
    if (!groups.length) {
      const suffix = job ? `（职业：${resolvedJob || job}）` : ''
      return { error: `未找到副本「${query.dungeon.name}」的 DPS 记录${suffix}` }
    }
    return {
      title: buildTitle(`DPS记录：${query.dungeon.name}`, resolvedJob || job),
      description: buildRankDescription({ mode: 'dungeon', showAll, rank: limit, job: resolvedJob || job }),
      mode: 'dungeon',
      sections: groups.map(group => ({
        title: group.bossName,
        rows: group.records.map(mapRow)
      }))
    }
  }

  const records = await listRecordsByBoss(query.boss.groupKey, limit, queryOptions)
  const rows = records.map(mapRow)
  if (!rows.length) {
    const suffix = job ? `（职业：${job}）` : ''
    return { error: `未找到 Boss「${query.boss.displayName}」的 DPS 记录${suffix}` }
  }
  return {
    title: buildTitle(`DPS记录：${query.boss.displayName}`, resolvedJob || job),
    description: buildRankDescription({ mode: 'boss', showAll, rank: limit, job: resolvedJob || job }),
    mode: 'boss',
    rows
  }
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

  const { keyword: queryKeyword, showAll, rank, job } = parsed
  const resolvedKeyword = queryKeyword || DEFAULT_DUNGEON

  try {
    const result = await queryMblogs(resolvedKeyword, { showAll, rank, job })
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
    const columns = buildColumns(result.mode)
    const renderOption = {
      title: result.title,
      description: result.description,
      output: outputDir,
      columns
    }
    if (result.sections) {
      await render([], { ...renderOption, sections: result.sections })
    } else {
      await render(result.rows, renderOption)
    }

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
  buildMblogsHelp,
  isMblogsHelpRequest,
  isRunIdKeyword
}
