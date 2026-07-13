const crypto = require('crypto')
const { centiToMs } = require('./validate')
const {
  matchBossByHp,
  isBossKillCompleted,
  getBossKillHp
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

function collectPetakPhases(targets) {
  const byKey = new Map()
  for (const target of targets || []) {
    const maxHp = Number(target?.bossHP?.maxHp)
    const boss = matchBossByHp(maxHp)
    if (boss?.groupKey !== 'petak') continue
    if (!byKey.has(boss.key)) {
      byKey.set(boss.key, { boss, target })
    }
  }

  const phases = []
  for (const key of ['petak_p1', 'petak_p2']) {
    const phase = byKey.get(key)
    if (phase) phases.push(phase)
  }
  return phases
}

function canRecordPetakCombined(phases) {
  if (!phases.length) return false
  const p1 = phases.find(phase => phase.boss.key === 'petak_p1')
  if (p1) return isBossKillCompleted(p1.target)
  return phases.some(phase => isBossKillCompleted(phase.target))
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
  const bossHp = sortedPhases.reduce((sum, phase) => sum + getBossKillHp(phase.boss), 0)
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
  const petakPhases = collectPetakPhases(targets)

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

  if (canRecordPetakCombined(petakPhases)) {
    records.push(...buildPetakCombinedRecords({
      runId,
      dungeonName,
      uploadTime,
      phases: petakPhases,
      characterClasses
    }))
  }

  return records
}

module.exports = {
  buildDpsRecords,
  buildPetakCombinedRecords,
  collectPetakPhases,
  canRecordPetakCombined
}
