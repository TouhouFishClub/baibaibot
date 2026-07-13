const { centiToMs } = require('./validate')
const {
  matchBossByHp,
  isBossKillCompleted,
  isPetakCombinedKillCompleted
} = require('./bossConfig')
const { collectPetakPhasePairs } = require('./records')

const COLORS = [
  '#ffc107',
  '#9c27b0',
  '#009688',
  '#42a5f5',
  '#ff9800',
  '#e91e63',
  '#4caf50',
  '#2196f3'
]

const BAR_CLASSES = [
  'bar-gold',
  'bar-purple',
  'bar-teal',
  'bar-blue',
  'bar-orange',
  'bar-pink'
]

function historyTimeToMs(value) {
  if (value == null || value === '') return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  if (n > 1e12) return Math.floor(n)
  if (n > 1e10) return Math.floor(n * 10)
  return Math.floor(n * 1000)
}

function formatNumber(num) {
  const n = Number(num) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function formatDps(num) {
  const n = Number(num) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`
  return n.toFixed(2)
}

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  if (s < 60) return `${s.toFixed(2)}秒`
  const minutes = Math.floor(s / 60)
  const remain = s % 60
  if (minutes < 60) {
    return remain > 0 ? `${minutes}分${remain.toFixed(2)}秒` : `${minutes}分`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}时${mins}分`
}

function getDisplayName(id, name) {
  const textId = String(id || '')
  const shortId = textId.length > 6 ? textId.slice(-6) : textId
  const label = String(name || '').trim()
  const isValidName = label && label !== textId && label !== shortId
  if (isValidName) return `${label}(${shortId})`
  return `未知(${shortId})`
}

function compareHits(a, b) {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
  return (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER)
}

function collectHitRecords(target) {
  const records = []
  for (const attacker of target.attackers || []) {
    if (!attacker?.isPC) continue
    for (const skill of attacker.skillsDetail || []) {
      for (const record of skill.hitRecords || []) {
        const timestamp = historyTimeToMs(record.timestamp)
        if (!timestamp) continue
        records.push({
          seq: record.seq,
          timestamp,
          damage: Number(record.damage) || 0,
          attackerId: String(attacker.id || ''),
          attackerName: getDisplayName(attacker.id, attacker.name)
        })
      }
    }
  }
  records.sort(compareHits)
  return records
}

function calculateTargetTimeRange(target) {
  let minTime = Infinity
  let maxTime = -Infinity

  for (const attacker of target.attackers || []) {
    if (attacker.lastHit) {
      const ts = historyTimeToMs(attacker.lastHit)
      if (ts > maxTime) maxTime = ts
    }
    for (const skill of attacker.skillsDetail || []) {
      for (const record of skill.hitRecords || []) {
        const ts = historyTimeToMs(record.timestamp)
        if (!ts) continue
        if (ts < minTime) minTime = ts
        if (ts > maxTime) maxTime = ts
      }
    }
  }

  if (target.deathTime) {
    maxTime = Math.max(maxTime, historyTimeToMs(target.deathTime))
  }
  if (!Number.isFinite(minTime)) {
    minTime = historyTimeToMs(target.appearedAt)
  }
  if (!Number.isFinite(maxTime)) {
    maxTime = historyTimeToMs(target.cleanedAt) || minTime
  }

  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime > maxTime) {
    return null
  }
  return { minTime, maxTime }
}

function extractChartSeries(target) {
  const series = []
  for (const attacker of target.attackers || []) {
    if (!attacker?.isPC || !attacker.skillsDetail?.length) continue

    const records = []
    for (const skill of attacker.skillsDetail) {
      for (const record of skill.hitRecords || []) {
        const timestamp = historyTimeToMs(record.timestamp)
        if (!timestamp) continue
        records.push({
          seq: record.seq,
          timestamp,
          damage: Number(record.damage) || 0
        })
      }
    }
    if (!records.length) continue
    records.sort(compareHits)

    const name = getDisplayName(attacker.id, attacker.name)
    series.push({
      attackerId: String(attacker.id || name),
      attackerName: name,
      records
    })
  }
  return series
}

