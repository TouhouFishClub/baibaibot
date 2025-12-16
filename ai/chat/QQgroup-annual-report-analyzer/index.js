/**
 * QQ群聊年度报告生成器 - Node.js版本
 * 主入口文件
 */

const path = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl, IMAGE_DATA } = require('../../../baibaiConfigs')
const ChatAnalyzer = require('./analyzer')
const { generateImage } = require('./imageGenerator')

// 机器人ID，排除统计
const BOT_IDS = new Set([981069482, 3291864216, 1840239061, 2771362647, 384901015])

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
    const groupCountModule = require('../groupCount')
    // 直接使用 groupCount 模块的方法，但我们需要从 reverseWsUtils 获取
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
    client = await MongoClient.connect(mongourl, { useUnifiedTopology: true })
    const db = client.db('db_bot')
    const collection = db.collection('cl_chat')
    
    const query = {
      gid: groupId,
      _id: {
        $gte: startDate,
        $lte: endDate
      }
    }
    
    const messages = await collection.find(query).sort({ _id: 1 }).toArray()
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
 * 生成年度报告
 * @param {Object} options 配置选项
 * @param {number} options.groupId 群ID
 * @param {string} options.port 端口号
 * @param {string} options.groupName 群名称（可选）
 * @param {Date} options.startDate 开始日期
 * @param {Date} options.endDate 结束日期
 * @returns {Promise<string>} 生成的图片CQ码
 */
async function generateAnnualReport(options) {
  const { groupId, port, groupName, startDate, endDate } = options
  
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
  
  // 过滤机器人消息
  messages = messages.filter(msg => !BOT_IDS.has(msg.uid))
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
  
  // 5. 生成图片
  console.log('🖼️ 生成图片报告...')
  const outputFileName = `annual_report_${groupId}_${Date.now()}.png`
  const outputPath = path.join(IMAGE_DATA, 'other', outputFileName)
  
  await generateImage(jsonData, outputPath)
  
  // 返回CQ码格式的图片消息
  const imgMsg = `[CQ:image,file=${path.join('send', 'other', outputFileName)}]`
  
  console.log('✅ 年度报告生成完成!')
  return imgMsg
}

/**
 * 处理年度报告命令
 * @param {number} groupId 群ID
 * @param {number} userId 用户ID
 * @param {string} port 端口号
 * @param {Function} callback 回调函数
 * @param {string} groupName 群名称（可选）
 */
async function handleAnnualReportCommand(groupId, userId, port, callback, groupName = null) {
  // 权限检查：只有管理员799018865可以使用
  const ADMIN_ID = 799018865
  if (userId !== ADMIN_ID) {
    // 非管理员不回复任何信息
    return
  }
  
  try {
    callback('📊 正在生成年度报告，请稍候...')
    
    // 设置时间范围（2025年12月，用于测试）
    // 正式使用时改为2025年全年
    const startDate = new Date('2025-12-01T00:00:00+08:00')
    const endDate = new Date('2025-12-31T23:59:59+08:00')
    
    // 如果要生成全年报告，使用以下日期：
    // const startDate = new Date('2025-01-01T00:00:00+08:00')
    // const endDate = new Date('2025-12-31T23:59:59+08:00')
    
    const imgMsg = await generateAnnualReport({
      groupId,
      port,
      groupName,
      startDate,
      endDate
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
  fetchChatData,
  fetchGroupUsers
}

