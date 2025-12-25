/**
 * 从群聊记录生成知识库脚本
 * 功能：获取指定群在指定时间段的聊天记录，使用 DeepSeek API 总结生成知识库条目
 */

const readline = require('readline')
const fs = require('fs')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../../baibaiConfigs')

// 机器人 QQ 号列表（用于过滤机器人消息）
const BOT_IDS = new Set([
  2854196310, 981069482, 3291864216, 1840239061, 2771362647, 
  384901015, 10000, 2730629054, 1561267174, 2136421688, 
  2363759162, 2854207387, 1315153795, 3889652245, 2186702980, 
  2704057269, 3652811667, 3815102062, 3611589471
])

// 加载 DeepSeek API Key
const secretPath = path.join(__dirname, '../.secret.json')
let DEEPSEEK_API_KEY = ''
try {
  const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'))
  DEEPSEEK_API_KEY = secret.apiKey
} catch (error) {
  console.error('❌ 加载 DeepSeek API Key 失败:', error.message)
  process.exit(1)
}

/**
 * 创建 readline 接口
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

/**
 * 提问并获取用户输入
 * @param {readline.Interface} rl readline 接口
 * @param {string} question 问题
 * @returns {Promise<string>} 用户输入
 */
function question(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

/**
 * 解析日期字符串（支持 2025-1-1 格式）
 * @param {string} dateStr 日期字符串
 * @returns {Date|null} 日期对象，解析失败返回 null
 */
function parseDate(dateStr) {
  if (!dateStr) return null
  
  // 支持格式：2025-1-1, 2025-01-01, 2025/1/1, 2025/01/01
  const parts = dateStr.split(/[-/]/)
  if (parts.length !== 3) return null
  
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1 // 月份从0开始
  const day = parseInt(parts[2], 10)
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  
  const date = new Date(year, month, day)
  
  // 验证日期是否有效
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  
  return date
}

/**
 * 计算两个日期之间的天数差
 * @param {Date} date1 开始日期
 * @param {Date} date2 结束日期
 * @returns {number} 天数差
 */
function getDaysDifference(date1, date2) {
  const diffTime = Math.abs(date2 - date1)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * 从数据库获取指定时间段的群消息
 * @param {number} groupId 群ID
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @returns {Promise<Array>} 消息列表
 */
async function fetchGroupMessages(groupId, startDate, endDate) {
  let client
  try {
    client = await MongoClient.connect(mongourl)
    const db = client.db('db_bot')
    const collection = db.collection('cl_chat')
    
    // 设置开始时间为当天的 00:00:00
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    // 设置结束时间为下一天的 00:00:00（不包含），这样输入 12-7 就能包含 12-7 整天
    const end = new Date(endDate)
    end.setDate(end.getDate() + 1)  // 加一天
    end.setHours(0, 0, 0, 0)
    
    // 同时支持数字和字符串类型的 gid
    const numericGid = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId
    const query = {
      $or: [
        { gid: numericGid },
        { gid: String(numericGid) }
      ],
      _id: {
        $gte: start,
        $lt: end  // 使用 $lt 因为 end 是下一天的 00:00:00，不包含
      }
    }
    
    const messages = await collection.find(query)
      .project({ _id: 1, uid: 1, d: 1, ts: 1, name: 1, n: 1 })
      .sort({ _id: 1 }) // 按时间正序排列
      .toArray()
    
    console.log(`📊 获取到 ${messages.length} 条消息`)
    
    // 过滤机器人消息
    const userMessages = messages.filter(msg => {
      const uid = typeof msg.uid === 'string' ? parseInt(msg.uid, 10) : msg.uid
      return !BOT_IDS.has(uid)
    })
    
    console.log(`👥 过滤后剩余 ${userMessages.length} 条群友消息`)
    
    return userMessages
  } catch (error) {
    console.error('❌ 获取消息失败:', error.message)
    throw error
  } finally {
    if (client) {
      await client.close()
    }
  }
}

/**
 * 清理消息内容，移除 CQ 码等
 * @param {string} content 原始消息内容
 * @returns {string} 清理后的消息
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
 * 智能采样消息，按时间均匀分布
 * 由于消息已经按时间排序，直接按索引均匀采样即可保证时间分布
 * @param {Array} messages 消息列表（已按时间排序）
 * @param {number} maxMessages 最大消息数量
 * @returns {Array} 采样后的消息列表
 */
function sampleMessagesByTime(messages, maxMessages) {
  if (messages.length <= maxMessages) {
    return messages
  }
  
  // 确保消息按时间排序
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = a.ts ? new Date(a.ts) : (a._id ? new Date(a._id) : new Date())
    const timeB = b.ts ? new Date(b.ts) : (b._id ? new Date(b._id) : new Date())
    return timeA - timeB
  })
  
  // 按索引均匀采样，保证时间分布均匀
  const step = sortedMessages.length / maxMessages
  const sampled = []
  
  for (let i = 0; i < maxMessages; i++) {
    const index = Math.floor(i * step)
    if (index < sortedMessages.length) {
      sampled.push(sortedMessages[index])
    }
  }
  
  // 确保包含第一条和最后一条消息（保持时间完整性）
  if (sampled.length > 0) {
    const firstMsg = sortedMessages[0]
    const lastMsg = sortedMessages[sortedMessages.length - 1]
    
    // 如果第一条消息不在采样中，替换第一条
    if (sampled[0] !== firstMsg) {
      sampled[0] = firstMsg
    }
    
    // 如果最后一条消息不在采样中，替换最后一条
    if (sampled[sampled.length - 1] !== lastMsg) {
      sampled[sampled.length - 1] = lastMsg
    }
  }
  
  return sampled
}

