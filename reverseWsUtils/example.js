/**
 * 反向 WebSocket HTTP 接口调用示例
 * 展示如何使用 HttpApiWrapper 替代传统的 HTTP 请求
 */

const { createHttpApiWrapper } = require('./index')

// 示例：使用新的接口调用方式
async function exampleUsage() {
  const botName = '25334' // 机器人名称/端口
  const groupId = '123456789' // 群ID
  const userId = '987654321' // 用户ID

  // 创建 API 包装器实例
  const api = createHttpApiWrapper(botName)

  try {
    // 1. 获取群成员列表
    console.log('获取群成员列表...')
    const memberList = await api.getGroupMemberList(groupId)
    console.log(`群成员数量: ${memberList.length}`)

    // 2. 获取群信息
    console.log('获取群信息...')
    const groupInfo = await api.getGroupInfo(groupId)
    console.log(`群名称: ${groupInfo.group_name}`)

    // 3. 获取用户信息
    console.log('获取用户信息...')
    const userInfo = await api.getUserInfo(userId)
    console.log(`用户昵称: ${userInfo.nickname}`)

    // 4. 发送群消息
    console.log('发送群消息...')
    const sendResult = await api.sendMessage('group', groupId, '这是一条测试消息')
    console.log(`消息发送结果: ${JSON.stringify(sendResult)}`)

    // 5. 使用通用接口调用任意 API
    console.log('调用通用接口...')
    const customResult = await api.callApi('get_version_info', {})
    console.log(`版本信息: ${JSON.stringify(customResult)}`)

  } catch (error) {
    console.error('调用失败:', error)
  }
}

// 对比：传统的 HTTP 调用方式 vs 新的反向 WebSocket 方式
function comparisonExample() {
  const port = '25334'
  const groupId = '123456789'

  // ====== 传统 HTTP 方式 ======
  /*
  const http = require('http')
  const { myip } = require('../baibaiConfigs')
  
  function fetchGroupUsersOld(groupid, port) {
    return new Promise(resolve => {
      let url = `http://${myip}:${port}/get_group_member_list?group_id=${groupid}`
      http.get(url, (res) => {
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData.data);
          } catch (e) {
            console.error(e.message);
            resolve([])
          }
        });
      }).on('error', (e) => {
        console.error(`Got error: ${e.message}`);
        resolve([])
      })
    })
  }
  */

  // ====== 新的反向 WebSocket 方式 ======
  async function fetchGroupUsersNew(groupid, port) {
    const api = createHttpApiWrapper(port)
    try {
      return await api.getGroupMemberList(groupid)
    } catch (error) {
      console.error('获取群成员失败:', error)
      return []
    }
  }

  console.log('新方式更简洁，支持 async/await，有更好的错误处理')
}

module.exports = {
  exampleUsage,
  comparisonExample
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  console.log('反向 WebSocket HTTP 接口调用示例')
  console.log('==============================')
  comparisonExample()
} 