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

function getPetakTargetSortTime(target) {
  return centiToMs(target.appearedAt)
    || centiToMs(target.deathTime)
    || centiToMs(target.cleanedAt)
    || 0
}

function collectPetakTargets(targets) {
  const items = []
  for (const target of targets || []) {
    const maxHp = Number(target?.bossHP?.maxHp)
    const boss = matchBossByHp(maxHp)
    if (boss?.groupKey !== 'petak') continue
    items.push({ boss, target, sortTime: getPetakTargetSortTime(target) })
  }
  return items.sort((a, b) => a.sortTime - b.sortTime)
}

// 按出现时间顺序将 P1 与紧随其后的 P2 配对，不跨轮次组合
function collectPetakPhasePairs(targets) {
  const sorted = collectPetakTargets(targets)
  const pairs = []
  let pendingP1 = null

  for (const item of sorted) {
    if (item.boss.key === 'petak_p1') {
      pendingP1 = item
      continue
    }

    if (item.boss.key === 'petak_p2') {
      if (!pendingP1) continue
      pairs.push([
        { boss: pendingP1.boss, target: pendingP1.target },
        { boss: item.boss, target: item.target }
      ])
      pendingP1 = null
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

module.exports = {
  buildDpsRecords,
  buildPetakCombinedRecords,
  collectPetakPhasePairs,
  collectPetakPhases,
  canRecordPetakCombined
}