/**
 * 格式化消息为文本（优化版本，减少 token 消耗）
 * @param {Array} messages 消息列表
 * @returns {string} 格式化后的文本
 */
function formatMessagesForSummary(messages) {
  if (messages.length === 0) {
    return '暂无消息'
  }
  
  let formatted = ''
  let lastHour = -1  // 用于简化时间显示，只在小时变化时显示
  
  for (const msg of messages) {
    const uid = typeof msg.uid === 'string' ? parseInt(msg.uid, 10) : msg.uid
    const rawContent = msg.d || ''
    
    // 跳过空消息
    if (!rawContent.trim()) continue
    
    // 检查是否只包含媒体标记（纯图片/语音/视频消息）
    const mediaOnlyPattern = /^(\[图片\]|\[语音\]|\[视频\]|\[回复\])+$/
    const cleanedForCheck = rawContent
      .replace(/\[CQ:image[^\]]*\]/g, '[图片]')
      .replace(/\[CQ:record[^\]]*\]/g, '[语音]')
      .replace(/\[CQ:video[^\]]*\]/g, '[视频]')
      .replace(/\[CQ:reply[^\]]*\]/g, '[回复]')
      .replace(/\[CQ:at[^\]]*\]/g, '')
      .trim()
    
    // 如果清理后只剩媒体标记或为空，跳过
    if (!cleanedForCheck || mediaOnlyPattern.test(cleanedForCheck)) continue
    
    // 清理消息内容
    const content = cleanMessageContent(rawContent)
    
    // 再次检查清理后的内容
    if (!content || content === '[图片]' || content === '[语音]' || content === '[视频]') continue
    
    // 简化用户标识：使用 uid 后5位
    const uidStr = String(uid)
    const shortUid = uidStr.length > 5 ? uidStr.slice(-5) : uidStr.padStart(5, '0')
    
    // 简化时间：只在小时变化时显示，格式为 HH:mm
    const msgTime = msg.ts ? new Date(msg.ts) : (msg._id ? new Date(msg._id) : new Date())
    const currentHour = msgTime.getHours()
    
    let timePrefix = ''
    if (currentHour !== lastHour) {
      // 只在小时变化时显示时间
      const hour = String(currentHour).padStart(2, '0')
      const minute = String(msgTime.getMinutes()).padStart(2, '0')
      timePrefix = `${hour}:${minute} `
      lastHour = currentHour
    }
    
    // 简化格式：时间(可选) + 用户ID后5位 + 内容
    formatted += `${timePrefix}${shortUid}: ${content}\n`
  }
  
  return formatted.trim()
}

