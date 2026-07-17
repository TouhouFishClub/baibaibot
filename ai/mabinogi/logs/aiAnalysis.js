const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const { BOSSES } = require('./bossConfig')
const { CLASSES } = require('./classConfig')
const { listRecordsByBoss } = require('./db')
const { attachSkillBreakdowns, AI_MAX_SKILLS } = require('./skillBreakdown')
const {
  getShanghaiDateKey,
  insertAiSnapshot,
  getLatestAiSnapshot,
  getDailyAiReport,
  upsertDailyAiReport
} = require('./aiAnalysisDb')
const { renderAiAnalysisReport } = require('./renderAiAnalysis')

const TOP_ALL = 20
const TOP_CLASS = 10

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

let running = false

function loadDeepSeekApiKey() {
  const secretPaths = [
    path.join(__dirname, '../../chat/core/.secret.json'),
    path.join(__dirname, '../../llm/.secret.json'),
    path.join(__dirname, '.secret.json')
  ]
  for (const secretPath of secretPaths) {
    try {
      if (!fs.existsSync(secretPath)) continue
      const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'))
      const key = secret.apiKey || secret.deepseek_api_key || secret.DEEPSEEK_API_KEY
      if (key) return String(key)
    } catch (error) {
      // ignore
    }
  }
  return process.env.DEEPSEEK_API_KEY || ''
}

function listBossGroups() {
  const seen = new Set()
  const groups = []
  for (const boss of BOSSES) {
    if (seen.has(boss.groupKey)) continue
    seen.add(boss.groupKey)
    groups.push({
      bossGroup: boss.groupKey,
      bossName: boss.displayName
    })
  }
  return groups
}

function mapRecordRow(record) {
  return {
    characterId: record.characterId,
    characterName: record.characterName,
    characterClass: record.characterClass || '未知',
    dungeonName: record.dungeonName,
    recordTime: record.recordTime,
    teamSize: record.teamSize,
    bossName: record.bossName,
    bossKey: record.bossKey,
    bossGroup: record.bossGroup,
    duration: record.duration,
    dps: record.dps,
    bossHp: record.bossHp,
    totalDamage: record.totalDamage,
    damagePercent: record.damagePercent,
    runId: record.runId
  }
}

function sanitizeSkillName(name) {
  // 旋律操纵师等职业技能名末尾常带客户端标记「AI」，易被 LLM 误解
  return String(name || '').replace(/(?:\s|　)*AI$/i, '').trim()
}

function compactSkills(skills) {
  return (skills || []).map(skill => ({
    name: sanitizeSkillName(skill.name),
    percent: Number((Number(skill.percent) || 0).toFixed(2)),
    count: Number(skill.count) || 0,
    damage: Number(skill.damage) || 0
  })).filter(skill => skill.name)
}

function compactRow(row, rank) {
  return {
    rank,
    characterId: row.characterId || '',
    characterName: row.characterName || '',
    characterClass: row.characterClass || '未知',
    dps: Number(row.dps) || 0,
    duration: Number(row.duration) || 0,
    totalDamage: Number(row.totalDamage) || 0,
    damagePercent: Number(row.damagePercent) || 0,
    teamSize: Number(row.teamSize) || 0,
    recordTime: row.recordTime || null,
    runId: row.runId || '',
    skills: compactSkills(row.skills)
  }
}

async function collectSnapshotData() {
  const bossGroups = listBossGroups()
  const runCache = new Map()
  const bosses = []

  for (const boss of bossGroups) {
    const records = await listRecordsByBoss(boss.bossGroup, TOP_ALL, { bestPerCharacter: true })
    let section = {
      title: boss.bossName,
      bossGroup: boss.bossGroup,
      rows: records.map(mapRecordRow)
    }
    ;[section] = await attachSkillBreakdowns([section], { maxSkills: AI_MAX_SKILLS, runCache })
    bosses.push({
      bossGroup: boss.bossGroup,
      bossName: boss.bossName,
      top20: section.rows.map((row, index) => compactRow(row, index + 1))
    })
  }

  const byClass = {}
  for (const cls of CLASSES) {
    const classBosses = []
    for (const boss of bossGroups) {
      const records = await listRecordsByBoss(boss.bossGroup, TOP_CLASS, {
        bestPerCharacter: true,
        characterClass: cls.name
      })
      let section = {
        title: boss.bossName,
        bossGroup: boss.bossGroup,
        rows: records.map(mapRecordRow)
      }
      ;[section] = await attachSkillBreakdowns([section], { maxSkills: AI_MAX_SKILLS, runCache })
      classBosses.push({
        bossGroup: boss.bossGroup,
        bossName: boss.bossName,
        top10: section.rows.map((row, index) => compactRow(row, index + 1))
      })
    }
    byClass[cls.name] = { bosses: classBosses }
  }

  return {
    collectedAt: new Date().toISOString(),
    bosses,
    byClass
  }
}

