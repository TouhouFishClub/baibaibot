const { centiToMs } = require('./validate')
const { deriveTargetTiming } = require('./timing')

function summarizeAttackers(attackers, duration, targetTotalDamage) {
  if (!Array.isArray(attackers)) return []
  return attackers.map(attacker => ({
    id: String(attacker.id || ''),
    name: String(attacker.name || ''),
    totalDamage: Number(attacker.totalDamage) || 0,
    dps: duration > 0 ? (Number(attacker.totalDamage) || 0) / duration : 0,
    percent: targetTotalDamage > 0
      ? ((Number(attacker.totalDamage) || 0) / targetTotalDamage) * 100
      : 0,
    isPC: Boolean(attacker.isPC)
  }))
}

function summarizeTarget(target) {
  const totalDamage = Number(target.totalDamage) || 0
  const timing = deriveTargetTiming(target)
  return {
    targetId: String(target.targetId || ''),
    targetName: String(target.targetName || ''),
    totalDamage,
    dps: timing.duration > 0 ? totalDamage / timing.duration : 0,
    duration: timing.duration,
    reportedDuration: timing.reportedDuration,
    activeDuration: timing.activeDuration,
    elapsedDuration: timing.elapsedDuration,
    timingAnomaly: timing.timingAnomaly,
    durationSource: timing.durationSource,
    maxHp: Number(target?.bossHP?.maxHp) || 0,
    cleanedAt: centiToMs(target.cleanedAt),
    appearedAt: centiToMs(target.appearedAt),
    deathTime: target.deathTime != null ? centiToMs(target.deathTime) : null,
    attackerCount: Array.isArray(target.attackers) ? target.attackers.length : 0,
    attackers: summarizeAttackers(target.attackers, timing.duration, totalDamage)
  }
}

function extractSummary(data) {
  const targets = (data.targets || []).map(summarizeTarget)
  return {
    targetCount: targets.length,
    targets,
    totalDamage: targets.reduce((sum, item) => sum + item.totalDamage, 0)
  }
}

module.exports = {
  extractSummary,
  summarizeTarget
}
