/**
 * 反向 WebSocket API 调用调试工具
 * 用于诊断 API 调用问题
 */

const { createHttpApiWrapper } = require('./httpApiWrapper')

/**
 * 调试群成员列表获取
 * @param {string} botName - 机器人名称
 * @param {string} groupId - 群ID
 */
async function debugGroupMemberList(botName, groupId) {
  console.log(`=== 开始调试群成员列表 ===`)
  console.log(`机器人名: ${botName}`)
  console.log(`群ID: ${groupId}`)
  console.log(`时间: ${new Date().toISOString()}`)
  
  const api = createHttpApiWrapper(botName)
  
  try {
    // 测试 1: 获取登录信息和版本信息
    console.log(`\n--- 测试 1: 基础连接测试 ---`)
    try {
      const loginInfo = await api.callApi('get_login_info', {})
      console.log(`登录信息:`, JSON.stringify(loginInfo, null, 2))
    } catch (error) {
      console.error(`获取登录信息失败:`, error.message)
    }

    try {
      const versionInfo = await api.callApi('get_version_info', {})
      console.log(`版本信息:`, JSON.stringify(versionInfo, null, 2))
    } catch (error) {
      console.error(`获取版本信息失败:`, error.message)
    }
    
    // 测试 2: 获取群信息
    console.log(`\n--- 测试 2: 获取群信息 ---`)
    const groupInfo = await api.getGroupInfo(groupId)
    console.log(`群信息:`, JSON.stringify(groupInfo, null, 2))
    
    // 测试 3: 获取群成员列表 (no_cache=true)
    console.log(`\n--- 测试 3: 获取群成员列表 (no_cache=true) ---`)
    const membersNoCache = await api.getGroupMemberList(groupId, true)
    console.log(`成员列表 (no_cache=true):`, Array.isArray(membersNoCache) ? `数组，长度: ${membersNoCache.length}` : `类型: ${typeof membersNoCache}`)
    if (Array.isArray(membersNoCache) && membersNoCache.length > 0) {
      console.log(`首个成员示例:`, JSON.stringify(membersNoCache[0], null, 2))
      
      // 测试 4: 使用第一个成员ID测试获取单个成员信息
      console.log(`\n--- 测试 4: 获取单个群成员信息 ---`)
      const firstMemberId = membersNoCache[0].user_id
      const memberInfo = await api.getGroupMemberInfo(groupId, firstMemberId, true)
      console.log(`成员信息 (user_id: ${firstMemberId}):`, JSON.stringify(memberInfo, null, 2))
    }
    
    // 测试 5: 获取群成员列表 (no_cache=false)
    console.log(`\n--- 测试 5: 获取群成员列表 (no_cache=false) ---`)
    const membersWithCache = await api.getGroupMemberList(groupId, false)
    console.log(`成员列表 (no_cache=false):`, Array.isArray(membersWithCache) ? `数组，长度: ${membersWithCache.length}` : `类型: ${typeof membersWithCache}`)
    if (Array.isArray(membersWithCache) && membersWithCache.length > 0) {
      console.log(`首个成员示例:`, JSON.stringify(membersWithCache[0], null, 2))
    }

    // 测试 6: 如果成员列表为空，尝试使用机器人自己的ID测试单个成员信息
    if ((!Array.isArray(membersNoCache) || membersNoCache.length === 0) && 
        (!Array.isArray(membersWithCache) || membersWithCache.length === 0)) {
      console.log(`\n--- 测试 6: 使用机器人ID测试单个成员信息 ---`)
      try {
        const loginInfo = await api.callApi('get_login_info', {})
        if (loginInfo && loginInfo.user_id) {
          const botMemberInfo = await api.getGroupMemberInfo(groupId, loginInfo.user_id, true)
          console.log(`机器人在群中的信息:`, JSON.stringify(botMemberInfo, null, 2))
        }
      } catch (error) {
        console.error(`测试机器人成员信息失败:`, error.message)
      }

      // 尝试一些常见的测试用户ID
      console.log(`\n--- 测试 7: 尝试已知用户ID ---`)
      const testUserIds = ['10000', '1000000', botName] // 一些可能的测试ID
      for (const testUserId of testUserIds) {
        try {
          const testMemberInfo = await api.getGroupMemberInfo(groupId, testUserId, true)
          console.log(`测试用户 ${testUserId} 信息:`, JSON.stringify(testMemberInfo, null, 2))
          if (testMemberInfo && Object.keys(testMemberInfo).length > 0) {
            break // 如果找到了有效用户就停止
          }
        } catch (error) {
          console.log(`测试用户 ${testUserId} 失败: ${error.message}`)
        }
      }
    }
    
  } catch (error) {
    console.error(`调试过程中发生错误:`, error)
    console.error(`错误堆栈:`, error.stack)
  }
  
  console.log(`\n=== 调试完成 ===`)
}

