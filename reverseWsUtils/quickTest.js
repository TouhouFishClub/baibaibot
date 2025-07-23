/**
 * 快速测试工具 - 专门用于诊断群成员列表问题
 */

const { createHttpApiWrapper } = require('./index')

async function quickTestGroupMembers(botName = '25334', groupId = '584155191') {
  console.log(`=== 快速测试群成员列表 ===`)
  console.log(`时间: ${new Date().toISOString()}`)
  console.log(`机器人: ${botName}`)
  console.log(`群ID: ${groupId}`)
  
  const api = createHttpApiWrapper(botName)
  
  // 1. 测试基础连接
  console.log(`\n1. 测试基础连接...`)
  try {
    const version = await api.callApi('get_version_info')
    console.log(`✓ 连接正常，版本:`, version?.app_name || '未知')
  } catch (error) {
    console.log(`✗ 连接失败:`, error.message)
    return
  }

  // 2. 获取机器人信息
  console.log(`\n2. 获取机器人信息...`)
  let botUserId = null
  try {
    const login = await api.callApi('get_login_info')
    botUserId = login?.user_id
    console.log(`✓ 机器人ID: ${botUserId}`)
  } catch (error) {
    console.log(`✗ 获取机器人信息失败:`, error.message)
  }

  // 3. 测试群信息
  console.log(`\n3. 测试群信息...`)
  try {
    const groupInfo = await api.getGroupInfo(groupId)
    if (groupInfo && groupInfo.group_name) {
      console.log(`✓ 群名称: ${groupInfo.group_name}`)
      console.log(`✓ 群成员数: ${groupInfo.member_count || '未知'}`)
    } else {
      console.log(`✗ 群信息异常:`, groupInfo)
    }
  } catch (error) {
    console.log(`✗ 获取群信息失败:`, error.message)
  }

  // 4. 直接测试群成员列表接口
  console.log(`\n4. 测试群成员列表接口...`)
  
  console.log(`  4a. 测试 no_cache=true`)
  try {
    const result1 = await api.callApi('get_group_member_list', {
      group_id: parseInt(groupId),
      no_cache: true
    })
    console.log(`✓ 直接调用结果 (no_cache=true):`, Array.isArray(result1) ? `数组长度 ${result1.length}` : `类型 ${typeof result1}`)
    if (Array.isArray(result1) && result1.length > 0) {
      console.log(`  首个成员: ${JSON.stringify(result1[0])}`)
    }
  } catch (error) {
    console.log(`✗ 直接调用失败 (no_cache=true):`, error.message)
  }

  console.log(`  4b. 测试 no_cache=false`)
  try {
    const result2 = await api.callApi('get_group_member_list', {
      group_id: parseInt(groupId),
      no_cache: false
    })
    console.log(`✓ 直接调用结果 (no_cache=false):`, Array.isArray(result2) ? `数组长度 ${result2.length}` : `类型 ${typeof result2}`)
  } catch (error) {
    console.log(`✗ 直接调用失败 (no_cache=false):`, error.message)
  }

  // 5. 如果机器人ID可用，测试单个成员信息
  if (botUserId) {
    console.log(`\n5. 测试机器人自身成员信息...`)
    try {
      const botInfo = await api.getGroupMemberInfo(groupId, botUserId, true)
      if (botInfo && Object.keys(botInfo).length > 0) {
        console.log(`✓ 机器人在群中的信息:`, JSON.stringify(botInfo))
      } else {
        console.log(`✗ 机器人不在群中或无权限`)
      }
    } catch (error) {
      console.log(`✗ 获取机器人成员信息失败:`, error.message)
    }
  }

  // 6. 测试包装器方法
  console.log(`\n6. 测试包装器方法...`)
  try {
    const members = await api.getGroupMemberList(groupId, true)
    console.log(`✓ 包装器方法结果:`, Array.isArray(members) ? `数组长度 ${members.length}` : `类型 ${typeof members}`)
  } catch (error) {
    console.log(`✗ 包装器方法失败:`, error.message)
  }

  console.log(`\n=== 测试完成 ===`)
}

// 如果直接运行
if (require.main === module) {
  const botName = process.argv[2] || '25334'
  const groupId = process.argv[3] || '584155191'
  
  quickTestGroupMembers(botName, groupId).catch(console.error)
}

module.exports = { quickTestGroupMembers } 