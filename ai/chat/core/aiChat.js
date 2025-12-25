/**
 * AI 对话模块 - 使用 DeepSeek API
 * 为特定群组提供智能对话功能
 */

const fs = require('fs')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../baibaiConfigs')

// 引入知识库模块
const knowledge = require('./knowledge')
const knowledgeCommands = require('./knowledge/commands')

// 加载 API Key
const secretPath = path.join(__dirname, '.secret.json')
let DEEPSEEK_API_KEY = ''
try {
  const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'))
  DEEPSEEK_API_KEY = secret.apiKey
} catch (error) {
  console.error('加载 DeepSeek API Key 失败:', error.message)
}

// 启用 AI 对话的群白名单
const AI_ENABLED_GROUPS = new Set([
  941710813, // 伊鲁夏新手群
  // 947863432, // 羊毛群
  // 713377277, // P村
  950540339, // 测试群
])

// 机器人 QQ 号列表
const BOT_IDS = new Set([
  2854196310, 981069482, 3291864216, 1840239061, 2771362647, 
  384901015, 10000, 2730629054, 1561267174, 2136421688, 
  2363759162, 2854207387, 1315153795, 3889652245, 2186702980, 
  2704057269, 3652811667, 3815102062, 3611589471
])

// AI 人设设定
const AI_PERSONA = `你是一个名叫"百百"的QQ群聊机器人。

【性格特点】
- 本质上性格活泼，但会根据群聊氛围调整说话风格
- 说话简短有趣，像真人群友一样自然聊天
- 有自己的想法和观点，不会简单重复别人的话

【知识背景】
- 网络冲浪高手，熟悉各种网络热词、梗和互联网黑话
- 对《洛奇mabinogi》这款游戏特别了解，包括游戏机制、玩法、角色、任务等
- 了解二次元文化、游戏圈常见话题

【风格适配规则】（重要！根据聊天记录判断）
- 如果群友们说话风格轻松、常用表情/颜文字/可爱语气词，你也可以卖萌，用"捏"、"呢"、"啦"、"的说"等
- 如果群友们说话风格严肃、直接、不用表情符号，你也要正经说话，不要卖萌，不要用颜文字和可爱语气词
- 如果群里在讨论正经话题（技术、攻略、问题求助等），保持专业简洁
- 如果群里在闲聊吹水，可以轻松一些
- 总之：融入群聊氛围，不要格格不入

【回复规则】
- 回复要简洁自然，不要太长或太正式
- 关注最近的消息和话题，不要回复过时的话题
- 不要引用或描述消息中的图片（[CQ:image...]）、语音等媒体内容
- 如果话题不了解，可以诚实地说不太懂
- 如果话题不适合插话或已经过时，选择不回复

【数据可信度】
- 对于知识库中可查询到的相对稳定的内容，我会尽力提供准确信息
- 对于知识库中无法查询到的内容，严禁虚构或猜测不确定的数据来回答问题，并声称是真实数据
- 对于历史记录中其他成员已经明确回复错误的回答，不再继续采用`

// 群消息缓存，用于追踪未回复消息数量
const groupMessageCache = new Map()

// 初始化群消息缓存
function initGroupCache(groupId) {
  if (!groupMessageCache.has(groupId)) {
    groupMessageCache.set(groupId, {
      messageCount: 0,  // 未回复消息计数
      lastReplyTime: Date.now(),
      isPassiveReplying: false  // 是否正在进行被动回复
    })
  }
}

// 增加消息计数
function incrementMessageCount(groupId) {
  initGroupCache(groupId)
  const cache = groupMessageCache.get(groupId)
  cache.messageCount++
}

// 重置消息计数
function resetMessageCount(groupId) {
  initGroupCache(groupId)
  const cache = groupMessageCache.get(groupId)
  cache.messageCount = 0
  cache.lastReplyTime = Date.now()
  // 重置被动回复标志，允许下次检查
  cache.isPassiveReplying = false
}

// 获取消息计数
function getMessageCount(groupId) {
  initGroupCache(groupId)
  return groupMessageCache.get(groupId).messageCount
}

/**
 * 检查群是否启用 AI 对话
 * @param {number} groupId 群ID
 * @returns {boolean}
 */
function isAIEnabled(groupId) {
  return AI_ENABLED_GROUPS.has(groupId)
}

/**
 * 获取群成员列表
 * @param {number} groupId 群ID
 * @param {string} port 端口号
 * @returns {Promise<Object>} 用户ID到昵称的映射
 */
