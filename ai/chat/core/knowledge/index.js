/**
 * 知识库管理模块
 * 为 AI 聊天提供特定知识参考
 * 
 * 使用 MongoDB 存储，集合: cl_ai_knowledge
 */

const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../../baibaiConfigs')

// 数据库和集合名称
const DB_NAME = 'db_bot'
const COLLECTION_NAME = 'cl_ai_knowledge'

/**
 * 获取数据库连接
 * @returns {Promise<{client: MongoClient, collection: Collection}>}
 */
async function getCollection() {
  const client = await MongoClient.connect(mongourl)
  const db = client.db(DB_NAME)
  const collection = db.collection(COLLECTION_NAME)
  return { client, collection }
}

/**
 * 添加知识条目
 * @param {Object} entry 知识条目
 * @param {string} entry.title 标题/关键词
 * @param {string} entry.content 知识内容
 * @param {string[]} [entry.keywords] 额外关键词
 * @param {string} [entry.category] 分类
 * @param {number} [entry.createdBy] 创建者 QQ
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addKnowledge(entry) {
  if (!entry.title || !entry.content) {
    console.error('[知识库] 添加失败: 缺少标题或内容')
    return false
  }
  
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    const newEntry = {
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords || [],
      category: entry.category || '通用',
      createdBy: entry.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await collection.insertOne(newEntry)
    console.log(`[知识库] 添加成功: ${newEntry.title}`)
    return true
  } catch (error) {
    console.error('[知识库] 添加失败:', error.message)
    return false
  } finally {
    if (client) await client.close()
  }
}

/**
 * 更新知识条目
 * @param {string} id 条目ID（MongoDB ObjectId 字符串）
 * @param {Object} entry 知识条目
 * @param {string} entry.title 标题/关键词
 * @param {string} entry.content 知识内容
 * @param {string[]} [entry.keywords] 额外关键词
 * @param {string} [entry.category] 分类
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateKnowledge(id, entry) {
  if (!entry.title || !entry.content) {
    console.error('[知识库] 更新失败: 缺少标题或内容')
    return false
  }
  
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    const { ObjectId } = require('mongodb')
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch {
      return false
    }
    
    const updateData = {
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords || [],
      category: entry.category || '通用',
      updatedAt: new Date()
    }
    
    const result = await collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    )
    
    if (result.matchedCount > 0) {
      console.log(`[知识库] 更新成功: ${id}`)
      return true
    }
    return false
  } catch (error) {
    console.error('[知识库] 更新失败:', error.message)
    return false
  } finally {
    if (client) await client.close()
  }
}

/**
 * 删除知识条目
 * @param {string} id 条目ID（MongoDB ObjectId 字符串）
 * @returns {Promise<boolean>} 是否删除成功
 */
async function removeKnowledge(id) {
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    const { ObjectId } = require('mongodb')
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch {
      return false
    }
    
    const result = await collection.deleteOne({ _id: objectId })
    
    if (result.deletedCount > 0) {
      console.log(`[知识库] 删除成功: ${id}`)
      return true
    }
    return false
  } catch (error) {
    console.error('[知识库] 删除失败:', error.message)
    return false
  } finally {
    if (client) await client.close()
  }
}

/**
 * 根据标题删除知识条目
 * @param {string} title 条目标题
 * @returns {Promise<boolean>} 是否删除成功
 */
async function removeKnowledgeByTitle(title) {
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    const result = await collection.deleteOne({ title: title })
    
    if (result.deletedCount > 0) {
      console.log(`[知识库] 删除成功: ${title}`)
      return true
    }
    return false
  } catch (error) {
    console.error('[知识库] 删除失败:', error.message)
    return false
  } finally {
    if (client) await client.close()
  }
}

/**
 * 简单的中文分词（提取2-4字的连续片段作为关键词）
 * @param {string} text 文本
 * @returns {string[]} 分词结果
 */
function simpleChineseTokenize(text) {
  const tokens = new Set()
  
  // 按空格和标点分割
  const segments = text.split(/[\s,，.。!！?？:：;；\-—_]+/).filter(s => s.length > 0)
  
  for (const segment of segments) {
    // 添加整个片段
    if (segment.length >= 2) {
      tokens.add(segment)
    }
    
    // 提取2-4字的子串
    for (let len = 2; len <= Math.min(4, segment.length); len++) {
      for (let i = 0; i <= segment.length - len; i++) {
        tokens.add(segment.substring(i, i + len))
      }
    }
  }
  
  return Array.from(tokens)
}

/**
 * 搜索相关知识
 * @param {string} query 查询内容
 * @param {number} limit 返回数量限制
 * @returns {Promise<Array>} 匹配的知识条目
 */