/**
 * 调试特定 API 调用
 * @param {string} botName - 机器人名称
 * @param {string} action - API 动作
 * @param {Object} params - 参数
 */
async function debugApiCall(botName, action, params = {}) {
  console.log(`=== 调试 API 调用 ===`)
  console.log(`机器人名: ${botName}`)
  console.log(`动作: ${action}`)
  console.log(`参数:`, JSON.stringify(params, null, 2))
  
  const api = createHttpApiWrapper(botName)
  
  try {
    const result = await api.callApi(action, params)
    console.log(`调用结果:`, JSON.stringify(result, null, 2))
    console.log(`结果类型:`, typeof result)
    if (Array.isArray(result)) {
      console.log(`数组长度:`, result.length)
    }
  } catch (error) {
    console.error(`API 调用失败:`, error)
    console.error(`错误堆栈:`, error.stack)
  }
  
  console.log(`=== 调试完成 ===`)
}

/**
 * 比较反向 WebSocket 和 HTTP 调用结果
 * @param {string} botName - 机器人名称
 * @param {string} groupId - 群ID
 */
async function compareApiMethods(botName, groupId) {
  console.log(`=== 比较 API 调用方法 ===`)
  
  // 反向 WebSocket 方式
  console.log(`\n--- 反向 WebSocket 方式 ---`)
  try {
    const api = createHttpApiWrapper(botName)
    const wsResult = await api.getGroupMemberList(groupId, true)
    console.log(`WS 结果:`, Array.isArray(wsResult) ? `数组，长度: ${wsResult.length}` : `类型: ${typeof wsResult}`)
  } catch (error) {
    console.error(`WS 调用失败:`, error.message)
  }
  
  // HTTP 方式（模拟）
  console.log(`\n--- HTTP 方式对比 ---`)
  const http = require('http')
  const { myip } = require('../baibaiConfigs')
  
  return new Promise(resolve => {
    let url = `http://${myip}:${botName}/get_group_member_list?group_id=${groupId}`
    console.log(`HTTP URL: ${url}`)
    
    http.get(url, (res) => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          console.log(`HTTP 结果:`, Array.isArray(parsedData.data) ? `数组，长度: ${parsedData.data.length}` : `类型: ${typeof parsedData.data}`)
          resolve()
        } catch (e) {
          console.error(`HTTP 解析失败:`, e.message);
          resolve()
        }
      });
    }).on('error', (e) => {
      console.error(`HTTP 请求失败:`, e.message);
      resolve()
    })
  })
}

module.exports = {
  debugGroupMemberList,
  debugApiCall,
  compareApiMethods
}

// 如果直接运行此文件，执行调试
if (require.main === module) {
  const botName = process.argv[2] || '25334'
  const groupId = process.argv[3] || '584155191'
  
  console.log('使用方法: node debugApiCalls.js [botName] [groupId]')
  console.log(`当前参数: botName=${botName}, groupId=${groupId}`)
  
  debugGroupMemberList(botName, groupId).then(() => {
    process.exit(0)
  }).catch(error => {
    console.error('调试失败:', error)
    process.exit(1)
  })
} 