/**
 * 调用 DeepSeek API 总结知识库
 * @param {string} messagesText 消息文本
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @returns {Promise<Object>} 包含 title, content, keywords 的对象
 */
async function callDeepSeekForSummary(messagesText, startDate, endDate) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API Key 未配置')
  }

  // 格式化时间范围
  const startDateStr = startDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const endDateStr = endDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timeRange = startDateStr === endDateStr 
    ? startDateStr 
    : `${startDateStr} 至 ${endDateStr}`

  const systemPrompt = `你是一个知识库总结助手。你的任务是根据群聊记录，总结出有价值的知识点。

请仔细分析群聊内容，提取出：
1. 一个简洁明确的标题（10-30字）
2. 详细的知识内容正文（200-500字，包含关键信息、要点、注意事项等）
3. 3-8个关键词（用于搜索匹配）

要求：
- 标题要准确概括核心内容
- 正文要条理清晰，包含重要细节，并且必须在开头或结尾明确标注时间范围（因为有些内容具有时效性）
- 关键词要覆盖主要内容，便于搜索
- 如果内容没有价值或只是闲聊，请返回空结果

请以 JSON 格式返回，格式如下：
{
  "title": "标题",
  "content": "正文内容（必须包含时间范围信息）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

如果内容没有价值，返回：
{
  "title": "",
  "content": "",
  "keywords": []
}`

  const userPrompt = `以下是群聊记录，请总结成知识库条目：

【时间范围】${timeRange}

【群聊记录】
${messagesText}

请返回 JSON 格式的结果。注意：正文内容中必须包含时间范围信息，因为有些内容具有时效性。
【特别注意】
讨论中的布本为“布里列赫”，而不是“布罗尼副本”
`

  const requestBody = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 4000  // DeepSeek 最大支持 8K，设置为 4K 留有余地
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
      const errorText = await response.text()
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`API 错误: ${data.error.message || '未知错误'}`)
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('API 返回格式异常')
    }
    
    const reply = data.choices[0].message.content.trim()
    
    // 尝试解析 JSON（可能包含代码块标记）
    let jsonStr = reply
    
    // 移除可能的 markdown 代码块标记
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (match) {
        jsonStr = match[1]
      }
    }
    
    // 解析 JSON
    try {
      const result = JSON.parse(jsonStr)
      
      // 验证结果格式
      if (typeof result !== 'object' || result === null) {
        throw new Error('返回结果不是对象')
      }
      
      return {
        title: result.title || '',
        content: result.content || '',
        keywords: Array.isArray(result.keywords) ? result.keywords : []
      }
    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError.message)
      console.error('原始回复:', reply)
      throw new Error(`JSON 解析失败: ${parseError.message}`)
    }
  } catch (error) {
    console.error('❌ DeepSeek API 调用失败:', error.message)
    throw error
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60))
  console.log('📚 群聊记录知识库生成工具')
  console.log('='.repeat(60))
  console.log('')
  
  const rl = createReadlineInterface()
  
  try {
    // 1. 获取群号
    let groupId = await question(rl, '请输入群号: ')
    groupId = parseInt(groupId, 10)
    if (isNaN(groupId)) {
      console.error('❌ 群号格式错误')
      process.exit(1)
    }
    
    // 2. 获取开始日期
    let startDateStr = await question(rl, '请输入开始日期 (格式: 2025-1-1，包含该天): ')
    const startDate = parseDate(startDateStr)
    if (!startDate) {
      console.error('❌ 开始日期格式错误，请使用 2025-1-1 格式')
      process.exit(1)
    }
    
    // 3. 获取结束日期
    let endDateStr = await question(rl, '请输入结束日期 (格式: 2025-1-1，包含该天，直接回车则与开始日期相同): ')
    let endDate
    if (!endDateStr || endDateStr.trim() === '') {
      // 如果直接回车，使用开始日期
      endDate = new Date(startDate)
      console.log(`✅ 结束日期未输入，使用开始日期: ${endDate.toLocaleDateString('zh-CN')}`)
    } else {
      endDate = parseDate(endDateStr)
      if (!endDate) {
        console.error('❌ 结束日期格式错误，请使用 2025-1-1 格式')
        process.exit(1)
      }
    }
    
    // 4. 验证日期范围
    if (endDate < startDate) {
      console.error('❌ 结束日期不能早于开始日期')
      process.exit(1)
    }
    
    const daysDiff = getDaysDifference(startDate, endDate)
    if (daysDiff > 35) {
      console.error(`❌ 时间范围不能超过35天，当前为 ${daysDiff} 天`)
      process.exit(1)
    }
    
    console.log('')
    console.log('='.repeat(60))
    console.log('📋 参数确认')
    console.log('='.repeat(60))
    console.log(`群号: ${groupId}`)
    console.log(`开始日期: ${startDate.toLocaleDateString('zh-CN')}`)
    console.log(`结束日期: ${endDate.toLocaleDateString('zh-CN')}`)
    console.log(`时间范围: ${daysDiff} 天`)
    console.log('')
    
    // 5. 获取消息
    console.log('📥 正在获取群消息...')
    const messages = await fetchGroupMessages(groupId, startDate, endDate)
    
    if (messages.length === 0) {
      console.log('⚠️  该时间段内没有群友消息')
      process.exit(0)
    }
    
    // 6. 智能采样消息（如果消息太多）
    // 估算：平均每条消息约 40 字符，80000 字符约可容纳 2000 条消息
    // 但为了安全，设置为 1500 条
    const maxMessages = 1500
    let finalMessages = messages
    if (messages.length > maxMessages) {
      console.log(`⚠️  消息数量过多 (${messages.length} 条)，进行智能采样到 ${maxMessages} 条...`)
      finalMessages = sampleMessagesByTime(messages, maxMessages)
      console.log(`✅ 采样完成，保留 ${finalMessages.length} 条消息（按时间均匀分布）`)
    }
    
    // 7. 格式化消息
    console.log('📝 正在格式化消息...')
    let messagesText = formatMessagesForSummary(finalMessages)
    
    // 如果格式化后还是太长，再次截取（作为最后的安全措施）
    const maxLength = 80000
    let finalMessagesText = messagesText
    if (messagesText.length > maxLength) {
      console.log(`⚠️  格式化后内容仍然过长 (${messagesText.length} 字符)，截取前 ${maxLength} 字符`)
      finalMessagesText = messagesText.substring(0, maxLength) + '\n... (内容已截断)'
    }
    
    // 8. 调用 DeepSeek API 总结
    console.log('🤖 正在调用 DeepSeek API 总结知识库...')
    const summary = await callDeepSeekForSummary(finalMessagesText, startDate, endDate)
    
    // 9. 输出结果
    console.log('')
    console.log('='.repeat(60))
    console.log('✅ 知识库生成完成')
    console.log('='.repeat(60))
    console.log('')
    console.log('📌 标题:')
    console.log(summary.title || '(无)')
    console.log('')
    console.log('📄 正文:')
    console.log(summary.content || '(无)')
    console.log('')
    console.log('🔑 关键词:')
    console.log(summary.keywords.length > 0 ? summary.keywords.join(', ') : '(无)')
    console.log('')
    console.log('='.repeat(60))
    
    // 10. 询问是否保存到知识库
    const save = await question(rl, '是否保存到知识库? (y/n): ')
    if (save.toLowerCase() === 'y' || save.toLowerCase() === 'yes') {
      if (summary.title && summary.content) {
        const knowledge = require('./index')
        const success = await knowledge.addKnowledge({
          title: summary.title,
          content: summary.content,
          keywords: summary.keywords,
          category: '群聊总结'
        })
        
        if (success) {
          console.log('✅ 已保存到知识库')
        } else {
          console.log('❌ 保存失败')
        }
      } else {
        console.log('⚠️  标题或正文为空，无法保存')
      }
    }
    
  } catch (error) {
    console.error('❌ 发生错误:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    rl.close()
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序异常:', error)
    process.exit(1)
  })
}

module.exports = {
  fetchGroupMessages,
  callDeepSeekForSummary,
  formatMessagesForSummary
}

