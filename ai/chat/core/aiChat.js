/**
 * AI 对话模块 - 使用 DeepSeek API
 * 为特定群组提供智能对话功能
 */

const fs = require('fs')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../baibaiConfigs')

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
  947863432, // 羊毛群
  713377277, // P村
])

// 机器人 QQ 号列表
const BOT_IDS = new Set([
  2854196310, 981069482, 3291864216, 1840239061, 2771362647, 
  384901015, 10000, 2730629054, 1561267174, 2136421688, 
  2363759162, 2854207387, 1315153795, 3889652245, 2186702980, 
  2704057269, 3652811667, 3815102062, 3611589471
])

// AI 人设设定
const AI_PERSONA = `你是一个名叫"百百"的QQ群聊机器人，你的性格活泼可爱，喜欢用表情符号，说话简短有趣。
你在群里就像一个普通的群友一样聊天，不要表现得像个机器人。
你的回复要自然、简洁，像真人在聊天一样，不要太正式或太长。
如果话题是你不了解的，可以诚实地说不太懂。
不要重复别人说的话，要有自己的想法和观点。
偶尔可以用一些可爱的语气词，比如"捏"、"呢"、"啦"等。`

// 群消息缓存，用于追踪未回复消息数量
const groupMessageCache = new Map()

// 初始化群消息缓存
function initGroupCache(groupId) {
  if (!groupMessageCache.has(groupId)) {
    groupMessageCache.set(groupId, {
      messageCount: 0,  // 未回复消息计数
      lastReplyTime: Date.now()
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
    
    const messages = await collection.find({ gid: groupId })
      .project({ _id: 1, uid: 1, d: 1, ts: 1, name: 1 })
      .sort({ _id: -1 })
      .limit(limit)
      .toArray()
    
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
    model: 'deepseek-chat',
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
    const userName = userMap[uid] || msg.name || `用户${uid}`
    const content = msg.d || ''
    
    // 跳过空消息
    if (!content.trim()) continue
    
    // 判断是机器人还是用户
    if (BOT_IDS.has(uid)) {
      formattedMessages.push({
        role: 'assistant',
        content: content
      })
    } else {
      formattedMessages.push({
        role: 'user',
        content: `${userName}: ${content}`
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
    const recentMessages = await fetchRecentMessages(groupId, 20)
    
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
    
    // 添加生成指令
    formattedMessages.push({
      role: 'user',
      content: `[系统指令] 请根据以上群聊内容，以"百百"的身份参与讨论，生成一条自然的回复。
回复要符合当前话题，表现得像一个真正的群友在参与聊天。
如果话题不适合插话，可以返回"[不回复]"。
回复要简短有趣，不要太正式。`
    })
    
    const reply = await callDeepSeekAPI(AI_PERSONA, formattedMessages)
    
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
  
  // 增加消息计数
  incrementMessageCount(groupId)
  
  // 检查是否应该主动回复
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
  AI_ENABLED_GROUPS
}

