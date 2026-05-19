const {
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  MAX_TOPICS,
  MAX_USER_TITLES,
  MAX_GOLDEN_QUOTES
} = require('./config')

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
  return data.choices[0].message.content.trim()
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
contributors 填用户 QQ 号（方括号里的数字），不要填昵称。无有价值话题则 topics 为空数组。`

  const userPrompt = '群聊记录（格式 [时:分] [QQ号]: 内容）：\n\n' + messagesText
  const raw = await callDeepSeek(systemPrompt, userPrompt, 3500)
  const parsed = extractJson(raw)
  const topics = (parsed.topics || []).slice(0, MAX_TOPICS).map(t => ({
    topic: (t.topic || '').trim(),
    detail: (t.detail || '').trim(),
    contributors: resolveContributors(t.contributors, userMap)
  })).filter(t => t.topic && t.detail)
  return topics
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
  const raw = await callDeepSeek(systemPrompt, userPrompt, 3500)
  const parsed = extractJson(raw)
  return (parsed.titles || []).slice(0, MAX_USER_TITLES).map(t => {
    const uid = String(t.user_id || '').trim()
    return {
      uid,
      name: userMap[uid] || userMap[parseInt(uid, 10)] || '群友',
      title: (t.title || '神秘人').trim(),
      mbti: (t.mbti || '').trim(),
      reason: (t.reason || '').trim()
    }
  }).filter(t => t.uid && t.title)
}

async function analyzeGoldenQuotes(messagesText, userMap) {
  const systemPrompt = `你是群聊金句（圣经）提取助手。选出最多 ${MAX_GOLDEN_QUOTES} 条有趣、有梗或印象深刻的发言。
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
  const raw = await callDeepSeek(systemPrompt, userPrompt, 3000)
  const parsed = extractJson(raw)
  return (parsed.quotes || []).slice(0, MAX_GOLDEN_QUOTES).map(q => {
    const uid = String(q.user_id || q.sender || '').trim()
    return {
      uid,
      sender: userMap[uid] || userMap[parseInt(uid, 10)] || uid || '群友',
      content: (q.content || '').trim(),
      reason: (q.reason || '').trim()
    }
  }).filter(q => q.content && q.reason)
}

function resolveContributors(ids, userMap) {
  if (!Array.isArray(ids)) return []
  return ids.map(id => {
    const uid = String(id).trim()
    return userMap[uid] || userMap[parseInt(uid, 10)] || uid
  }).filter(Boolean).slice(0, 5)
}

async function analyzeAll(messagesText, topUsers, userMap) {
  const [topics, titles, quotes] = await Promise.all([
    analyzeTopics(messagesText, userMap).catch(e => {
      console.warn('话题分析失败:', e.message)
      return []
    }),
    analyzeUserTitles(messagesText, topUsers, userMap).catch(e => {
      console.warn('用户称号分析失败:', e.message)
      return []
    }),
    analyzeGoldenQuotes(messagesText, userMap).catch(e => {
      console.warn('金句分析失败:', e.message)
      return []
    })
  ])
  return { topics, titles, quotes }
}

module.exports = {
  analyzeAll,
  analyzeTopics,
  analyzeUserTitles,
  analyzeGoldenQuotes
}
