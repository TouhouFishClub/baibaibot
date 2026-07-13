const TEAM_DEDUP_MS = 5 * 60 * 1000

function collectPcAttackers(data) {
  const map = new Map()
  for (const target of data.targets || []) {
    for (const attacker of target.attackers || []) {
      if (!attacker?.isPC) continue
      const id = String(attacker.id || '').trim()
      if (!id) continue
      map.set(id, {
        id,
        name: String(attacker.name || '').trim() || id
      })
    }
  }
  return [...map.values()]
}

function buildTeamSignature(data) {
  const ids = collectPcAttackers(data).map(item => item.id).sort()
  return ids.join(',')
}

function buildTeammateNames(attackers, characterId) {
  return attackers
    .filter(item => item.id !== String(characterId))
    .map(item => item.name || item.id)
    .join('、') || '-'
}

module.exports = {
  TEAM_DEDUP_MS,
  collectPcAttackers,
  buildTeamSignature,
  buildTeammateNames
}
