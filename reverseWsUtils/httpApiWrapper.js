const { createAction } = require('./manager/actionManager')

/**
 * 反向 WebSocket 下的通用 HTTP 接口调用封装
 * 提供类似传统 HTTP 调用的接口，内部使用 createAction 实现
 */
class HttpApiWrapper {
  constructor(botName) {
    this.botName = botName
  }

  /**
   * 获取群成员信息（单个成员）
   * @param {string|number} groupId - 群ID  
   * @param {string|number} userId - 用户ID
   * @param {boolean} noCache - 是否不使用缓存，默认 false
   * @returns {Promise<Object>} 群成员信息
   */
  async getGroupMemberInfo(groupId, userId, noCache = false) {
    try {
      // 确保 ID 是数字类型
      const numericGroupId = parseInt(groupId)
      const numericUserId = parseInt(userId)
      
      if (isNaN(numericGroupId)) {
        throw new Error(`无效的群ID: ${groupId}`)
      }
      if (isNaN(numericUserId)) {
        throw new Error(`无效的用户ID: ${userId}`)
      }

      const actionParams = {
        "action": "get_group_member_info",
        "params": {
          "group_id": numericGroupId,
          "user_id": numericUserId,
          "no_cache": noCache
        }
      }

      const response = await createAction(actionParams, this.botName)
      
      return response || {}
    } catch (error) {
      console.error(`获取群成员信息失败 [群ID: ${groupId}, 用户ID: ${userId}]:`, error.message)
      return {}
    }
  }

  /**
   * 获取群成员列表
   * @param {string|number} groupId - 群ID
   * @param {boolean} noCache - 是否不使用缓存，默认 false
   * @returns {Promise<Array>} 群成员列表
   */
  async getGroupMemberList(groupId, noCache = false) {
    try {
      // 确保 groupId 是数字类型（根据 Lagrange.OneBot 文档）
      const numericGroupId = parseInt(groupId)
      if (isNaN(numericGroupId)) {
        throw new Error(`无效的群ID: ${groupId}`)
      }

      const actionParams = {
        "action": "get_group_member_list",
        "params": {
          "group_id": numericGroupId,
          "no_cache": noCache
        }
      }

      const response = await createAction(actionParams, this.botName)
      
      return response || []
    } catch (error) {
      console.error(`获取群成员列表失败 [群ID: ${groupId}]:`, error.message)
      return []
    }
  }

  /**
   * 获取群信息
   * @param {string} groupId - 群ID
   * @returns {Promise<Object>} 群信息
   */
  async getGroupInfo(groupId) {
    try {
      const data = await createAction({
        "action": "get_group_info",
        "params": {
          "group_id": groupId
        }
      }, this.botName)
      
      return data || {}
    } catch (error) {
      console.error(`获取群信息失败 [群ID: ${groupId}]:`, error.message)
      return {}
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @param {boolean} noCache - 是否不使用缓存
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(userId, noCache = false) {
    try {
      const data = await createAction({
        "action": "get_stranger_info",
        "params": {
          "user_id": userId,
          "no_cache": noCache
        }
      }, this.botName)
      
      return data || {}
    } catch (error) {
      console.error(`获取用户信息失败 [用户ID: ${userId}]:`, error.message)
      return {}
    }
  }

  /**
   * 发送消息
   * @param {string} messageType - 消息类型 (private/group)
   * @param {string} targetId - 目标ID (用户ID或群ID)
   * @param {string} message - 消息内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendMessage(messageType, targetId, message) {
    try {
      const params = {
        "message_type": messageType,
        "message": message
      }
      
      if (messageType === 'group') {
        params.group_id = targetId
      } else {
        params.user_id = targetId
      }

      const data = await createAction({
        "action": "send_msg",
        "params": params
      }, this.botName)
      
      return data || {}
    } catch (error) {
      console.error(`发送消息失败 [类型: ${messageType}, 目标: ${targetId}]:`, error.message)
      return {}
    }
  }

  /**
   * 通用接口调用方法
   * @param {string} action - 接口动作名
   * @param {Object} params - 参数对象
   * @returns {Promise<any>} 调用结果
   */
  async callApi(action, params = {}) {
    try {
      const data = await createAction({
        "action": action,
        "params": params
      }, this.botName)
      
      return data
    } catch (error) {
      console.error(`API 调用失败 [动作: ${action}]:`, error.message)
      throw error
    }
  }
}

/**
 * 创建 HTTP API 包装器实例
 * @param {string} botName - 机器人名称/端口
 * @returns {HttpApiWrapper} API 包装器实例
 */
function createHttpApiWrapper(botName) {
  return new HttpApiWrapper(botName)
}

module.exports = {
  HttpApiWrapper,
  createHttpApiWrapper
} 