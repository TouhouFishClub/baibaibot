const HP_TOLERANCE = 10_000_000

const DUNGEONS = [
  {
    key: 'bri_lech',
    name: '布里列赫',
    aliases: ['布里列赫']
  }
]

// displayName：对外展示；groupKey：排行榜聚合（佩塔克一/二阶段合并）
// 阶段区分仅依赖 referenceHp，不依赖游戏内 targetName
const BOSSES = [
  {
    key: 'petak_p1',
    displayName: '枯木之佩塔克',
    aliases: ['枯木之佩塔克', '枯木的佩塔克', '佩塔克'],
    groupKey: 'petak',
    referenceHp: 411_100_000
  },
  {
    key: 'petak_p2',
    displayName: '枯木之佩塔克',
    aliases: ['枯木之佩塔克', '枯木的佩塔克', '佩塔克'],
    groupKey: 'petak',
    referenceHp: 488_900_000
  },
  {
    key: 'brontanas',
    displayName: '布隆塔纳斯',
    aliases: ['布隆塔纳斯'],
    groupKey: 'brontanas',
    referenceHp: 1_143_400_000
  },
  {
    key: 'mayer',
    displayName: '雷内恩的米耶尔',
    aliases: ['雷内恩的米耶尔', '米耶尔'],
    groupKey: 'mayer',
    referenceHp: 1_968_000_000
  },
  {
    key: 'mayer_regret',
    displayName: '雷内恩的米耶尔：悔恨',
    aliases: ['雷内恩的米耶尔：悔恨', '悔恨', '米耶尔：悔恨'],
    groupKey: 'mayer_regret',
    referenceHp: 3_449_000_000
  }
]

function matchBossByHp(maxHp) {
  if (!Number.isFinite(maxHp)) return null
  let matched = null
  let bestDiff = Infinity
  for (const boss of BOSSES) {
    const diff = Math.abs(maxHp - boss.referenceHp)
    if (diff <= HP_TOLERANCE && diff < bestDiff) {
      matched = boss
      bestDiff = diff
    }
  }
  return matched
}

function isBossKillCompleted(target) {
  const maxHp = Number(target?.bossHP?.maxHp ?? target?.maxHp)
  const totalDamage = Number(target.totalDamage)
  if (!Number.isFinite(maxHp) || !Number.isFinite(totalDamage)) {
    return false
  }
  return Math.abs(totalDamage - maxHp) <= HP_TOLERANCE
}

function getBossKeysByGroup(groupKey) {
  return BOSSES.filter(boss => boss.groupKey === groupKey).map(boss => boss.key)
}

function getGroupSortHp(groupKey) {
  const bosses = BOSSES.filter(boss => boss.groupKey === groupKey)
  if (!bosses.length) return 0
  return Math.min(...bosses.map(boss => boss.referenceHp))
}

function resolveBossQuery(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return null

  const matched = new Set()
  for (const boss of BOSSES) {
    const names = [boss.displayName, ...boss.aliases]
    if (names.some(name => kw === name || kw.includes(name) || name.includes(kw))) {
      matched.add(boss.groupKey)
    }
  }
  if (!matched.size) return null

  if (matched.size > 1) {
    const groups = [...matched]
    const exact = BOSSES.find(boss => boss.displayName === kw || boss.aliases.includes(kw))
    if (exact) {
      return {
        groupKey: exact.groupKey,
        displayName: exact.displayName,
        bossKeys: getBossKeysByGroup(exact.groupKey)
      }
    }
    return null
  }

  const groupKey = [...matched][0]
  const sample = BOSSES.find(boss => boss.groupKey === groupKey)
  return {
    groupKey,
    displayName: sample?.displayName || groupKey,
    bossKeys: getBossKeysByGroup(groupKey)
  }
}

function resolveQueryType(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return { type: 'help' }

  const bossQuery = resolveBossQuery(kw)
  if (bossQuery) {
    return { type: 'boss', boss: bossQuery }
  }

  for (const dungeon of DUNGEONS) {
    const names = [dungeon.name, ...dungeon.aliases]
    if (names.some(name => kw === name || kw.includes(name) || name.includes(kw))) {
      return { type: 'dungeon', dungeon }
    }
  }

  return { type: 'character', name: kw }
}

function formatHp(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m > 0) return `${m}分${r}秒`
  return `${r}秒`
}

function formatPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `${n.toFixed(1)}%`
}

function formatDps(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function formatDamage(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function shortRunId(runId) {
  if (!runId) return '-'
  const text = String(runId).replace(/-/g, '')
  return text.slice(0, 8)
}

module.exports = {
  HP_TOLERANCE,
  DUNGEONS,
  BOSSES,
  matchBossByHp,
  isBossKillCompleted,
  getBossKeysByGroup,
  getGroupSortHp,
  resolveBossQuery,
  resolveQueryType,
  formatHp,
  formatDuration,
  formatPercent,
  formatDps,
  formatDamage,
  shortRunId
}
