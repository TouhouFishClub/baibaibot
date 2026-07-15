const HP_TOLERANCE = 10_000_000
const PETAK_KILL_MAXHP_RATIO = 0.5

const DUNGEONS = [
  {
    key: 'bri_lech',
    name: '布里列赫',
    aliases: ['布里列赫']
  },
  {
    key: 'pespiade',
    name: '佩斯皮亚德',
    aliases: ['佩斯皮亚德']
  }
]

// displayName：对外展示；groupKey：排行榜聚合（佩塔克一/二阶段合并）
// 佩塔克：用数据包 maxHp 识别阶段；击杀见 isPetakP1KillCompleted / isPetakP2KillCompleted
const BOSSES = [
  {
    key: 'petak_p1',
    displayName: '枯木之佩塔克',
    aliases: ['枯木之佩塔克', '枯木的佩塔克', '佩塔克'],
    groupKey: 'petak',
    maxHp: 698_516_992
  },
  {
    key: 'petak_p2',
    displayName: '枯木之佩塔克',
    aliases: ['枯木之佩塔克', '枯木的佩塔克', '佩塔克'],
    groupKey: 'petak',
    maxHp: 850_368_576
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
  },
  {
    key: 'galta',
    displayName: '塔赫杜因盖尔塔',
    aliases: ['塔赫杜因盖尔塔', '盖尔塔'],
    groupKey: 'galta',
    referenceHp: 262_500,
    hpTolerance: 50_000,
    minDuration: 0.1
  }
]

function getBossMatchHp(boss) {
  return boss.maxHp ?? boss.referenceHp
}

function getBossKillHp(boss) {
  if (boss?.groupKey === 'petak' && boss.maxHp != null) {
    return boss.maxHp * PETAK_KILL_MAXHP_RATIO
  }
  return boss.markKillHp ?? boss.referenceHp ?? boss.maxHp
}

function getBossHpTolerance(boss) {
  return boss?.hpTolerance ?? HP_TOLERANCE
}

function getBossMinDuration(boss, defaultMinDuration) {
  if (boss?.minDuration != null) return boss.minDuration
  return defaultMinDuration
}

function matchesDungeonName(dungeonName) {
  const name = String(dungeonName || '')
  if (!name) return false
  return DUNGEONS.some(dungeon => {
    const names = [dungeon.name, ...(dungeon.aliases || [])]
    return names.some(alias => name.includes(alias))
  })
}

function isKnownBossTarget(target) {
  const maxHp = Number(target?.bossHP?.maxHp)
  if (!Number.isFinite(maxHp)) return false
  return matchBossByHp(maxHp) != null
}

function matchBossByHp(packageMaxHp) {
  if (!Number.isFinite(packageMaxHp)) return null
  let matched = null
  let bestDiff = Infinity
  for (const boss of BOSSES) {
    const diff = Math.abs(packageMaxHp - getBossMatchHp(boss))
    const tolerance = getBossHpTolerance(boss)
    if (diff <= tolerance && diff < bestDiff) {
      matched = boss
      bestDiff = diff
    }
  }
  return matched
}

function getKillTolerance(boss) {
  return HP_TOLERANCE
}

function getTargetMaxHp(target) {
  return Number(target?.bossHP?.maxHp ?? target?.maxHp)
}

function getTargetDamage(target) {
  return Number(target?.totalDamage)
}

/** P1：总伤 ≥ maxHp 的 50% */
function isPetakP1KillCompleted(target) {
  const maxHp = getTargetMaxHp(target)
  const totalDamage = getTargetDamage(target)
  if (!Number.isFinite(maxHp) || maxHp <= 0 || !Number.isFinite(totalDamage)) return false
  const boss = matchBossByHp(maxHp)
  if (!boss || boss.key !== 'petak_p1') return false
  return totalDamage >= maxHp * PETAK_KILL_MAXHP_RATIO
}

/**
 * P1 超过 50% maxHp 的那部分血量
 * 例：maxHp=698M、伤害=390M → 超过 41M
 */
function getPetakP1OverHalfHp(p1Target) {
  const maxHp = getTargetMaxHp(p1Target)
  const totalDamage = getTargetDamage(p1Target)
  if (!Number.isFinite(maxHp) || !Number.isFinite(totalDamage)) return 0
  return Math.max(0, totalDamage - maxHp * PETAK_KILL_MAXHP_RATIO)
}

/**
 * P2：伤害 ≥ maxHp×50% −（P1 超过 50% 的血量）
 * 即 p1.dmg + p2.dmg ≥ 0.5*(p1.maxHp + p2.maxHp)，且 P1 须先过半血
 */