function playerKey(row) {
  const id = String(row.characterId || '').trim()
  if (id) {
    return crypto.createHash('sha1').update(id).digest('hex').slice(0, 10)
  }
  const name = String(row.characterName || '').trim()
  if (name) {
    return crypto.createHash('sha1').update(`name:${name}`).digest('hex').slice(0, 10)
  }
  return `rank${row.rank || 0}`
}

function anonymizeRow(row) {
  return {
    rank: row.rank,
    playerKey: playerKey(row),
    characterClass: row.characterClass || '未知',
    dps: row.dps,
    duration: row.duration,
    totalDamage: row.totalDamage,
    damagePercent: row.damagePercent,
    teamSize: row.teamSize,
    skills: compactSkills(row.skills)
  }
}

function anonymizeSnapshot(snapshot) {
  if (!snapshot) return null
  const data = snapshot.data || snapshot
  return {
    collectedAt: data.collectedAt || snapshot.createdAt || null,
    bosses: (data.bosses || []).map(boss => ({
      bossGroup: boss.bossGroup,
      bossName: boss.bossName,
      top20: (boss.top20 || []).map(anonymizeRow)
    })),
    byClass: Object.fromEntries(
      Object.entries(data.byClass || {}).map(([className, info]) => [
        className,
        {
          bosses: (info.bosses || []).map(boss => ({
            bossGroup: boss.bossGroup,
            bossName: boss.bossName,
            top10: (boss.top10 || []).map(anonymizeRow)
          }))
        }
      ])
    )
  }
}

function buildSystemPrompt() {
  const classNames = CLASSES.map(cls => cls.name).join('、')
  return `你是洛奇（Mabinogi）高阶副本 DPS 数据分析师。根据排行榜快照撰写详尽中文分析报告。

硬性规则：
1. 报告中绝对不能出现任何角色名、玩家名、uploader、真实 ID；可用「榜首」「第N名」「同 playerKey」指代。
2. playerKey 仅用于跨快照对比同一人是否提升，正文不要强调该密钥本身。
3. 必须覆盖全部 10 个职业：${classNames}。
4. 每个职业都要写：优点、缺点、技能构成特点（占比/次数）、在各 Boss 上的表现差异。
5. 最后必须有宏观趋势：职业强弱格局、技能流派倾向、相较上一期（如有）的变化。
6. 只依据给定数据，不要编造不存在的技能或数值；数据不足时明确说明。
7. 分析尽量详细、可执行，面向玩家与版本观察者。
8. 技能名末尾的「AI」是游戏客户端标记（尤其旋律操纵师常见），与人工智能无关；数据中已去除该后缀。正文引用技能时也不要再带「AI」，更不要把「AI」理解成人工智能或自动战斗。

请严格返回 JSON（不要 Markdown 代码块）：
{
  "title": "报告标题",
  "overview": "整体概述（200-400字）",
  "bossNotes": ["各 Boss 观察要点，3-6条"],
  "classes": [
    {
      "name": "职业名",
      "summary": "一句话定位",
      "pros": ["优点"],
      "cons": ["缺点"],
      "skills": "技能数据分析（占比、次数、流派）",
      "bossPerformance": "各 Boss 表现",
      "trend": "相较上一期变化（无历史则写当前观察）"
    }
  ],
  "macroTrend": "宏观职业趋势与建议（300-500字）"
}`
}

function buildUserPrompt(currentAnon, previousAnon) {
  const payload = {
    current: currentAnon,
    previous: previousAnon,
    note: previousAnon
      ? '已提供上一期快照。请对比同 playerKey 的 DPS/技能变化，归纳提升与退步趋势，但不要写出可识别身份信息。'
      : '这是首次分析，没有上一期快照。'
  }
  return `以下是匿名化后的 DPS 排行快照 JSON。current.bosses[].top20 为各 Boss 前20；current.byClass 为各职业在每 Boss 的前10，均含 skills(name/percent/count/damage)。skills.name 已去除末尾客户端标记「AI」。\n\n${JSON.stringify(payload)}`
}

