const { CLASSES, UNKNOWN_CLASS } = require('./classConfig')

function extractSkillName(entry) {
  if (!entry || typeof entry !== 'object') return ''
  const name = entry.name || entry.skillName || entry.skill || entry.title
  return name ? String(name).trim() : ''
}

function collectSkillNames(attacker) {
  const names = new Set()
  for (const skill of attacker.skills || []) {
    const name = extractSkillName(skill)
    if (name) names.add(name)
  }
  for (const detail of attacker.skillsDetail || []) {
    const name = extractSkillName(detail)
    if (name) names.add(name)
  }
  return names
}

function collectCharacterSkills(data) {
  const map = new Map()
  for (const target of data.targets || []) {
    for (const attacker of target.attackers || []) {
      if (!attacker?.isPC) continue
      const characterId = String(attacker.id || '').trim()
      if (!characterId) continue
      if (!map.has(characterId)) map.set(characterId, new Set())
      const skills = collectSkillNames(attacker)
      for (const skill of skills) {
        map.get(characterId).add(skill)
      }
    }
  }
  return map
}

function detectClassBySkills(skillNames) {
  const used = skillNames instanceof Set ? skillNames : new Set(skillNames || [])
  for (const cls of CLASSES) {
    if (cls.skills.some(skill => used.has(skill))) {
      return cls.name
    }
  }
  return UNKNOWN_CLASS
}

function buildRunCharacterClasses(data) {
  const skillMap = collectCharacterSkills(data)
  const classes = new Map()
  for (const [characterId, skills] of skillMap) {
    classes.set(characterId, detectClassBySkills(skills))
  }
  return classes
}

module.exports = {
  collectSkillNames,
  collectCharacterSkills,
  detectClassBySkills,
  buildRunCharacterClasses
}
