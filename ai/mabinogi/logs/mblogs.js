const path = require('path-extra')
const { render } = require('../Television/render')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const { resolveQueryType, formatHp, formatDuration, formatPercent, formatDps, formatDamage, shortRunId } = require('./bossConfig')
const {
  listRecordsByCharacter,
  listRecordsByDungeon,
  listRecordsByBoss
} = require('./db')

const ADMIN_QQ = '799018865'

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

function parseMblogsInput(content) {
  const tokens = String(content || '').trim().split(/\s+/).filter(Boolean)
  let showAll = false
  let rank = null
  let job = null
  const keywordParts = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
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
  const query = resolveQueryType(content)
  if (query.type === 'help') {
    return { error: '用法：mblogs 角色名 / mblogs 布里列赫 / mblogs Boss名 / mblogs 布里列赫 --all / mblogs 布里列赫 --rank 20 / mblogs Boss名 --job 流星射手' }
  }

  const limit = resolveRank(query, rank)
  const queryOptions = {
    bestPerCharacter: !showAll,
    characterClass: job || undefined
  }

  if (query.type === 'character') {
    const groups = await listRecordsByCharacter(query.name, limit, queryOptions)
    const rows = flattenGroups(groups).map(mapRow)
    if (!rows.length) {
      const suffix = job ? `（职业：${job}）` : ''
      return { error: `未找到角色「${query.name}」的通关 DPS 记录${suffix}` }
    }
    return {
      title: buildTitle(`DPS记录：${query.name}`, job),
      description: buildRankDescription({ mode: 'character', showAll, rank: limit, job }),
      mode: 'character',
      rows
    }
  }

  if (query.type === 'dungeon') {
    const groups = await listRecordsByDungeon(query.dungeon.name, limit, queryOptions)
    if (!groups.length) {
      const suffix = job ? `（职业：${job}）` : ''
      return { error: `未找到副本「${query.dungeon.name}」的 DPS 记录${suffix}` }
    }
    return {
      title: buildTitle(`DPS记录：${query.dungeon.name}`, job),
      description: buildRankDescription({ mode: 'dungeon', showAll, rank: limit, job }),
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
    title: buildTitle(`DPS记录：${query.boss.displayName}`, job),
    description: buildRankDescription({ mode: 'boss', showAll, rank: limit, job }),
    mode: 'boss',
    rows
  }
}

async function mblogs(content, from, callback) {
  if (String(from) !== ADMIN_QQ) {
    callback('无权限查询 DPS 记录')
    return
  }

  const keyword = String(content || '').trim()
  if (keyword.toLowerCase() === 'help' || keyword === '帮助') {
    callback([
      '用法：',
      `mblogs（默认${DEFAULT_DUNGEON}，前${DEFAULT_RANK}名）`,
      'mblogs 角色名',
      `mblogs ${DEFAULT_DUNGEON}`,
      `mblogs Boss名（默认前${BOSS_DEFAULT_RANK}名）`,
      'mblogs 布里列赫 --all',
      'mblogs 布里列赫 --rank 20',
      'mblogs 枯木之佩塔克 --job 流星射手',
      'mblogs 枯木之佩塔克 --rank 15 --job 流星射手'
    ].join('\n'))
    return
  }

  const { keyword: queryKeyword, showAll, rank, job } = parseMblogsInput(keyword)
  const resolvedKeyword = queryKeyword || DEFAULT_DUNGEON

  try {
    const result = await queryMblogs(resolvedKeyword, { showAll, rank, job })
    if (result.error) {
      callback(result.error)
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
  resolveRank
}