function computeDpsSeries(chartSeries) {
  return chartSeries.map(item => {
    const records = item.records
    if (!records.length) {
      return {
        attackerId: item.attackerId,
        attackerName: item.attackerName,
        points: [],
        avgDps: 0,
        currentDps: 0
      }
    }

    const startTime = records[0].timestamp
    const endTime = records[records.length - 1].timestamp
    const totalDamage = records.reduce((sum, row) => sum + row.damage, 0)
    const durationSec = Math.max((endTime - startTime) / 1000, 0.001)
    const avgDps = totalDamage / durationSec

    const prefix = [0]
    for (const row of records) prefix.push(prefix[prefix.length - 1] + row.damage)

    const points = []
    let ptr = 0
    for (let t = startTime; t <= endTime; t += 1000) {
      while (ptr < records.length && records[ptr].timestamp <= t) ptr++
      const cumulative = prefix[ptr]
      const elapsed = (t - startTime) / 1000
      points.push({ time: t, dps: elapsed > 0 ? cumulative / elapsed : 0 })
    }

    const currentDps = points.length ? points[points.length - 1].dps : avgDps
    return {
      attackerId: item.attackerId,
      attackerName: item.attackerName,
      points,
      avgDps,
      currentDps
    }
  }).sort((a, b) => b.currentDps - a.currentDps)
}

function sampleBossHpMarkers(bossHP, minTime, maxTime, forceEndAtZero = false) {
  const history = bossHP?.history || []
  if (!history.length || !minTime || !maxTime || maxTime <= minTime) return []

  const sorted = [...history].sort((a, b) => a.hptimestamp - b.hptimestamp)
  const markers = [{ time: minTime, percent: 100 }]
  let lastPercent = 100

  for (const row of sorted) {
    const time = historyTimeToMs(row.hptimestamp)
    if (!time || time < minTime || time > maxTime) continue
    const percent = Number(row.percent)
    if (!Number.isFinite(percent)) continue
    if (Math.abs(lastPercent - percent) >= 5 || percent === 0) {
      markers.push({ time, percent })
      lastPercent = percent
    }
  }

  const endPercent = forceEndAtZero ? 0 : lastPercent
  if (!markers.length || markers[markers.length - 1].time !== maxTime) {
    markers.push({ time: maxTime, percent: endPercent })
  }
  return markers
}

function sortTargets(targets = []) {
  return [...targets].sort((a, b) => {
    const ta = historyTimeToMs(a.appearedAt) || historyTimeToMs(a.cleanedAt) || 0
    const tb = historyTimeToMs(b.appearedAt) || historyTimeToMs(b.cleanedAt) || 0
    return ta - tb
  })
}

function buildAttackerRows(target) {
  const attackers = (target.attackers || [])
    .filter(item => item?.isPC)
    .map(item => ({
      id: String(item.id || ''),
      name: getDisplayName(item.id, item.name),
      totalDamage: Number(item.totalDamage) || 0,
      dps: Number(item.dps) || 0,
      percent: Number(item.percent) || 0
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage)

  const maxDamage = attackers.reduce((max, item) => Math.max(max, item.totalDamage), 0) || 1
  return attackers.map((item, index) => ({
    ...item,
    colorIndex: index,
    barWidth: (item.totalDamage / maxDamage) * 100
  }))
}

function buildBossPanel(target) {
  const timeRange = calculateTargetTimeRange(target)
  const chartSeries = extractChartSeries(target)
  const dpsSeries = computeDpsSeries(chartSeries)
  const bossHpMarkers = timeRange
    ? sampleBossHpMarkers(target.bossHP, timeRange.minTime, timeRange.maxTime, Boolean(target.deathTime))
    : []

  return {
    targetId: String(target.targetId || ''),
    targetName: getDisplayName(target.targetId, target.targetName),
    rawName: String(target.targetName || ''),
    duration: Number(target.duration) || 0,
    totalDamage: Number(target.totalDamage) || 0,
    dps: Number(target.dps) || 0,
    attackers: buildAttackerRows(target),
    timeRange,
    dpsSeries,
    bossHpMarkers
  }
}

function getTargetKey(target) {
  return String(target?.targetId || target?.targetName || '')
}

function filterKilledTargets(targets = []) {
  const sorted = sortTargets(targets)
  const includedPetakKeys = new Set()

  for (const phases of collectPetakPhasePairs(sorted)) {
    if (!isPetakCombinedKillCompleted(phases)) continue
    for (const phase of phases) {
      includedPetakKeys.add(getTargetKey(phase.target))
    }
  }

  const result = []
  for (const target of sorted) {
    const boss = matchBossByHp(Number(target?.bossHP?.maxHp))
    if (boss?.groupKey === 'petak') {
      if (includedPetakKeys.has(getTargetKey(target))) {
        result.push(target)
      }
      continue
    }
    if (isBossKillCompleted(target)) {
      result.push(target)
    }
  }
  return result
}

function buildRunPanels(data) {
  return filterKilledTargets(data?.targets || []).map(buildBossPanel)
}

module.exports = {
  COLORS,
  BAR_CLASSES,
  historyTimeToMs,
  formatNumber,
  formatDps,
  formatDuration,
  getDisplayName,
  buildRunPanels,
  buildBossPanel,
  filterKilledTargets,
  computeDpsSeries,
  sampleBossHpMarkers
}
