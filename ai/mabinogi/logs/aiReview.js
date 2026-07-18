const { BOSSES } = require('./bossConfig')
const { CLASSES, resolveClassQuery } = require('./classConfig')
const {
  getShanghaiDateKey,
  insertAiSnapshot,
  getLatestAiSnapshot,
  getDailyAiReview,
  upsertDailyAiReview
} = require('./aiAnalysisDb')
const {
  ANALYSIS_KNOWLEDGE_VERSION,
  ANALYSIS_KNOWLEDGE,
  collectSnapshotData,
  anonymizeSnapshot,
  callDeepSeek,
  extractJson,
  normalizeUsage,
  collectSkillLexicon,
  newSnapshotId
} = require('./aiAnalysis')
const { renderAiReview } = require('./renderAiReview')

const REVIEW_TIERS = ['夯', '顶级', '人上人', 'NPC', '拉完了']

let running = false

function resolveAiReviewCommand(content) {
  const text = String(content || '').trim().replace(/\s+/g, '')
  if (!text) return null
  const lower = text.toLowerCase()

  if (
    lower === '重新生成ai锐评' ||
    lower === 'ai锐评重新生成' ||
    lower === '强制ai锐评' ||
    lower === 'regenerateaireview'
  ) {
    return { force: true }
  }

  if (
    lower === 'ai锐评' ||
    lower === '锐评' ||
    lower === 'aireview'
  ) {
    return { force: false }
  }

  return null
}

function buildReviewSystemPrompt() {
  const classNames = CLASSES.map(cls => cls.name).join('、')
  const bossNames = [...new Set(BOSSES.map(boss => boss.displayName))].join('、')
  const knowledge = JSON.stringify({
    version: ANALYSIS_KNOWLEDGE_VERSION,
    ...ANALYSIS_KNOWLEDGE
  })

  return `你是一名熟悉洛奇（Mabinogi）阿尔卡纳职业、布里列赫机制与战斗日志口径的资深团长。请制作一期主题为「从夯到拉，各阿尔卡纳职业对比」的中文 AI 锐评。

这是一份有梗但严谨的实战榜单锐评：表达可以辛辣、短促、有记忆点，但不能攻击具体玩家，也不能为了节目效果歪曲数据。

硬性规则：
1. 评价范围严格限定为当前布里列赫日志中可观测的实战伤害表现，不得冒充职业理论强度、全体玩家平均水平或完整组队价值。
2. 必须覆盖且只覆盖这 10 个职业，每个职业恰好出现一次：${classNames}。
3. 必须使用并按顺序输出五档：夯、顶级、人上人、NPC、拉完了。允许某档为空；同档内仍按本期数据表现从强到弱排序。
4. 分档主要依据 current.bosses[].top20 中各职业在四个 Boss 的全榜名次、出现数量与稳定性；current.byClass 只能辅助观察职业内部上限、技能构成与 Boss 适配，职业内 rank=1 绝不是全榜第一。
5. 当前排行是每名角色的最佳成绩样本，不是全职业平均值。不得只凭一个榜首或一个极端值定档；样本少时必须直说，锐评可以尖锐但结论要降级。
6. dps 包含 Boss 无敌、跑位和机制时间，不等于木桩输出。跨 Boss 不直接横比 DPS 数值，需结合名次、duration、teamSize、技能构成与机制。
7. skills.count 是命中次数，不是施放次数；通用技能和随机附伤不得误判为职业核心技能。
8. 圣光颂唱者的治疗/增益、圣盾骑士的减伤/承伤/控怪没有被完整记录。只评价其可观测伤害侧，不得因 DPS 较低说职业整体没用。
9. 不得出现角色名、玩家名、uploader、真实 ID 或 playerKey。不得评价具体玩家操作好坏。
10. Boss 只能使用正式名称：${bossNames}，禁止使用一王、二王、三王、四王等简称。
11. evidence 必须给出支撑分档的全榜席位、跨 Boss 覆盖、样本量或关键技能占比事实；数据不够就写「样本不足」，不得编造。
12. verdict 是一句判断，bossFit 说明适配与短板，roast 是一句有梗的锐评。四个字段不要重复同一句话。

版本知识（版本 ${ANALYSIS_KNOWLEDGE_VERSION}，只能使用已有事实）：
${knowledge}

严格返回 JSON，不要 Markdown 代码块：
{
  "title": "从夯到拉，各阿尔卡纳职业对比",
  "scope": "本期评价口径说明，60-100字",
  "tiers": [
    {
      "label": "夯",
      "classes": [
        {
          "name": "职业名",
          "verdict": "一句话判断",
          "evidence": "1-2个最关键的数据事实",
          "bossFit": "Boss适配与短板",
          "roast": "一句不攻击玩家的辛辣锐评"
        }
      ]
    }
  ],
  "overallVerdict": "100-180字总结职业格局、样本边界和组队启示"
}`
}

function buildReviewUserPrompt(snapshot) {
  return `以下是匿名化后的当前 DPS 排行快照。请先统计 current.bosses[].top20 中每个职业在各 Boss 的真实全榜席位与覆盖，再参考 current.byClass 的技能构成，完成「从夯到拉」五档锐评。不要把职业内部 classRank 当成全榜排名。\n\n${JSON.stringify({ current: anonymizeSnapshot(snapshot) })}`
}

function normalizeClassItem(item, name) {
  return {
    name,
    verdict: String(item?.verdict || '本期样本不足，暂缓下定论。').trim(),
    evidence: String(item?.evidence || '样本不足。').trim(),
    bossFit: String(item?.bossFit || '暂无足够数据判断 Boss 适配。').trim(),
    roast: String(item?.roast || '先把观察席坐热，下期再见真章。').trim()
  }
}