function isPetakP2KillCompleted(p1Target, p2Target) {
  const p2MaxHp = getTargetMaxHp(p2Target)
  const p2Damage = getTargetDamage(p2Target)
  if (!Number.isFinite(p2MaxHp) || p2MaxHp <= 0 || !Number.isFinite(p2Damage)) return false
  const boss = matchBossByHp(p2MaxHp)
  if (!boss || boss.key !== 'petak_p2') return false
  if (!isPetakP1KillCompleted(p1Target)) return false

  const p1OverHalf = getPetakP1OverHalfHp(p1Target)
  const threshold = p2MaxHp * PETAK_KILL_MAXHP_RATIO - p1OverHalf
  return p2Damage >= threshold
}

/** @deprecated 兼容旧调用：仅 P1 用 50% 规则；P2 单独无法判定 */
function isPetakPhaseKillCompleted(target) {
  const maxHp = getTargetMaxHp(target)
  const boss = matchBossByHp(maxHp)
  if (boss?.key === 'petak_p1') return isPetakP1KillCompleted(target)
  return false
}

function getPetakPhaseKillDiff(target) {
  const maxHp = getTargetMaxHp(target)
  const totalDamage = getTargetDamage(target)
  const boss = matchBossByHp(maxHp)
  if (!boss || boss.groupKey !== 'petak') return Infinity
  const need = maxHp * PETAK_KILL_MAXHP_RATIO
  return need - totalDamage
}

function isPetakCombinedKillCompleted(phases) {
  const p1 = phases.find(phase => phase.boss.key === 'petak_p1')
  const p2 = phases.find(phase => phase.boss.key === 'petak_p2')
  if (!p1 || !p2) return false
  return isPetakP1KillCompleted(p1.target) && isPetakP2KillCompleted(p1.target, p2.target)
}

function isBossKillCompleted(target) {
  const packageMaxHp = getTargetMaxHp(target)
  const totalDamage = getTargetDamage(target)
  if (!Number.isFinite(packageMaxHp) || !Number.isFinite(totalDamage)) {
    return false
  }

  const boss = matchBossByHp(packageMaxHp)
  // 佩塔克必须 P1+P2 成对判定，单阶段不算击杀
  if (boss?.groupKey === 'petak') {
    return false
  }

  const killHp = boss ? getBossKillHp(boss) : packageMaxHp
  const tolerance = boss ? getBossHpTolerance(boss) : HP_TOLERANCE
  return Math.abs(totalDamage - killHp) <= tolerance
}

function getBossKeysByGroup(groupKey) {
  const keys = BOSSES.filter(boss => boss.groupKey === groupKey).map(boss => boss.key)
  if (groupKey === 'petak' && !keys.includes('petak')) {
    keys.push('petak')
  }
  return keys
}

function resolveBossGroupKey(bossKeyOrGroup) {
  const value = String(bossKeyOrGroup || '').trim()
  if (!value) return value
  const boss = BOSSES.find(item => item.key === value)
  if (boss) return boss.groupKey
  return value
}

function getPetakCombinedKillHp(phases) {
  if (Array.isArray(phases) && phases.length) {
    const sum = phases.reduce((acc, phase) => acc + (getTargetDamage(phase.target) || 0), 0)
    if (Number.isFinite(sum) && sum > 0) return sum
  }
  const petakBosses = BOSSES.filter(boss => boss.groupKey === 'petak')
  return petakBosses.reduce((sum, boss) => sum + getBossKillHp(boss), 0)
}

function getGroupSortHp(groupKey) {
  const bosses = BOSSES.filter(boss => boss.groupKey === groupKey)
  if (!bosses.length) return 0
  return Math.min(...bosses.map(boss => getBossKillHp(boss)))
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
  PETAK_KILL_MAXHP_RATIO,
  DUNGEONS,
  BOSSES,
  matchBossByHp,
  isBossKillCompleted,
  isPetakPhaseKillCompleted,
  isPetakP1KillCompleted,
  isPetakP2KillCompleted,
  isPetakCombinedKillCompleted,
  getPetakP1OverHalfHp,
  getPetakPhaseKillDiff,
  getKillTolerance,
  getBossMatchHp,
  getBossKillHp,
  getBossHpTolerance,
  getBossMinDuration,
  matchesDungeonName,
  isKnownBossTarget,
  getBossKeysByGroup,
  resolveBossGroupKey,
  getPetakCombinedKillHp,
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