async function fetchGroupUsers(groupId, port) {
  try {
    const { createHttpApiWrapper } = require('../../../reverseWsUtils')
    const apiWrapper = createHttpApiWrapper(port)
    let groupMemberData = await apiWrapper.getGroupMemberList(groupId, true)
    
    if (!groupMemberData || !Array.isArray(groupMemberData) || groupMemberData.length === 0) {
      groupMemberData = await apiWrapper.getGroupMemberList(groupId, false)
    }
    
    const userMap = {}
    if (groupMemberData && Array.isArray(groupMemberData)) {
      groupMemberData.forEach(x => {
        const nid = x.card || x.nickname || `用户${x.user_id}`
        userMap[x.user_id] = nid
      })
    }
    return userMap
  } catch (error) {
    console.warn(`获取群成员列表失败:`, error.message)
    return {}
  }
}

/**
 * 从数据库获取最近的群聊消息
 * @param {number} groupId 群ID
 * @param {number} limit 消息数量限制
 * @returns {Promise<Array>}
 */
async function fetchRecentMessages(groupId, limit = 20) {
  let client
  try {
    client = await MongoClient.connect(mongourl)
    const db = client.db('db_bot')
    const collection = db.collection('cl_chat')
    
    // 同时支持数字和字符串类型的 gid
    // TODO: 这里最好限制一下搜索时间，否则会出现过长时间没发言的群查询导致数据库负载过大
    const numericGid = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId
    const query = {
      $or: [
        { gid: numericGid },
        { gid: String(numericGid) }
      ]
    }
    
    const messages = await collection.find(query)
      .project({ _id: 1, uid: 1, d: 1, ts: 1, name: 1, n: 1 })
      .sort({ _id: -1 })
      .limit(limit)
      .toArray()
    
    console.log(`[AI Chat] 获取到群 ${groupId} 的 ${messages.length} 条最近消息`)
    
    // 反转顺序，让消息按时间顺序排列
    return messages.reverse()
  } catch (error) {
    console.error('获取最近消息失败:', error.message)
    return []
  } finally {
    if (client) {
      await client.close()
    }
  }
}

/**
 * 调用 DeepSeek API
 * @param {string} prompt 系统提示
 * @param {Array} messages 消息历史
 * @returns {Promise<string>}
 */
async function callDeepSeekAPI(prompt, messages) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API Key 未配置')
  }

  const requestBody = {
    model: 'deepseek-reasoner',
    messages: [
      { role: 'system', content: prompt },
      ...messages
    ],
    temperature: 0.8,
    max_tokens: 200
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error.message)
    throw error
  }
}

/**
 * 格式化时间为可读格式
 * @param {Date|number} time 时间对象或时间戳
 * @returns {string}
 */
function formatTime(time) {
  const date = time instanceof Date ? time : new Date(time)
  const now = new Date()
  const diff = now - date
  
  // 1分钟内
  if (diff < 60000) {
    return '刚刚'
  }
  // 1小时内
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  // 今天内
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  // 更早
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * 清理消息内容，移除图片等媒体标记
 * @param {string} content 原始消息内容
 * @returns {string}
 */
function cleanMessageContent(content) {
  if (!content) return ''
  
  // 移除图片标记，替换为 [图片]
  let cleaned = content.replace(/\[CQ:image[^\]]*\]/g, '[图片]')
  // 移除语音标记，替换为 [语音]
  cleaned = cleaned.replace(/\[CQ:record[^\]]*\]/g, '[语音]')
  // 移除视频标记，替换为 [视频]
  cleaned = cleaned.replace(/\[CQ:video[^\]]*\]/g, '[视频]')
  // 处理回复标记
  cleaned = cleaned.replace(/\[CQ:reply[^\]]*\]/g, '[回复]')
  // 处理 @ 标记，保留名字
  cleaned = cleaned.replace(/\[CQ:at,qq=\d+,name=([^\]]+)\]/g, '@$1')
  cleaned = cleaned.replace(/\[CQ:at,qq=(\d+)\]/g, '@$1')
  
  return cleaned.trim()
}

/**
 * 格式化消息为 AI 对话格式
 * @param {Array} messages 消息列表
 * @param {Object} userMap 用户ID到昵称的映射
 * @param {number} botId 机器人QQ号
 * @returns {Array}
 */
