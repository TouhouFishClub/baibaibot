/**
 * QQ群聊年度报告生成器 - Node.js版本
 * 主入口文件
 */

const fs = require('fs')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl, IMAGE_DATA } = require('../../../baibaiConfigs')
const ChatAnalyzer = require('./analyzer')
const { generateImage } = require('./imageGenerator')

// 机器人ID，排除统计
const BOT_IDS = new Set([981069482, 3291864216, 1840239061, 2771362647, 384901015, 10000, 2730629054, 1561267174])

// 缓存目录
const CACHE_DIR = path.join(IMAGE_DATA, 'other', 'annual_report_cache')

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

// 获取群成员列表的引用
let fetchGroupUsersRef = null

/**
 * 获取群成员列表（延迟加载避免循环依赖）
 * @param {number} groupId 
 * @param {string} port 
 * @returns {Promise<Array>}
 */
async function fetchGroupUsers(groupId, port) {
  if (!fetchGroupUsersRef) {
    // 使用 reverseWsUtils 获取群成员列表
    const { createHttpApiWrapper } = require('../../../reverseWsUtils')
    
    fetchGroupUsersRef = async (gid, p) => {
      try {
        const apiWrapper = createHttpApiWrapper(p)
        let groupMemberData = await apiWrapper.getGroupMemberList(gid, true)
        
        if (!groupMemberData || !Array.isArray(groupMemberData) || groupMemberData.length === 0) {
          groupMemberData = await apiWrapper.getGroupMemberList(gid, false)
        }
        
        if (groupMemberData && Array.isArray(groupMemberData) && groupMemberData.length > 0) {
          return groupMemberData.map(x => {
            let nid = x.card || x.nickname
            let alias = nid
            if (nid && nid.length > 10) {
              alias = `${nid.substring(0, 10)}...`
            }
            return {
              uid: x.user_id,
              nid,
              alias
            }
          })
        }
      } catch (error) {
        console.warn(`获取群成员列表失败:`, error.message)
      }
      return []
    }
  }
  
  return fetchGroupUsersRef(groupId, port)
}

/**
 * 从数据库获取群聊消息数据
 * @param {number} groupId 群ID
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @returns {Promise<Array>}
 */
async function fetchChatData(groupId, startDate, endDate) {
  let client
  try {
    client = await MongoClient.connect(mongourl)
    const db = client.db('db_bot')
    const collection = db.collection('cl_chat')
    
    const query = {
      gid: groupId,
      _id: {
        $gte: startDate,
        $lte: endDate
      }
    }
    
    // 使用 project() 方法替代 find 的第二参数，兼容性更好
    const messages = await collection.find(query)
      .project({ _id: 1, uid: 1, d: 1, ts: 1 })
      .sort({ _id: 1 })
      .toArray()
    console.log(`📊 获取到 ${messages.length} 条消息`)
    
    return messages
  } finally {
    if (client) {
      await client.close()
    }
  }
}

/**
 * 构建用户ID到昵称的映射
 * @param {Array} groupUsers 群成员列表
 * @returns {Object}
 */
function buildUserMap(groupUsers) {
  const userMap = {}
  for (const user of groupUsers) {
    userMap[user.uid] = user.alias || user.nid || `用户${user.uid}`
  }
  return userMap
}

/**
 * 获取缓存文件路径
 * @param {number} groupId 群ID
 * @param {string} year 年份
 * @returns {string}
 */
function getCacheFilePath(groupId, year = '2025') {
  return path.join(CACHE_DIR, `annual_report_${groupId}_${year}.png`)
}

/**
 * 检查是否存在缓存
 * @param {number} groupId 群ID
 * @param {string} year 年份
 * @returns {boolean}
 */
function hasCachedReport(groupId, year = '2025') {
  const cachePath = getCacheFilePath(groupId, year)
  return fs.existsSync(cachePath)
}

/**
 * 获取缓存的报告图片CQ码
 * @param {number} groupId 群ID
 * @param {string} year 年份
 * @returns {string}
 */
function getCachedReportCQ(groupId, year = '2025') {
  const relativePath = path.join('send', 'other', 'annual_report_cache', `annual_report_${groupId}_${year}.png`)
  return `[CQ:image,file=${relativePath}]`
}

/**
 * 删除缓存的报告
 * @param {number} groupId 群ID
 * @param {string} year 年份
 */
function deleteCachedReport(groupId, year = '2025') {
  const cachePath = getCacheFilePath(groupId, year)
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath)
    console.log(`🗑️ 已删除缓存: ${cachePath}`)
  }
}