async function searchKnowledge(query, limit = 5) {
  if (!query) return []
  
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    // 清理查询内容：移除 CQ 码和多余空白
    const cleanQuery = query
      .replace(/\[CQ:[^\]]+\]/g, '')  // 移除所有 CQ 码
      .replace(/\s+/g, ' ')  // 合并多余空白
      .trim()
    
    if (!cleanQuery) {
      console.log(`[知识库] 清理后查询为空，跳过搜索`)
      return []
    }
    
    const queryLower = cleanQuery.toLowerCase()
    // 使用简单中文分词
    const queryTokens = simpleChineseTokenize(queryLower)
    
    console.log(`[知识库] 搜索查询: "${cleanQuery}"`)
    console.log(`[知识库] 分词结果: ${queryTokens.slice(0, 10).join(', ')}${queryTokens.length > 10 ? '...' : ''}`)
    
    // 获取所有知识条目（如果数据量大，后期可优化为 MongoDB 全文搜索）
    const allEntries = await collection.find({}).toArray()
    
    console.log(`[知识库] 共有 ${allEntries.length} 条知识`)
    
    // 计算每个条目的匹配分数
    const scored = allEntries.map(entry => {
      let score = 0
      const titleLower = entry.title.toLowerCase()
      const contentLower = entry.content.toLowerCase()
      const keywordsLower = (entry.keywords || []).map(k => k.toLowerCase())
      
      // 关键词匹配（使用原始关键词）- 最高优先级，因为关键词是专门设置的
      for (const keyword of keywordsLower) {
        if (keyword === queryLower) {
          score += 80  // 关键词完全匹配 - 最高分
        } else if (queryLower.includes(keyword) || keyword.includes(queryLower)) {
          score += 35  // 关键词部分匹配
        }
      }
      
      // 正文匹配 - 正文包含主要内容，给予高权重
      if (contentLower.length > 0) {
        // 性能优化：对于超长正文（>1000字符），优先搜索前1000字符
        // 因为正文开头通常包含最重要的信息，这样可以平衡性能和准确性
        const contentSearchLength = Math.min(1000, contentLower.length)
        const contentToSearch = contentLower.substring(0, contentSearchLength)
        
        // 正文包含完整查询
        if (contentToSearch.includes(queryLower)) {
          score += 60
        }
        
        // 正文分词匹配 - 提高权重，因为正文是主要内容
        for (const token of queryTokens) {
          if (token.length < 2) continue
          if (contentToSearch.includes(token)) {
            score += 25  // 大幅提高正文分词权重
          }
        }
      }
      
      // 标题匹配 - 降低权重，标题只是辅助信息
      if (titleLower === queryLower) {
        score += 40  // 标题完全匹配
      } else if (titleLower.includes(queryLower)) {
        score += 25  // 标题包含查询
      } else if (queryLower.includes(titleLower)) {
        score += 20  // 查询包含标题
      }
      
      // 标题分词匹配
      for (const token of queryTokens) {
        if (token.length < 2) continue
        if (titleLower.includes(token)) {
          score += 8  // 降低标题分词权重
        }
      }
      
      // 关键词分词匹配 - 保持中等权重
      for (const token of queryTokens) {
        if (token.length < 2) continue
        if (keywordsLower.some(k => k.includes(token) || token.includes(k))) {
          score += 15
        }
      }
      
      // 反向匹配：知识库关键词在查询中
      for (const keyword of keywordsLower) {
        if (keyword.length >= 2 && queryLower.includes(keyword)) {
          score += 30
        }
      }
      
      return { entry, score }
    })
    
    // 过滤并排序
    const filtered = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
    
    // 调试日志：显示匹配结果
    if (filtered.length > 0) {
      console.log(`[知识库] 找到 ${filtered.length} 条匹配:`)
      filtered.slice(0, 3).forEach(item => {
        console.log(`  - "${item.entry.title}" (分数: ${item.score})`)
      })
    } else {
      console.log(`[知识库] 未找到匹配的知识`)
    }
    
    return filtered
      .slice(0, limit)
      .map(item => ({
        ...item.entry,
        id: item.entry._id.toString()
      }))
  } catch (error) {
    console.error('[知识库] 搜索失败:', error.message)
    return []
  } finally {
    if (client) await client.close()
  }
}

/**
 * 获取所有知识条目（包含完整内容）
 * @returns {Promise<Array>} 所有知识条目
 */
async function getAllKnowledge() {
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    const entries = await collection.find({}).sort({ createdAt: -1 }).toArray()
    return entries.map(e => ({
      ...e,
      id: e._id.toString()
    }))
  } catch (error) {
    console.error('[知识库] 获取失败:', error.message)
    return []
  } finally {
    if (client) await client.close()
  }
}

/**
 * 获取知识列表（不包含完整内容，只返回摘要）
 * @param {number} [contentPreviewLength=200] 内容预览长度
 * @returns {Promise<Array>} 知识列表
 */