function normalizeReport(parsed, { generatedAt, hasPrevious }) {
  const classes = Array.isArray(parsed?.classes) ? parsed.classes : []
  const byName = new Map()
  for (const item of classes) {
    const name = String(item?.name || '').trim()
    if (!name) continue
    byName.set(name, {
      name,
      summary: String(item.summary || '').trim(),
      pros: Array.isArray(item.pros) ? item.pros.map(v => String(v || '').trim()).filter(Boolean) : [],
      cons: Array.isArray(item.cons) ? item.cons.map(v => String(v || '').trim()).filter(Boolean) : [],
      skills: String(item.skills || '').trim(),
      bossPerformance: String(item.bossPerformance || '').trim(),
      trend: String(item.trend || '').trim()
    })
  }

  const orderedClasses = CLASSES.map(cls => {
    return byName.get(cls.name) || {
      name: cls.name,
      summary: '本期数据不足，暂无法形成稳定结论。',
      pros: [],
      cons: ['样本不足'],
      skills: '暂无足够技能样本。',
      bossPerformance: '暂无。',
      trend: hasPrevious ? '相较上一期变化不明显或样本不足。' : '首次分析，无历史对比。'
    }
  })

  return {
    title: String(parsed?.title || 'mblogs AI 分析报告').trim(),
    overview: String(parsed?.overview || '').trim(),
    bossNotes: Array.isArray(parsed?.bossNotes)
      ? parsed.bossNotes.map(v => String(v || '').trim()).filter(Boolean)
      : [],
    classes: orderedClasses,
    macroTrend: String(parsed?.macroTrend || '').trim(),
    generatedAt,
    hasPrevious: Boolean(hasPrevious)
  }
}

function extractJson(text) {
  let jsonStr = String(text || '').trim()
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1].trim()

  const tryParse = (s) => {
    try {
      return JSON.parse(s)
    } catch (error) {
      return null
    }
  }

  let parsed = tryParse(jsonStr)
  if (parsed) return parsed

  const objStart = jsonStr.indexOf('{')
  const objEnd = jsonStr.lastIndexOf('}')
  if (objStart >= 0 && objEnd > objStart) {
    parsed = tryParse(jsonStr.slice(objStart, objEnd + 1))
    if (parsed) return parsed
  }
  throw new Error('AI 返回 JSON 解析失败')
}

async function callDeepSeek(systemPrompt, userPrompt, maxTokens = 8192) {
  const apiKey = loadDeepSeekApiKey()
  if (!apiKey) {
    throw new Error('未配置 DeepSeek API Key（ai/chat/core/.secret.json 或 ai/llm/.secret.json）')
  }

  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: maxTokens
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 180000
    }
  )

  const data = response.data
  if (data.error) {
    throw new Error(data.error.message || 'DeepSeek API 错误')
  }
  const text = data?.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('DeepSeek 返回格式异常')
  }
  return {
    text: String(text).trim(),
    usage: data.usage || {}
  }
}

function collectCharacterNames(snapshot) {
  const names = new Set()
  const data = snapshot?.data || snapshot || {}
  for (const boss of data.bosses || []) {
    for (const row of boss.top20 || []) {
      const name = String(row.characterName || '').trim()
      if (name) names.add(name)
    }
  }
  for (const info of Object.values(data.byClass || {})) {
    for (const boss of info.bosses || []) {
      for (const row of boss.top10 || []) {
        const name = String(row.characterName || '').trim()
        if (name) names.add(name)
      }
    }
  }
  return [...names].sort((a, b) => b.length - a.length)
}

function redactNamesInText(text, names) {
  let result = String(text || '')
  for (const name of names) {
    if (!name || name.length < 2) continue
    result = result.split(name).join('某玩家')
  }
  return result
}

function scrubReportNames(report, snapshots) {
  const names = new Set()
  for (const snapshot of snapshots || []) {
    for (const name of collectCharacterNames(snapshot)) names.add(name)
  }
  const nameList = [...names].sort((a, b) => b.length - a.length)
  if (!nameList.length) return report

  const scrub = value => redactNamesInText(value, nameList)
  return {
    ...report,
    title: scrub(report.title),
    overview: scrub(report.overview),
    bossNotes: (report.bossNotes || []).map(scrub),
    macroTrend: scrub(report.macroTrend),
    classes: (report.classes || []).map(item => ({
      ...item,
      summary: scrub(item.summary),
      pros: (item.pros || []).map(scrub),
      cons: (item.cons || []).map(scrub),
      skills: scrub(item.skills),
      bossPerformance: scrub(item.bossPerformance),
      trend: scrub(item.trend)
    }))
  }
}