function formatMessagesForAI(messages, userMap, botId = 981069482) {
  const formattedMessages = []
  
  for (const msg of messages) {
    const uid = typeof msg.uid === 'string' ? parseInt(msg.uid, 10) : msg.uid
    // 数据库中用户名字段是 n，兼容 name 字段
    const userName = userMap[uid] || msg.n || msg.name || `用户${uid}`
    const rawContent = msg.d || ''
    
    // 跳过空消息
    if (!rawContent.trim()) continue
    
    // 清理消息内容
    const content = cleanMessageContent(rawContent)
    
    // 如果清理后只剩媒体标记，跳过
    if (!content || content === '[图片]' || content === '[语音]' || content === '[视频]') continue
    
    // 获取消息时间
    const msgTime = msg.ts ? formatTime(msg.ts) : (msg._id ? formatTime(msg._id) : '')
    const timeStr = msgTime ? `[${msgTime}]` : ''
    
    // 判断是机器人还是用户
    if (BOT_IDS.has(uid)) {
      formattedMessages.push({
        role: 'assistant',
        content: content
      })
    } else {
      formattedMessages.push({
        role: 'user',
        content: `${timeStr} ${userName}: ${content}`
      })
    }
  }
  
  return formattedMessages
}

/**
 * 优化回复内容 - 将原始回复通过 AI 优化为更自然的表达
 * @param {string} originalReply 原始回复内容
 * @param {number} groupId 群ID
 * @param {string} port 端口号
 * @param {Object} userMap 用户映射（可选）
 * @returns {Promise<string>}
 */
async function enhanceReply(originalReply, groupId, port, userMap = null) {
  try {
    // 获取最近消息
    const recentMessages = await fetchRecentMessages(groupId, 50)
    
    // 获取用户映射
    if (!userMap) {
      userMap = await fetchGroupUsers(groupId, port)
    }
    
    // 格式化消息
    const formattedMessages = formatMessagesForAI(recentMessages, userMap)
    
    // 添加需要优化的回复
    formattedMessages.push({
      role: 'user',
      content: `[系统指令] 你需要将以下机器人回复改写成更自然、更符合群聊氛围的表达。
保留原意和关键信息，但让语气更加自然亲切，像真人说话一样。
如果原回复是图片代码（如[CQ:image,...]）或特殊指令，请直接原样返回，不要修改。
回复内容不要太长，简洁有趣即可。

原始回复：${originalReply}

请直接给出改写后的内容，不要有任何解释或前缀。`
    })
    
    const enhancedReply = await callDeepSeekAPI(AI_PERSONA, formattedMessages)
    
    // 如果原回复包含 CQ 码，检查是否被误修改
    if (originalReply.includes('[CQ:') && !enhancedReply.includes('[CQ:')) {
      // AI 可能误删了 CQ 码，返回原始内容
      return originalReply
    }
    
    return enhancedReply.trim()
  } catch (error) {
    console.error('优化回复失败:', error.message)
    // 失败时返回原始回复
    return originalReply
  }
}

/**
 * 生成主动回复 - 根据当前群聊讨论生成符合人设的回复
 * @param {number} groupId 群ID
 * @param {string} port 端口号
 * @returns {Promise<string|null>}
 */
async function generateProactiveReply(groupId, port) {
  try {
    // 获取最近消息
    const recentMessages = await fetchRecentMessages(groupId, 30)
    
    if (recentMessages.length < 3) {
      return null
    }
    
    // 获取用户映射
    const userMap = await fetchGroupUsers(groupId, port)
    
    // 格式化消息
    const formattedMessages = formatMessagesForAI(recentMessages, userMap)
    
    // 从最近消息中提取关键词，查询相关知识（清理 CQ 码）
    const recentContent = recentMessages.slice(-5)
      .map(m => (m.d || '').replace(/\[CQ:[^\]]+\]/g, ''))
      .join(' ')
      .replace(/[?？!！。，,.;；:：]/g, ' ')
      .trim()
    const relevantKnowledge = await knowledge.getRelevantKnowledgePrompt(recentContent, 2)
    
    // 构建增强的 AI Persona（包含知识库内容）
    const enhancedPersona = AI_PERSONA + relevantKnowledge
    
    // 添加生成指令
    const hasKnowledge = relevantKnowledge.length > 0
    formattedMessages.push({
      role: 'user',
      content: `[系统指令] 请根据以上群聊内容，以"百百"的身份参与讨论，生成一条自然的回复。

【回复规则】
1. 只关注最近几分钟内的消息和话题，忽略时间较早的消息
2. 回复要符合当前正在讨论的话题，不要回复已经过时的话题
3. 不要提及或描述消息中的[图片]、[语音]等媒体内容
4. 回复要简短有趣，像真正的群友在聊天
5. 如果话题不适合插话、已经过时、或者只是闲聊没什么可说的，返回"[不回复]"
${hasKnowledge ? `
【重要】知识库优先规则：
- 如果群友在讨论知识库中涉及的话题，请基于知识库给出准确回答
- 如果群友的说法与知识库不符，可以礼貌地纠正
` : ''}

现在的时间是：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
请直接给出回复内容，不要有任何解释。`
    })
    
    const reply = await callDeepSeekAPI(enhancedPersona, formattedMessages)
    
    // 检查是否选择不回复
    if (reply.includes('[不回复]') || reply.trim() === '') {
      return null
    }
    
    return reply.trim()
  } catch (error) {
    console.error('生成主动回复失败:', error.message)
    return null
  }
}

