const {
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  MAX_TOPICS,
  MAX_USER_TITLES,
  MAX_GOLDEN_QUOTES
} = require('./config')

function emptyUsage() {
  return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
}

function addUsage(a, b) {
  return {
    prompt_tokens: (a.prompt_tokens || 0) + (b.prompt_tokens || 0),
    completion_tokens: (a.completion_tokens || 0) + (b.completion_tokens || 0),
    total_tokens: (a.total_tokens || 0) + (b.total_tokens || 0)
  }
}

function extractJson(text) {
  let jsonStr = (text || '').trim()
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1].trim()
  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')
  if (start >= 0 && end > start) jsonStr = jsonStr.slice(start, end + 1)
  return JSON.parse(jsonStr)
}

async function callDeepSeek(systemPrompt, userPrompt, maxTokens = 3000) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('未配置 DeepSeek API Key（ai/chat/core/.secret.json 或 ai/llm/.secret.json）')
  }

  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + DEEPSEEK_API_KEY
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error('DeepSeek 请求失败: ' + response.status + ' - ' + errText)
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || 'DeepSeek API 错误')
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('DeepSeek 返回格式异常')
  }

  const usage = data.usage || {}
  return {
    text: data.choices[0].message.content.trim(),
    usage: {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0
    }
  }
}

async function analyzeTopics(messagesText, userMap) {
  const systemPrompt = `你是群聊话题分析助手。根据聊天记录提取最多 ${MAX_TOPICS} 个热门话题。
返回 JSON：
{
  "topics": [
    {
      "topic": "话题标题（10字内）",
      "contributors": ["用户QQ号"],
      "detail": "100-200字总结"
    }
  ]
}
contributors 填用户 QQ 号（方括号里的数字），不要填昵称。
detail 正文里请用昵称提及群友，不要只写裸 QQ 号。无有价值话题则 topics 为空数组。`

  const nickRef = buildNicknameReference(userMap)
  const userPrompt = '群聊记录（格式 [时:分] [QQ号]: 内容）：\n\n' + messagesText
    + (nickRef ? '\n\nQQ号与昵称对照：\n' + nickRef : '')

  const { text, usage } = await callDeepSeek(systemPrompt, userPrompt, 3500)
  const parsed = extractJson(text)
  const topics = (parsed.topics || []).slice(0, MAX_TOPICS).map(t => ({
    topic: (t.topic || '').trim(),
    detail: resolveNicknamesInText((t.detail || '').trim(), userMap),
    contributors: resolveContributors(t.contributors, userMap)
  })).filter(t => t.topic && t.detail)
  return { topics, usage }
}

async function analyzeUserTitles(messagesText, topUsers, userMap) {
  const activeList = topUsers.slice(0, 12).map(u =>
    '- ' + u.name + ' (QQ:' + u.uid + ', 发言' + u.messageCount + '条)'
  ).join('\n')

  const systemPrompt = `你是群聊用户画像助手。为活跃群友分配趣味称号，最多 ${MAX_USER_TITLES} 人。
返回 JSON：
{
  "titles": [
    {
      "user_id": "QQ号",
      "title": "称号（8字内）",
      "mbti": "可选MBTI四字母",
      "reason": "30-60字理由"
    }
  ]
}
user_id 必须是 QQ 号字符串。`

  const userPrompt = '活跃成员：\n' + activeList + '\n\n聊天记录节选：\n' + messagesText.slice(0, 8000)
  const { text, usage } = await callDeepSeek(systemPrompt, userPrompt, 3500)
  const parsed = extractJson(text)
  const titles = (parsed.titles || []).slice(0, MAX_USER_TITLES).map(t => {
    const uid = String(t.user_id || '').trim()
    return {
      uid,
      name: lookupNickname(uid, userMap) || '群友',
      title: (t.title || '神秘人').trim(),
      mbti: (t.mbti || '').trim(),
      reason: (t.reason || '').trim()
    }
  }).filter(t => t.uid && t.title)
  return { titles, usage }
}

async function analyzeGoldenQuotes(messagesText, userMap) {
  const systemPrompt = `你是群聊金句提取助手。选出最多 ${MAX_GOLDEN_QUOTES} 条有趣、有梗或印象深刻的发言。
返回 JSON：
{
  "quotes": [
    {
      "user_id": "发言者QQ号",
      "content": "原话（可适当精简，保留原味）",
      "reason": "20-40字点评"
    }
  ]
}
user_id 填 QQ 号。不要选纯图片/纯表情/无意义灌水。`

  const userPrompt = '群聊记录：\n\n' + messagesText
  const { text, usage } = await callDeepSeek(systemPrompt, userPrompt, 3000)
  const parsed = extractJson(text)
  const quotes = (parsed.quotes || []).slice(0, MAX_GOLDEN_QUOTES).map(q => {
    const uid = String(q.user_id || q.sender || '').trim()
    return {
      uid,
      sender: lookupNickname(uid, userMap) || uid || '群友',
      content: (q.content || '').trim(),
      reason: (q.reason || '').trim()
    }
  }).filter(q => q.content && q.reason)
  return { quotes, usage }
}

