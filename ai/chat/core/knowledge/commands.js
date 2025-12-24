/**
 * 知识库管理命令模块
 * 提供群聊命令来管理知识库
 * 
 * 命令格式：
 * - 知识库列表 / 知识列表 - 查看所有知识条目
 * - 知识库添加 <标题> | <内容> | [关键词1,关键词2] | [分类] - 添加知识
 * - 知识库删除 <标题或ID> - 删除知识条目
 * - 知识库搜索 <关键词> - 搜索相关知识
 */

const knowledge = require('./index')

// 管理员 QQ 列表（只有管理员可以使用知识库命令）
const ADMIN_QQ_LIST = new Set([
  799018865
])

/**
 * 检查是否是管理员
 * @param {number} userId 用户 QQ 号
 * @returns {boolean}
 */
function isAdmin(userId) {
  return ADMIN_QQ_LIST.has(userId)
}

/**
 * 处理知识库命令
 * @param {string} message 消息内容
 * @param {number} userId 用户 QQ 号
 * @returns {Promise<string|null>} 回复内容，null 表示不是知识库命令
 */
async function handleKnowledgeCommand(message, userId) {
  const trimmedMsg = message.trim()
  
  // 检查是否是知识库命令
  if (!isKnowledgeCommand(trimmedMsg)) {
    return null
  }
  
  // 所有知识库命令都需要管理员权限
  if (!isAdmin(userId)) {
    return '抱歉，知识库功能仅限管理员使用'
  }
  
  // 查看知识库列表
  if (/^(知识库列表|知识列表|百百知识库)$/i.test(trimmedMsg)) {
    return await knowledge.listKnowledgeSummary()
  }
  
  // 搜索知识
  const searchMatch = trimmedMsg.match(/^(知识库搜索|知识搜索|搜索知识)\s+(.+)$/i)
  if (searchMatch) {
    const query = searchMatch[2].trim()
    const results = await knowledge.searchKnowledge(query, 5)
    
    if (results.length === 0) {
      return `未找到与"${query}"相关的知识`
    }
    
    let reply = `找到 ${results.length} 条相关知识:\n`
    for (const entry of results) {
      reply += `\n【${entry.title}】\n${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}\n`
    }
    return reply
  }
  
  // 查看某条知识详情
  const detailMatch = trimmedMsg.match(/^(知识库详情|知识详情|查看知识)\s+(.+)$/i)
  if (detailMatch) {
    const query = detailMatch[2].trim()
    const results = await knowledge.searchKnowledge(query, 1)
    
    if (results.length === 0) {
      return `未找到"${query}"相关的知识`
    }
    
    const entry = results[0]
    let reply = `【${entry.title}】\n`
    reply += `ID: ${entry.id}\n`
    reply += `分类: ${entry.category || '通用'}\n`
    reply += `关键词: ${entry.keywords?.join(', ') || '无'}\n`
    reply += `内容:\n${entry.content}\n`
    reply += `创建时间: ${entry.createdAt || '未知'}`
    return reply
  }
  
  // 添加知识
  const addMatch = trimmedMsg.match(/^(知识库添加|添加知识|新增知识)\s+(.+)$/is)
  if (addMatch) {
    const content = addMatch[2].trim()
    // 解析格式：标题 | 内容 | 关键词(可选) | 分类(可选)
    const parts = content.split('|').map(p => p.trim())
    
    if (parts.length < 2) {
      return '格式错误！正确格式：知识库添加 标题 | 内容 | 关键词1,关键词2 | 分类\n（关键词和分类可选）'
    }
    
    const entry = {
      title: parts[0],
      content: parts[1],
      keywords: parts[2] ? parts[2].split(/[,，]/).map(k => k.trim()).filter(k => k) : [],
      category: parts[3] || '通用',
      createdBy: userId
    }
    
    const success = await knowledge.addKnowledge(entry)
    if (success) {
      return `✅ 知识添加成功！\n标题: ${entry.title}\n分类: ${entry.category}`
    } else {
      return '❌ 知识添加失败，请检查格式'
    }
  }
  
  // 删除知识
  const deleteMatch = trimmedMsg.match(/^(知识库删除|删除知识|移除知识)\s+(.+)$/i)
  if (deleteMatch) {
    const target = deleteMatch[2].trim()
    
    // 先尝试按 ID 删除
    let success = await knowledge.removeKnowledge(target)
    
    // 如果按 ID 删除失败，尝试按标题删除
    if (!success) {
      success = await knowledge.removeKnowledgeByTitle(target)
    }
    
    if (success) {
      return `✅ 知识"${target}"已删除`
    } else {
      return `❌ 未找到"${target}"相关的知识条目`
    }
  }
  
  // 知识库帮助
  if (/^(知识库帮助|知识帮助)$/i.test(trimmedMsg)) {
    return `📚 知识库命令帮助（仅管理员可用）

【查看命令】
• 知识库列表 - 查看所有知识条目
• 知识库搜索 <关键词> - 搜索相关知识
• 知识库详情 <标题或ID> - 查看知识详情

【管理命令】
• 知识库添加 标题 | 内容 | 关键词 | 分类
• 知识库删除 <标题或ID>

【示例】
知识库添加 洛奇钓鱼攻略 | 钓鱼技能升级需要在河边使用鱼竿... | 钓鱼,技能,攻略 | 洛奇游戏`
  }
  
  // 未匹配到具体命令
  return '未识别的知识库命令，输入"知识库帮助"查看用法'
}

/**
 * 检查消息是否是知识库命令
 * @param {string} message 消息内容
 * @returns {boolean}
 */
function isKnowledgeCommand(message) {
  const trimmedMsg = message.trim()
  const patterns = [
    /^(知识库|知识)(列表|搜索|详情|添加|删除|帮助)/i,
    /^(添加|删除|移除|新增|查看|搜索)知识/i,
    /^百百知识库$/i
  ]
  return patterns.some(p => p.test(trimmedMsg))
}

module.exports = {
  handleKnowledgeCommand,
  isKnowledgeCommand,
  isAdmin,
  ADMIN_QQ_LIST
}