function normalizeReview(parsed, { generatedAt } = {}) {
  const tierMap = new Map(REVIEW_TIERS.map(label => [label, []]))
  const seen = new Set()

  for (const tier of Array.isArray(parsed?.tiers) ? parsed.tiers : []) {
    const label = String(tier?.label || '').trim()
    if (!tierMap.has(label)) continue
    for (const item of Array.isArray(tier?.classes) ? tier.classes : []) {
      const rawName = String(item?.name || '').trim()
      const resolvedName = resolveClassQuery(rawName)
      if (!CLASSES.some(cls => cls.name === resolvedName) || seen.has(resolvedName)) continue
      tierMap.get(label).push(normalizeClassItem(item, resolvedName))
      seen.add(resolvedName)
    }
  }

  for (const cls of CLASSES) {
    if (seen.has(cls.name)) continue
    tierMap.get('NPC').push(normalizeClassItem(null, cls.name))
  }

  return {
    title: '从夯到拉，各阿尔卡纳职业对比',
    scope: String(parsed?.scope || '基于当前布里列赫排行榜最佳成绩样本，仅比较日志可观测的实战伤害表现，不代表职业完整组队价值。').trim(),
    tiers: REVIEW_TIERS.map(label => ({ label, classes: tierMap.get(label) })),
    overallVerdict: String(parsed?.overallVerdict || '榜单反映的是当前头部样本，不是全体玩家平均强度；职业定位、队伍配置与未被日志记录的辅助贡献仍需单独考虑。').trim(),
    generatedAt: generatedAt || new Date().toISOString()
  }
}

function collectCharacterNames(snapshot) {
  const names = new Set()
  const data = snapshot?.data || snapshot || {}
  for (const boss of data.bosses || []) {
    for (const row of boss.top20 || []) {
      if (row.characterName) names.add(String(row.characterName))
    }
  }
  for (const info of Object.values(data.byClass || {})) {
    for (const boss of info.bosses || []) {
      for (const row of boss.top10 || []) {
        if (row.characterName) names.add(String(row.characterName))
      }
    }
  }
  return [...names].filter(name => name.length >= 2).sort((a, b) => b.length - a.length)
}

function scrubReviewNames(review, snapshot) {
  const names = collectCharacterNames(snapshot)
  const scrub = value => names.reduce(
    (text, name) => text.split(name).join('某玩家'),
    String(value || '')
  )
  return {
    ...review,
    scope: scrub(review.scope),
    tiers: (review.tiers || []).map(tier => ({
      ...tier,
      classes: (tier.classes || []).map(item => ({
        ...item,
        verdict: scrub(item.verdict),
        evidence: scrub(item.evidence),
        bossFit: scrub(item.bossFit),
        roast: scrub(item.roast)
      }))
    })),
    overallVerdict: scrub(review.overallVerdict)
  }
}

async function generateAiReview(snapshot) {
  const { text, usage } = await callDeepSeek(
    buildReviewSystemPrompt(),
    buildReviewUserPrompt(snapshot),
    6144
  )
  let review = normalizeReview(extractJson(text), { generatedAt: new Date().toISOString() })
  review = scrubReviewNames(review, snapshot)
  review.usage = normalizeUsage(usage)
  review.lexicon = { skills: collectSkillLexicon(snapshot) }
  return { review, usage: review.usage, rawText: text }
}

async function getOrCreateTodaySnapshot(dateKey, force) {
  if (!force) {
    const latest = await getLatestAiSnapshot()
    if (latest?.dateKey === dateKey && latest?.data) return latest
  }

  const snapshot = {
    _id: newSnapshotId(),
    dateKey,
    createdAt: new Date(),
    data: await collectSnapshotData()
  }
  await insertAiSnapshot(snapshot)
  return snapshot
}

async function runAiReview({ force = false, outputPath } = {}) {
  if (running) {
    return { status: 'busy', message: 'AI 锐评正在进行中，请稍后再试' }
  }

  const dateKey = getShanghaiDateKey()
  if (!force) {
    const cached = await getDailyAiReview(dateKey)
    if (cached?.review) {
      const review = normalizeReview({
        ...cached.review,
        usage: cached.review.usage || normalizeUsage(cached.usage),
        lexicon: cached.review.lexicon
      }, { generatedAt: cached.review.generatedAt })
      review.usage = cached.review.usage || normalizeUsage(cached.usage)
      review.lexicon = cached.review.lexicon || { skills: [] }
      await renderAiReview(review, outputPath)
      return {
        status: 'cached',
        dateKey,
        review,
        message: `已返回今日缓存的 AI 锐评（${dateKey}）。如需刷新请使用：mblogs 重新生成ai锐评`
      }
    }
  }

  if (running) {
    return { status: 'busy', message: 'AI 锐评正在进行中，请稍后再试' }
  }
  running = true
  try {
    const snapshot = await getOrCreateTodaySnapshot(dateKey, force)
    const { review, usage } = await generateAiReview(snapshot)
    await upsertDailyAiReview({
      dateKey,
      snapshotId: snapshot._id,
      review,
      usage,
      forced: Boolean(force)
    })
    await renderAiReview(review, outputPath)
    return {
      status: 'generated',
      dateKey,
      review,
      usage,
      message: '已生成「从夯到拉，各阿尔卡纳职业对比」AI 锐评'
    }
  } finally {
    running = false
  }
}

module.exports = {
  REVIEW_TIERS,
  resolveAiReviewCommand,
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  normalizeReview,
  generateAiReview,
  runAiReview
}
