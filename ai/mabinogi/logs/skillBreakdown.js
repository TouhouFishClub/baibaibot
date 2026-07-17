const { parseGzipJson } = require('./validate')
const { readSourceFile } = require('./storage')
const { findReportByRunId } = require('./db')
const { matchBossByHp } = require('./bossConfig')
const { extractSkillName } = require('./classDetect')

const MAX_SKILLS = 5
const AI_MAX_SKILLS = 10

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

function getSkillHitCount(skill) {
  if (!skill || typeof skill !== 'object') return 0
  for (const key of ['hitCount', 'count', 'casts', 'useCount', 'times', 'hitTimes']) {
    const n = Number(skill[key])
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  if (Array.isArray(skill.hitRecords) && skill.hitRecords.length) {
    return skill.hitRecords.length
  }
  return 0
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
    const count = getSkillHitCount(skill)
    const prev = damageBySkill.get(name) || { damage: 0, count: 0 }
    damageBySkill.set(name, {
      damage: prev.damage + damage,
      count: prev.count + count
    })
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

function buildSkillBreakdownFromTargets(targets, characterId, { maxSkills = MAX_SKILLS } = {}) {
  const damageBySkill = new Map()
  const cid = String(characterId || '').trim()
  if (!cid) return []

  for (const target of targets) {
    for (const attacker of target.attackers || []) {
      if (String(attacker?.id || '').trim() !== cid) continue
      accumulateAttackerSkills(attacker, damageBySkill)
    }
  }

  const total = [...damageBySkill.values()].reduce((sum, value) => sum + value.damage, 0)
  if (total <= 0) return []

  const ranked = [...damageBySkill.entries()]
    .map(([name, info]) => ({
      name,
      damage: info.damage,
      count: info.count || 0,
      percent: (info.damage / total) * 100
    }))
    .sort((a, b) => b.damage - a.damage)

  const limit = Number.isFinite(maxSkills) && maxSkills > 0 ? maxSkills : ranked.length
  const top = ranked.slice(0, limit)
  const rest = ranked.slice(limit)
  if (rest.length) {
    const damage = rest.reduce((sum, item) => sum + item.damage, 0)
    const count = rest.reduce((sum, item) => sum + (item.count || 0), 0)
    top.push({
      name: '其他',
      damage,
      count,
      percent: (damage / total) * 100
    })
  }

  return top
}

function buildSkillBreakdownForRecord(data, record, options) {
  const targets = matchTargetsForRecord(data, record)
  return buildSkillBreakdownFromTargets(targets, record.characterId, options)
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

async function attachSkillBreakdowns(sections, { maxSkills = MAX_SKILLS, runCache } = {}) {
  const cache = runCache || new Map()
  const result = []

  for (const section of sections || []) {
    const rows = []
    for (const row of section.rows || []) {
      const runId = row.runId
      let skills = []
      if (runId && row.characterId) {
        if (!cache.has(runId)) {
          cache.set(runId, await loadRunCombatData(runId))
        }
        const data = cache.get(runId)
        if (data) {
          skills = buildSkillBreakdownForRecord(data, row, { maxSkills })
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
  AI_MAX_SKILLS,
  getSkillDamage,
  getSkillHitCount,
  buildSkillBreakdownFromTargets,
  buildSkillBreakdownForRecord,
  attachSkillBreakdowns,
  loadRunCombatData
}
