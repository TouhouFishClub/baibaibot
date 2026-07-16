const { parseGzipJson } = require('./validate')
const { readSourceFile } = require('./storage')
const { findReportByRunId } = require('./db')
const { matchBossByHp } = require('./bossConfig')
const { extractSkillName } = require('./classDetect')

const MAX_SKILLS = 5

function getSkillDamage(skill) {
  if (!skill || typeof skill !== 'object') return 0
  for (const key of ['totalDamage', 'damage', 'sumDamage', 'value']) {
    const n = Number(skill[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  let sum = 0
  for (const hit of skill.hitRecords || []) {
    sum += Number(hit.damage) || 0
  }
  return sum
}

function accumulateAttackerSkills(attacker, damageBySkill) {
  if (!attacker?.isPC) return
  const details = attacker.skillsDetail
  const entries = (Array.isArray(details) && details.length
    ? details
    : attacker.skills) || []

  for (const skill of entries) {
    const name = extractSkillName(skill)
    if (!name) continue
    const damage = getSkillDamage(skill)
    if (damage <= 0) continue
    damageBySkill.set(name, (damageBySkill.get(name) || 0) + damage)
  }
}

function matchTargetsForRecord(data, record) {
  const targets = data?.targets || []
  const bossGroup = record.bossGroup || record.bossKey
  const bossKey = record.bossKey

  return targets.filter(target => {
    const boss = matchBossByHp(Number(target?.bossHP?.maxHp))
    if (!boss) return false
    if (bossGroup === 'petak' || bossKey === 'petak') {
      return boss.groupKey === 'petak'
    }
    if (bossKey && boss.key === bossKey) return true
    if (bossGroup && boss.groupKey === bossGroup) return true
    return false
  })
}

function buildSkillBreakdownFromTargets(targets, characterId) {
  const damageBySkill = new Map()
  const cid = String(characterId || '').trim()
  if (!cid) return []

  for (const target of targets) {
    for (const attacker of target.attackers || []) {
      if (String(attacker?.id || '').trim() !== cid) continue
      accumulateAttackerSkills(attacker, damageBySkill)
    }
  }

  const total = [...damageBySkill.values()].reduce((sum, value) => sum + value, 0)
  if (total <= 0) return []

  const ranked = [...damageBySkill.entries()]
    .map(([name, damage]) => ({
      name,
      damage,
      percent: (damage / total) * 100
    }))
    .sort((a, b) => b.damage - a.damage)

  const top = ranked.slice(0, MAX_SKILLS)
  const rest = ranked.slice(MAX_SKILLS)
  if (rest.length) {
    const damage = rest.reduce((sum, item) => sum + item.damage, 0)
    top.push({
      name: '其他',
      damage,
      percent: (damage / total) * 100
    })
  }

  return top
}

function buildSkillBreakdownForRecord(data, record) {
  const targets = matchTargetsForRecord(data, record)
  return buildSkillBreakdownFromTargets(targets, record.characterId)
}

async function loadRunCombatData(runId) {
  const report = await findReportByRunId(runId)
  if (!report?.sourceRelPath) return null
  const buffer = readSourceFile(report.sourceRelPath)
  if (!buffer) return null
  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) return null
  return parsed.data
}

async function attachSkillBreakdowns(sections) {
  const runCache = new Map()
  const result = []

  for (const section of sections || []) {
    const rows = []
    for (const row of section.rows || []) {
      const runId = row.runId
      let skills = []
      if (runId && row.characterId) {
        if (!runCache.has(runId)) {
          runCache.set(runId, await loadRunCombatData(runId))
        }
        const data = runCache.get(runId)
        if (data) {
          skills = buildSkillBreakdownForRecord(data, row)
        }
      }
      rows.push({ ...row, skills })
    }
    result.push({ ...section, rows })
  }

  return result
}

module.exports = {
  MAX_SKILLS,
  getSkillDamage,
  buildSkillBreakdownFromTargets,
  buildSkillBreakdownForRecord,
  attachSkillBreakdowns,
  loadRunCombatData
}
