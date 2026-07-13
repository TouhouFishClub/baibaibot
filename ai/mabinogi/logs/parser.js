const { centiToMs } = require('./validate')

function summarizeAttackers(attackers) {
  if (!Array.isArray(attackers)) return []
  return attackers.map(attacker => ({
    id: String(attacker.id || ''),
    name: String(attacker.name || ''),
    totalDamage: Number(attacker.totalDamage) || 0,
    dps: Number(attacker.dps) || 0,
    percent: Number(attacker.percent) || 0,
    isPC: Boolean(attacker.isPC)
  }))
}

function summarizeTarget(target) {
  return {
    targetId: String(target.targetId || ''),
    targetName: String(target.targetName || ''),
    totalDamage: Number(target.totalDamage) || 0,
    dps: Number(target.dps) || 0,
    duration: Number(target.duration) || 0,
    maxHp: Number(target?.bossHP?.maxHp) || 0,
    cleanedAt: centiToMs(target.cleanedAt),
    appearedAt: centiToMs(target.appearedAt),
    deathTime: target.deathTime != null ? centiToMs(target.deathTime) : null,
    attackerCount: Array.isArray(target.attackers) ? target.attackers.length : 0,
    attackers: summarizeAttackers(target.attackers)
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