async function getKnowledgeList(contentPreviewLength = 200) {
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    // 使用聚合管道来截取内容预览，避免传输完整内容
    // 使用 $substrCP 来处理 UTF-8 字符串
    const pipeline = [
      {
        $project: {
          _id: 1,
          title: 1,
          keywords: 1,
          category: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: 1,
          contentPreview: {
            $cond: {
              if: { 
                $gt: [
                  { $strLenCP: { $ifNull: ['$content', ''] } }, 
                  contentPreviewLength
                ] 
              },
              then: {
                $concat: [
                  { $substrCP: [{ $ifNull: ['$content', ''] }, 0, contentPreviewLength] },
                  '...'
                ]
              },
              else: { $ifNull: ['$content', ''] }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]
    
    const entries = await collection.aggregate(pipeline).toArray()
    
    return entries.map(e => ({
      id: e._id.toString(),
      title: e.title || '',
      contentPreview: e.contentPreview || '',
      keywords: e.keywords || [],
      category: e.category || '通用',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      createdBy: e.createdBy || null
    }))
  } catch (error) {
    console.error('[知识库] 获取列表失败:', error.message)
    console.error('[知识库] 错误堆栈:', error.stack)
    // 如果聚合失败，降级到简单查询（在内存中截取）
    try {
      const entries = await collection.find({}).sort({ createdAt: -1 }).toArray()
      
      return entries.map(e => {
        const content = e.content || ''
        const contentPreview = content.length > contentPreviewLength
          ? content.substring(0, contentPreviewLength) + '...'
          : content
        
        return {
          id: e._id.toString(),
          title: e.title || '',
          contentPreview: contentPreview,
          keywords: e.keywords || [],
          category: e.category || '通用',
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          createdBy: e.createdBy || null
        }
      })
    } catch (fallbackError) {
      console.error('[知识库] 降级查询也失败:', fallbackError.message)
      console.error('[知识库] 降级错误堆栈:', fallbackError.stack)
      return []
    }
  } finally {
    if (client) await client.close()
  }
}

/**
 * 根据ID获取单个知识条目（完整内容）
 * @param {string} id 条目ID
 * @returns {Promise<Object|null>} 知识条目
 */
async function getKnowledgeById(id) {
  let client
  try {
    const { client: c, collection } = await getCollection()
    client = c
    
    const { ObjectId } = require('mongodb')
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch {
      return null
    }
    
    const entry = await collection.findOne({ _id: objectId })
    if (!entry) {
      return null
    }
    
    return {
      ...entry,
      id: entry._id.toString()
    }
  } catch (error) {
    console.error('[知识库] 获取失败:', error.message)
    return null
  } finally {
    if (client) await client.close()
  }
}

/**
 * 获取按分类整理的知识
 * @returns {Promise<Object>} 按分类整理的知识
 */
async function getKnowledgeByCategory() {
  const entries = await getAllKnowledge()
  const categories = {}
  
  for (const entry of entries) {
    const cat = entry.category || '通用'
    if (!categories[cat]) {
      categories[cat] = []
    }
    categories[cat].push(entry)
  }
  
  return categories
}

/**
 * 格式化知识为 AI Prompt 可用的格式
 * @param {Array} entries 知识条目列表
 * @returns {string} 格式化的知识文本
 */
function formatKnowledgeForPrompt(entries) {
  if (!entries || entries.length === 0) {
    return ''
  }
  
  let formatted = `

===========================================
【官方知识库 - 必须优先采用】
以下是经过验证的准确信息。当用户问题涉及这些内容时，你必须基于知识库回答，不要被群聊记录中的其他说法干扰或误导。
===========================================
`
  
  for (const entry of entries) {
    formatted += `\n◆ ${entry.title}\n`
    formatted += `  ${entry.content}\n`
  }
  
  formatted += `
===========================================
`
  
  return formatted
}

/**
 * 根据用户消息获取相关知识并格式化
 * @param {string} userMessage 用户消息
 * @param {number} limit 返回数量限制
 * @returns {Promise<string>} 格式化的知识文本
 */
async function getRelevantKnowledgePrompt(userMessage, limit = 3) {
  console.log(`[知识库] 正在为消息搜索相关知识: "${userMessage.substring(0, 50)}..."`)
  const relevantEntries = await searchKnowledge(userMessage, limit)
  const formatted = formatKnowledgeForPrompt(relevantEntries)
  if (formatted) {
    console.log(`[知识库] 已注入 ${relevantEntries.length} 条知识到 AI Prompt`)
  } else {
    console.log(`[知识库] 未找到相关知识，不注入`)
  }
  return formatted
}

/**
 * 列出所有知识条目（简短格式）
 * @returns {Promise<string>} 知识列表文本
 */
async function listKnowledgeSummary() {
  const entries = await getAllKnowledge()
  
  if (entries.length === 0) {
    return '知识库为空'
  }
  
  let summary = `知识库共 ${entries.length} 条记录:\n`
  
  const byCategory = await getKnowledgeByCategory()
  for (const [category, items] of Object.entries(byCategory)) {
    summary += `\n【${category}】\n`
    for (const item of items) {
      summary += `  - ${item.title} (ID: ${item.id})\n`
    }
  }
  
  return summary
}

module.exports = {
  addKnowledge,
  updateKnowledge,
  removeKnowledge,
  removeKnowledgeByTitle,
  searchKnowledge,
  getAllKnowledge,
  getKnowledgeList,
  getKnowledgeById,
  getKnowledgeByCategory,
  formatKnowledgeForPrompt,
  getRelevantKnowledgePrompt,
  listKnowledgeSummary
}