/**
 * 检查是否应该主动回复
 * @param {number} groupId 群ID
 * @param {number} randomChance 随机回复概率 (0-100)
 * @param {number} maxMessages 最大未回复消息数
 * @returns {boolean}
 */
function shouldProactiveReply(groupId, randomChance = 5, maxMessages = 50) {
  const messageCount = getMessageCount(groupId)
  
  // 如果消息数超过最大值，强制回复
  if (messageCount >= maxMessages) {
    console.log(`[AI Chat] 群 ${groupId} 消息数达到 ${messageCount}，触发强制回复`)
    return true
  }
  
  // 随机概率回复
  const random = Math.random() * 100
  if (random < randomChance) {
    console.log(`[AI Chat] 群 ${groupId} 随机触发回复 (${random.toFixed(2)} < ${randomChance})`)
    return true
  }
  
  return false
}

/**
 * 创建 AI 增强的 callback
 * @param {Function} originalCallback 原始的 callback 函数
 * @param {number} groupId 群ID
 * @param {string} port 端口号
 * @returns {Function}
 */
function createAIEnhancedCallback(originalCallback, groupId, port) {
  return async function(reply, blank) {
    if (!reply) {
      return originalCallback(reply, blank)
    }
    
    try {
      // 尝试优化回复
      const enhancedReply = await enhanceReply(reply, groupId, port)
      
      // 重置消息计数，因为我们回复了
      resetMessageCount(groupId)
      
      originalCallback(enhancedReply, blank)
    } catch (error) {
      console.error('[AI Chat] 优化回复失败，使用原始回复:', error.message)
      originalCallback(reply, blank)
    }
  }
}

/**
 * 处理群消息，检查是否需要主动回复
 * @param {number} groupId 群ID
 * @param {number} userId 用户ID
 * @param {string} port 端口号
 * @param {Function} callback 回调函数
 * @returns {Promise<boolean>} 是否发送了主动回复
 */
async function handleProactiveReply(groupId, userId, port, callback) {
  // 忽略机器人自己的消息
  if (BOT_IDS.has(userId)) {
    return false
  }
  
  initGroupCache(groupId)
  const cache = groupMessageCache.get(groupId)
  
  // 如果正在进行被动回复，跳过主动回复
  if (cache.isPassiveReplying) {
    console.log(`[AI Chat] 群 ${groupId} 正在进行被动回复，跳过主动回复`)
    return false
  }
  
  // 如果距离上次回复时间太短（3秒内），说明刚刚进行了回复（被动或主动），跳过主动回复
  const timeSinceLastReply = Date.now() - cache.lastReplyTime
  if (timeSinceLastReply < 3000) {
    console.log(`[AI Chat] 群 ${groupId} 距离上次回复仅 ${timeSinceLastReply}ms，跳过主动回复（避免重复回复）`)
    return false
  }
  
  // 如果消息计数为0，说明刚刚进行了被动回复，跳过主动回复
  const currentCount = cache.messageCount
  if (currentCount === 0) {
    console.log(`[AI Chat] 群 ${groupId} 消息计数为0，跳过主动回复（可能刚刚进行了被动回复）`)
    return false
  }
  
  // 检查是否应该主动回复（使用当前的计数，计数已经在消息到达时增加过了）
  if (shouldProactiveReply(groupId)) {
    const reply = await generateProactiveReply(groupId, port)
    
    if (reply) {
      // 重置消息计数
      resetMessageCount(groupId)
      
      // 发送回复
      callback(reply)
      return true
    }
  }
  
  return false
}

/**
 * 检查消息是否触发了 AI 对话（以"百百"开头或 @ 了机器人）
 * @param {string} message 消息内容
 * @returns {boolean}
 */