async function analyzeChatQuality(messagesText, userMap) {
  const nickRef = buildNicknameReference(userMap)
  const systemPrompt = `请分析以下群聊记录，输出一份「聊天质量锐评」JSON。
要求：
1. 划分 3-6 个抽象维度（name 2-6字，不要出现具体人名/项目名）
2. 每个维度 percentage 为占比，总和不超过 100
3. comment 可具体、幽默、毒舌
4. summary 为一句全天总结金句
5. title / subtitle 为报告主题

返回纯 JSON：
{
  "title": "今日群聊主题",
  "subtitle": "副标题",
  "dimensions": [
    { "name": "维度名", "percentage": 30, "comment": "点评" }
  ],
  "summary": "总结金句"
}`

  const userPrompt = '群聊记录：\n\n' + messagesText.slice(0, 10000)
    + (nickRef ? '\n\n昵称对照：\n' + nickRef : '')

  const { text, usage } = await callDeepSeek(systemPrompt, userPrompt, 3500)
  const data = extractJson(text)
  const colors = ['#607d8b', '#2196f3', '#f44336', '#e91e63', '#ff9800', '#4caf50', '#009688', '#9c27b0']
  let totalPct = 0
  const dimensions = (data.dimensions || []).slice(0, 8).map((d, i) => {
    const pct = Math.max(0, Math.min(100, Number(d.percentage) || 0))
    totalPct += pct
    return {
      name: (d.name || '未知').trim(),
      percentage: pct,
      comment: resolveNicknamesInText((d.comment || '').trim(), userMap),
      color: colors[i % colors.length]
    }
  })
  const factor = totalPct > 100 ? 100 / totalPct : 1
  dimensions.forEach(d => { d.percentage = Math.round(d.percentage * factor * 10) / 10 })

  const review = {
    title: (data.title || '聊天质量锐评').trim(),
    subtitle: (data.subtitle || '今天的群里发生了什么？').trim(),
    dimensions,
    summary: resolveNicknamesInText((data.summary || '').trim(), userMap)
  }
  return { review, usage }
}

function buildNicknameReference(userMap) {
  const seen = new Set()
  const lines = []
  for (const key of Object.keys(userMap)) {
    if (!/^\d{5,12}$/.test(String(key)) || seen.has(key)) continue
    seen.add(key)
    lines.push(key + ' = ' + userMap[key])
  }
  return lines.slice(0, 40).join('\n')
}

function normalizeUid(id) {
  const s = String(id || '').trim().replace(/^用户/, '')
  const m = s.match(/\d{5,12}/)
  return m ? m[0] : s
}

function lookupNickname(uid, userMap) {
  const key = normalizeUid(uid)
  if (!key) return null
  return userMap[key] || userMap[parseInt(key, 10)] || null
}

function resolveNicknamesInText(text, userMap) {
  if (!text || !userMap) return text || ''
  let result = text
  const uids = Object.keys(userMap)
    .filter(k => /^\d{5,12}$/.test(String(k)))
    .sort((a, b) => b.length - a.length)

  for (const uid of uids) {
    const name = userMap[uid]
    if (!name) continue
    result = result.split('用户' + uid).join(name)
    result = result.split('用户 ' + uid).join(name)
    result = result.split('[' + uid + ']').join(name)
    result = result.replace(new RegExp('(^|[^0-9])' + uid + '([^0-9]|$)', 'g'), '$1' + name + '$2')
  }
  return result
}

function resolveContributors(ids, userMap) {
  if (!Array.isArray(ids)) return []
  return ids.map(id => {
    const name = lookupNickname(id, userMap)
    if (name) return name
    const uid = normalizeUid(id)
    return uid || String(id).trim()
  }).filter(Boolean).slice(0, 5)
}

async function analyzeAll(messagesText, topUsers, userMap) {
  let tokenUsage = emptyUsage()
  let topics = []
  let titles = []
  let quotes = []
  let qualityReview = null

  const run = async (fn) => {
    try {
      const result = await fn()
      tokenUsage = addUsage(tokenUsage, result.usage || emptyUsage())
      return result
    } catch (e) {
      console.warn('[群分析 LLM]', e.message)
      return null
    }
  }

  const [topicR, titleR, quoteR, qualityR] = await Promise.all([
    run(() => analyzeTopics(messagesText, userMap)),
    run(() => analyzeUserTitles(messagesText, topUsers, userMap)),
    run(() => analyzeGoldenQuotes(messagesText, userMap)),
    run(() => analyzeChatQuality(messagesText, userMap))
  ])

  if (topicR) topics = topicR.topics
  if (titleR) titles = titleR.titles
  if (quoteR) quotes = quoteR.quotes
  if (qualityR) qualityReview = qualityR.review

  return { topics, titles, quotes, qualityReview, tokenUsage }
}

module.exports = {
  analyzeAll,
  analyzeTopics,
  analyzeUserTitles,
  analyzeGoldenQuotes,
  analyzeChatQuality
}
