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

const DEFAULT_DUNGEON = '布里列赫'

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

async function queryMblogs(content) {
  const query = resolveQueryType(content)
  if (query.type === 'help') {
    return { error: '用法：mblogs 角色名 / mblogs 布里列赫 / mblogs Boss名' }
  }

  if (query.type === 'character') {
    const groups = await listRecordsByCharacter(query.name, 3)
    const rows = flattenGroups(groups).map(mapRow)
    if (!rows.length) {
      return { error: `未找到角色「${query.name}」的通关 DPS 记录` }
    }
    return {
      title: `DPS记录：${query.name}`,
      description: '各 Boss 前三名（仅统计已击杀）',
      mode: 'character',
      rows
    }
  }

  if (query.type === 'dungeon') {
    const groups = await listRecordsByDungeon(query.dungeon.name, 10)
    if (!groups.length) {
      return { error: `未找到副本「${query.dungeon.name}」的 DPS 记录` }
    }
    return {
      title: `DPS记录：${query.dungeon.name}`,
      description: '各 Boss 前十名（仅统计已击杀）',
      mode: 'dungeon',
      sections: groups.map(group => ({
        title: group.bossName,
        rows: group.records.map(mapRow)
      }))
    }
  }

  const records = await listRecordsByBoss(query.boss.groupKey, 10)
  const rows = records.map(mapRow)
  if (!rows.length) {
    return { error: `未找到 Boss「${query.boss.displayName}」的 DPS 记录` }
  }
  return {
    title: `DPS记录：${query.boss.displayName}`,
    description: '前十名（仅统计已击杀）',
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
    callback(`用法：\nmblogs（默认${DEFAULT_DUNGEON}）\nmblogs 角色名\nmblogs ${DEFAULT_DUNGEON}\nmblogs Boss名`)
    return
  }

  const queryKeyword = keyword || DEFAULT_DUNGEON

  try {
    const result = await queryMblogs(queryKeyword)
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
  queryMblogs
}
