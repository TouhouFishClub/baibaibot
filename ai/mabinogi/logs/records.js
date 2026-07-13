const crypto = require('crypto')
const { centiToMs } = require('./validate')
const { matchBossByHp, isBossKillCompleted } = require('./bossConfig')
const { collectPcAttackers, buildTeammateNames } = require('./team')
const { buildRunCharacterClasses } = require('./classDetect')

function buildDpsRecords({
  runId,
  dungeonName,
  uploadedAt,
  data
}) {
  const records = []
  const uploadTime = uploadedAt instanceof Date ? uploadedAt : new Date(uploadedAt)
  const characterClasses = buildRunCharacterClasses(data)

  for (const target of data.targets || []) {
    if (!isBossKillCompleted(target)) continue

    const maxHp = Number(target?.bossHP?.maxHp)
    const boss = matchBossByHp(maxHp)
    if (!boss) continue

    const pcAttackers = collectPcAttackers({ targets: [target] })
    if (!pcAttackers.length) continue

    const recordTimeMs = centiToMs(target.cleanedAt) || uploadTime.getTime()
    const recordTime = new Date(recordTimeMs)
    const teamSize = pcAttackers.length
    const duration = Number(target.duration) || 0

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
        bossHp: maxHp,
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
  }

  return records
}

module.exports = {
  buildDpsRecords
}
