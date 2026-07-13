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
  const maxHp = Number(target?.bossHP?.maxHp)
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
  const combinedKillHp = sortedPhases.reduce((sum, phase) => sum + getBossKillHp(phase.boss), 0)
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

  const records = []
  for (const [characterId, totalDamage] of damageByCharacter) {
    const dps = duration > 0 ? totalDamage / duration : 0
    records.push({
      _id: crypto.randomUUID(),
      runId,
      dungeonName,
      bossKey: 'petak',
      bossGroup: 'petak',
      bossName: sampleBoss.displayName,
      bossHp: combinedKillHp,
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
      damagePercent: combinedKillHp > 0 ? (totalDamage / combinedKillHp) * 100 : 0,
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
  const petakPhases = []

  for (const target of data.targets || []) {
    if (!isBossKillCompleted(target)) continue

    const maxHp = Number(target?.bossHP?.maxHp)
    const boss = matchBossByHp(maxHp)
    if (!boss) continue

    if (boss.groupKey === 'petak') {
      petakPhases.push({ boss, target })
      continue
    }

    records.push(...buildRecordForTarget({
      runId,
      dungeonName,
      uploadTime,
      target,
      boss,
      characterClasses
    }))
  }

  records.push(...buildPetakCombinedRecords({
    runId,
    dungeonName,
    uploadTime,
    phases: petakPhases,
    characterClasses
  }))

  return records
}

module.exports = {
  buildDpsRecords,
  buildPetakCombinedRecords
}