/**
 * 生成年度报告
 * @param {Object} options 配置选项
 * @param {number} options.groupId 群ID
 * @param {string} options.port 端口号
 * @param {string} options.groupName 群名称（可选）
 * @param {Date} options.startDate 开始日期
 * @param {Date} options.endDate 结束日期
 * @param {boolean} options.forceRegenerate 是否强制重新生成
 * @returns {Promise<string>} 生成的图片CQ码
 */
async function generateAnnualReport(options) {
  const { groupId, port, groupName, startDate, endDate, forceRegenerate = false } = options
  const year = startDate.getFullYear().toString()
  
  // 检查缓存（非强制重新生成时）
  if (!forceRegenerate && hasCachedReport(groupId, year)) {
    console.log(`📦 使用缓存的年度报告: 群${groupId}`)
    return getCachedReportCQ(groupId, year)
  }
  
  // 如果强制重新生成，先删除旧缓存
  if (forceRegenerate) {
    deleteCachedReport(groupId, year)
  }
  
  console.log(`🚀 开始生成年度报告`)
  console.log(`   群ID: ${groupId}`)
  console.log(`   时间范围: ${startDate.toISOString()} ~ ${endDate.toISOString()}`)
  
  // 1. 获取群成员列表
  console.log('👥 获取群成员列表...')
  const groupUsers = await fetchGroupUsers(groupId, port)
  const userMap = buildUserMap(groupUsers)
  console.log(`   获取到 ${groupUsers.length} 个群成员`)
  
  // 2. 获取聊天数据
  console.log('📥 获取聊天数据...')
  let messages = await fetchChatData(groupId, startDate, endDate)
  
  // 调试：检查第一条消息的格式
  if (messages.length > 0) {
    const sample = messages[0]
    console.log(`   📋 样本消息: uid=${sample.uid}(${typeof sample.uid}), d=${sample.d ? sample.d.substring(0, 50) : 'undefined'}`)
  }
  
  // 过滤机器人消息（注意uid可能是字符串或数字）
  messages = messages.filter(msg => {
    const uid = typeof msg.uid === 'string' ? parseInt(msg.uid, 10) : msg.uid
    return !BOT_IDS.has(uid)
  })
  console.log(`   过滤后剩余 ${messages.length} 条消息`)
  
  if (messages.length === 0) {
    throw new Error('没有找到符合条件的聊天记录')
  }
  
  // 3. 分析数据
  console.log('🔍 开始分析数据...')
  const analyzer = new ChatAnalyzer({
    chatName: groupName || `群${groupId}`,
    messages,
    userMap,
    useStopwords: true
  })
  
  analyzer.analyze()
  
  // 4. 导出JSON数据
  const jsonData = analyzer.exportJson()
  
  // 5. 生成图片（保存到缓存目录）
  console.log('🖼️ 生成图片报告...')
  const outputPath = getCacheFilePath(groupId, year)
  
  await generateImage(jsonData, outputPath)
  
  // 返回CQ码格式的图片消息
  const imgMsg = getCachedReportCQ(groupId, year)
  
  console.log('✅ 年度报告生成完成并已缓存!')
  return imgMsg
}

/**
 * 处理年度报告命令
 * @param {number} groupId 群ID
 * @param {number} userId 用户ID
 * @param {string} port 端口号
 * @param {Function} callback 回调函数
 * @param {string} groupName 群名称（可选）
 * @param {boolean} forceRegenerate 是否强制重新生成
 */
async function handleAnnualReportCommand(groupId, userId, port, callback, groupName = null, forceRegenerate = false) {
  // 权限检查：只有管理员可以使用
  const ADMIN_IDS = new Set([799018865, 357474405])
  if (!ADMIN_IDS.has(userId)) {
    // 非管理员不回复任何信息
    return
  }
  
  try {
    // 设置时间范围（2025年全年）
    const startDate = new Date('2025-01-01T00:00:00+08:00')
    const endDate = new Date('2025-12-31T23:59:59+08:00')
    const year = startDate.getFullYear().toString()
    
    // 检查是否有缓存（非强制重新生成时）
    if (!forceRegenerate && hasCachedReport(groupId, year)) {
      callback('📦 发送缓存的年度报告...')
    } else if (forceRegenerate) {
      callback('🔄 正在重新生成年度报告，请稍候...')
    } else {
      callback('📊 正在生成年度报告，请稍候（首次生成需要较长时间）...')
    }
    
    const imgMsg = await generateAnnualReport({
      groupId,
      port,
      groupName,
      startDate,
      endDate,
      forceRegenerate
    })
    
    callback(imgMsg)
  } catch (error) {
    console.error('年度报告生成失败:', error)
    callback(`❌ 年度报告生成失败: ${error.message}`)
  }
}

module.exports = {
  generateAnnualReport,
  handleAnnualReportCommand,
  hasCachedReport,
  deleteCachedReport,
  fetchChatData,
  fetchGroupUsers
}

