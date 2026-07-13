const crypto = require('crypto')
const { centiToMs } = require('./validate')
const {
  matchBossByHp,
  isBossKillCompleted,
  isPetakCombinedKillCompleted,
  getBossKillHp,
  PETAK_COMBINED_KILL_HP
} = require('./bossConfig')
const { collectPcAttackers, buildTeammateNames } = require('./team')
const { buildRunCharacterClasses } = require('./classDetect')

function buildRecordForTarget({
  runId,
  dungeonName,
  uploadTime,
  target,
  boss,
  characterClasses
}) {
  const pcAttackers = collectPcAttackers({ targets: [target] })
  if (!pcAttackers.length) return []

  const recordTimeMs = centiToMs(target.cleanedAt) || uploadTime.getTime()
  const recordTime = new Date(recordTimeMs)
  const teamSize = pcAttackers.length
  const duration = Number(target.duration) || 0
  const records = []

  for (const attacker of target.attackers || []) {
    if (!attacker?.isPC) continue
    const characterId = String(attacker.id || '').trim()
    if (!characterId) continue

    records.push({
      _id: crypto.randomUUID(),
      runId,
      dungeonName,
      bossKey: boss.key,
      bossGroup: boss.groupKey,
      bossName: boss.displayName,
      bossHp: getBossKillHp(boss),
      recordTime,
      recordTs: recordTime.getTime(),
      duration,
      teamSize,
      teammateNames: buildTeammateNames(pcAttackers, characterId),
      characterId,
      characterName: String(attacker.name || '').trim() || characterId,
      characterClass: characterClasses.get(characterId) || '未知',
      dps: Number(attacker.dps) || 0,
      totalDamage: Number(attacker.totalDamage) || 0,
      damagePercent: Number(attacker.percent) || 0,
      uploadedAt: uploadTime,
      uploadedTs: uploadTime.getTime()
    })
  }

  return records
}

function getTargetSortTime(target) {
  return centiToMs(target.appearedAt)
    || centiToMs(target.deathTime)
    || centiToMs(target.cleanedAt)
    || 0
}

function getTargetKey(target) {
  return String(target?.targetId || target?.targetName || '')
}

function sortTargetsByTime(targets = []) {
  return [...targets].sort((a, b) => getTargetSortTime(a) - getTargetSortTime(b))
}

// 在全 targets 时间序中，仅当 P1 与紧随其后的 P2 相邻时配对
function collectPetakPhasePairs(targets) {
  const sorted = sortTargetsByTime(targets)
  const pairs = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    const bossCurrent = matchBossByHp(Number(current?.bossHP?.maxHp))
    const bossNext = matchBossByHp(Number(next?.bossHP?.maxHp))
    if (bossCurrent?.key === 'petak_p1' && bossNext?.key === 'petak_p2') {
      pairs.push([
        { boss: bossCurrent, target: current },
        { boss: bossNext, target: next }
      ])
    }
  }

  return pairs
}

function collectPetakPhases(targets) {
  const pairs = collectPetakPhasePairs(targets)
  return pairs[0] || []
}

function canRecordPetakCombined(phases) {
  return isPetakCombinedKillCompleted(phases)
}

function buildPetakCombinedRecords({
  runId,
  dungeonName,
  uploadTime,
  phases,
  characterClasses
}) {
  if (!phases.length) return []

  const sortedPhases = [...phases].sort((a, b) => getBossKillHp(a.boss) - getBossKillHp(b.boss))
  const sampleBoss = sortedPhases[0].boss
  const bossHp = PETAK_COMBINED_KILL_HP
  const duration = sortedPhases.reduce((sum, phase) => sum + (Number(phase.target.duration) || 0), 0)
  const recordTimeMs = Math.max(...sortedPhases.map(phase => centiToMs(phase.target.cleanedAt) || uploadTime.getTime()))
  const recordTime = new Date(recordTimeMs)
  const pcAttackers = collectPcAttackers({ targets: sortedPhases.map(phase => phase.target) })
  const teamSize = pcAttackers.length

  const damageByCharacter = new Map()
  const nameByCharacter = new Map()
  for (const { target } of sortedPhases) {
    for (const attacker of target.attackers || []) {
      if (!attacker?.isPC) continue
      const characterId = String(attacker.id || '').trim()
      if (!characterId) continue
      const damage = Number(attacker.totalDamage) || 0
      damageByCharacter.set(characterId, (damageByCharacter.get(characterId) || 0) + damage)
      nameByCharacter.set(characterId, String(attacker.name || '').trim() || characterId)
    }
  }

  const teamTotalDamage = [...damageByCharacter.values()].reduce((sum, value) => sum + value, 0)
  const records = []
  for (const [characterId, totalDamage] of damageByCharacter) {
    const dps = duration > 0 ? totalDamage / duration : 0
    const damagePercent = teamTotalDamage > 0 ? (totalDamage / teamTotalDamage) * 100 : 0
    records.push({
      _id: crypto.randomUUID(),
      runId,
      dungeonName,
      bossKey: 'petak',
      bossGroup: 'petak',
      bossName: sampleBoss.displayName,
      bossHp,
      recordTime,
      recordTs: recordTime.getTime(),
      duration,
      teamSize,
      teammateNames: buildTeammateNames(pcAttackers, characterId),
      characterId,
      characterName: nameByCharacter.get(characterId) || characterId,
      characterClass: characterClasses.get(characterId) || '未知',
      dps,
      totalDamage,
      damagePercent,
      uploadedAt: uploadTime,
      uploadedTs: uploadTime.getTime()
    })
  }

  return records
}

function buildDpsRecords({
  runId,
  dungeonName,
  uploadedAt,
  data
}) {
  const records = []
  const uploadTime = uploadedAt instanceof Date ? uploadedAt : new Date(uploadedAt)
  const characterClasses = buildRunCharacterClasses(data)
  const targets = data.targets || []
  const petakPairs = collectPetakPhasePairs(targets)

  for (const target of targets) {
    const maxHp = Number(target?.bossHP?.maxHp)
    const boss = matchBossByHp(maxHp)
    if (!boss || boss.groupKey === 'petak') continue
    if (!isBossKillCompleted(target)) continue

    records.push(...buildRecordForTarget({
      runId,
      dungeonName,
      uploadTime,
      target,
      boss,
      characterClasses
    }))
  }

  for (const phases of petakPairs) {
    if (!canRecordPetakCombined(phases)) continue
    records.push(...buildPetakCombinedRecords({
      runId,
      dungeonName,
      uploadTime,
      phases,
      characterClasses
    }))
  }

  return records
}

function getKilledTargetsForRun(targets = []) {
  const sorted = sortTargetsByTime(targets)
  const includedPetakKeys = new Set()

  for (const phases of collectPetakPhasePairs(sorted)) {
    if (!canRecordPetakCombined(phases)) continue
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

module.exports = {
  buildDpsRecords,
  buildPetakCombinedRecords,
  collectPetakPhasePairs,
  collectPetakPhases,
  canRecordPetakCombined,
  getKilledTargetsForRun,
  sortTargetsByTime
}