function checkMentionTrigger(message) {
  if (!message) return false
  
  const trimmedMsg = message.trim()
  
  // 检查是否以"百百"开头
  if (trimmedMsg.startsWith('百百')) {
    return true
  }
  
  // 检查是否 @ 了机器人（格式：[CQ:at,qq=xxx,name=xxx] 或 [CQ:at,qq=xxx]）
  for (const botId of BOT_IDS) {
    // 使用正则匹配，忽略可能存在的 name 参数
    const atPattern = new RegExp(`\\[CQ:at,qq=${botId}(,name=[^\\]]*)?\\]`)
    if (atPattern.test(message)) {
      return true
    }
  }
  
  return false
}

/**
 * 生成针对用户提问/对话的回复
 * @param {string} userMessage 用户的消息
 * @param {number} groupId 群ID
 * @param {string} port 端口号
 * @param {string} userName 用户昵称
 * @returns {Promise<string|null>}
 */
async function generateMentionReply(userMessage, groupId, port, userName = '用户') {
  // 被动回复触发时，立即重置消息计数，避免主动回复也被触发
  initGroupCache(groupId)
  const cache = groupMessageCache.get(groupId)
  cache.messageCount = 0
  cache.isPassiveReplying = true  // 标记正在进行被动回复
  cache.lastReplyTime = Date.now()
  
  try {
    // 获取最近消息作为上下文
    const recentMessages = await fetchRecentMessages(groupId, 50)
    
    // 获取用户映射
    const userMap = await fetchGroupUsers(groupId, port)
    
    // 格式化消息
    const formattedMessages = formatMessagesForAI(recentMessages, userMap)
    
    // 清理用户消息（去除所有 CQ 码和"百百"前缀）
    let cleanMessage = userMessage
      .replace(/\[CQ:[^\]]+\]/g, '')  // 去除所有 CQ 码
      .replace(/^百百[,，:：\s]*/i, '')   // 去除"百百"前缀及后面的标点
      .trim()
    
    // 如果清理后消息为空，设置一个默认问候
    if (!cleanMessage) {
      cleanMessage = '在叫我吗？'
    }
    
    // 用于知识库搜索的纯文本（进一步清理标点符号）
    const searchText = cleanMessage
      .replace(/[?？!！。，,.;；:：]/g, ' ')  // 标点转空格
      .trim()
    
    // 查询相关知识库内容
    const relevantKnowledge = await knowledge.getRelevantKnowledgePrompt(searchText, 3)
    
    // 构建增强的 AI Persona（包含知识库内容）
    const enhancedPersona = AI_PERSONA + relevantKnowledge
    
    // 添加用户的问题
    const hasKnowledge = relevantKnowledge.length > 0
    formattedMessages.push({
      role: 'user',
      content: `[系统指令] ${userName} 正在呼叫你，对你说："${cleanMessage}"

【回复规则】
1. 以"百百"的身份直接回复这条消息
2. 回复要自然、简洁、有趣，像真人聊天一样
3. 不要重复用户说的话，直接给出你的回应
4. 不要提及或描述消息中的[图片]、[语音]等媒体内容
${hasKnowledge ? `
【重要】知识库优先规则：
- 上面的"官方知识库"包含经过验证的准确信息
- 当用户的问题涉及知识库中的内容时，你必须基于知识库回答
- 不要被群聊记录中群友的错误说法或猜测干扰
- 知识库的信息优先级高于群聊记录中的任何内容
` : `5. 可以结合上面的聊天记录来理解上下文`}

现在的时间是：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
请直接给出回复内容，不要有任何解释或前缀。`
    })
    
    const reply = await callDeepSeekAPI(enhancedPersona, formattedMessages)
    
    if (!reply || reply.trim() === '') {
      return null
    }
    
    // 消息计数已在函数开始时重置，这里不需要再次重置
    
    return reply.trim()
  } catch (error) {
    console.error('生成对话回复失败:', error.message)
    // 生成失败时，清除被动回复标志，允许后续的主动回复检查
    initGroupCache(groupId)
    const cache = groupMessageCache.get(groupId)
    cache.isPassiveReplying = false
    return null
  }
}

module.exports = {
  isAIEnabled,
  enhanceReply,
  generateProactiveReply,
  createAIEnhancedCallback,
  handleProactiveReply,
  incrementMessageCount,
  resetMessageCount,
  getMessageCount,
  shouldProactiveReply,
  fetchRecentMessages,
  fetchGroupUsers,
  checkMentionTrigger,
  generateMentionReply,
  AI_ENABLED_GROUPS,
  BOT_IDS,
  // 知识库相关
  knowledge,
  knowledgeCommands,
  handleKnowledgeCommand: knowledgeCommands.handleKnowledgeCommand,
  isKnowledgeCommand: knowledgeCommands.isKnowledgeCommand
}