function collectSkillLexicon(snapshot) {
  const skills = new Set()
  for (const cls of CLASSES) {
    for (const skill of cls.skills || []) {
      const name = sanitizeSkillName(skill)
      if (name) skills.add(name)
    }
  }
  const data = snapshot?.data || snapshot || {}
  const absorbRow = (row) => {
    for (const skill of row.skills || []) {
      const name = sanitizeSkillName(skill.name)
      if (name && name !== '其他') skills.add(name)
    }
  }
  for (const boss of data.bosses || []) {
    for (const row of boss.top20 || []) absorbRow(row)
  }
  for (const info of Object.values(data.byClass || {})) {
    for (const boss of info.bosses || []) {
      for (const row of boss.top10 || []) absorbRow(row)
    }
  }
  return [...skills]
}

function normalizeUsage(usage) {
  return {
    prompt_tokens: Number(usage?.prompt_tokens) || 0,
    completion_tokens: Number(usage?.completion_tokens) || 0,
    total_tokens: Number(usage?.total_tokens) || 0
  }
}

async function generateAiReport(currentSnapshot, previousSnapshot) {
  const currentAnon = anonymizeSnapshot(currentSnapshot)
  const previousAnon = previousSnapshot ? anonymizeSnapshot(previousSnapshot) : null
  const { text, usage } = await callDeepSeek(
    buildSystemPrompt(),
    buildUserPrompt(currentAnon, previousAnon),
    8192
  )
  const parsed = extractJson(text)
  let report = normalizeReport(parsed, {
    generatedAt: new Date().toISOString(),
    hasPrevious: Boolean(previousAnon)
  })
  report = scrubReportNames(report, [currentSnapshot, previousSnapshot])
  report.usage = normalizeUsage(usage)
  report.lexicon = {
    skills: collectSkillLexicon(currentSnapshot)
  }
  return { report, usage: report.usage, rawText: text }
}

function newSnapshotId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return crypto.randomBytes(16).toString('hex')
}

async function runAiAnalysis({ force = false, outputPath } = {}) {
  if (running) {
    return { status: 'busy', message: 'AI 分析正在进行中，请稍后再试' }
  }

  const dateKey = getShanghaiDateKey()
  if (!force) {
    const cached = await getDailyAiReport(dateKey)
    if (cached?.report) {
      const report = {
        ...cached.report,
        usage: cached.report.usage || normalizeUsage(cached.usage)
      }
      await renderAiAnalysisReport(report, outputPath)
      return {
        status: 'cached',
        dateKey,
        report,
        message: `已返回今日缓存的 AI 分析（${dateKey}）。如需刷新请使用：mblogs 重新生成AI分析`
      }
    }
  }

  running = true
  try {
    const previous = await getLatestAiSnapshot()
    const data = await collectSnapshotData()
    const snapshot = {
      _id: newSnapshotId(),
      dateKey,
      createdAt: new Date(),
      data
    }
    await insertAiSnapshot(snapshot)

    const { report, usage } = await generateAiReport(snapshot, previous)
    await upsertDailyAiReport({
      dateKey,
      snapshotId: snapshot._id,
      previousSnapshotId: previous?._id || null,
      report,
      usage,
      forced: Boolean(force)
    })

    await renderAiAnalysisReport(report, outputPath)
    return {
      status: 'generated',
      dateKey,
      report,
      usage,
      message: previous
        ? `已生成 AI 分析（已对比上一期快照）`
        : `已生成 AI 分析（首次，无历史对比）`
    }
  } finally {
    running = false
  }
}

function resolveAiAnalysisCommand(content) {
  const text = String(content || '').trim().replace(/\s+/g, '')
  if (!text) return null
  const lower = text.toLowerCase()

  if (
    lower === '重新生成ai分析' ||
    lower === 'ai分析重新生成' ||
    lower === '强制ai分析' ||
    lower === 'regenerateaianalysis'
  ) {
    return { force: true }
  }

  if (
    lower === 'ai分析' ||
    lower === 'aianalysis' ||
    text === 'AI分析'
  ) {
    return { force: false }
  }

  return null
}

module.exports = {
  TOP_ALL,
  TOP_CLASS,
  resolveAiAnalysisCommand,
  runAiAnalysis,
  collectSnapshotData,
  anonymizeSnapshot,
  listBossGroups
}
