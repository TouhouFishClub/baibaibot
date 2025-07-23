const socketManager = require('./socketManager')
const deepMerge = require('../utils/deepMerge')

let actions = []

const createAction = (actionObject, bot_name) => {
  let ws = socketManager.get(bot_name)
  if(!ws) {
    console.error(`[ActionManager] WebSocket 连接未找到: ${bot_name}`)
    return Promise.reject(new Error(`WebSocket 连接未找到: ${bot_name}`))
  }
  return new Promise((resolve, reject) => {
    let markedAction = deepMerge(actionObject, {
      echo: {
        action: actionObject.action,
        ts: Date.now()
      }
    })
    actions.push(deepMerge(markedAction, { resolve, reject }))
    console.log(`[ActionManager] 发送动作 [${bot_name}]: ${JSON.stringify(markedAction)}`)
    ws.send(JSON.stringify(markedAction))
  })
}

const responseAction = res => {
  console.log(`[ActionManager] 收到响应: ${JSON.stringify(res)}`)
  
  let { status, retcode, data, echo } = res
  
  if (!echo || !echo.action || !echo.ts) {
    console.warn(`[ActionManager] 响应缺少 echo 信息:`, res)
    return
  }
  
  let actionIndex = actions.findIndex(action => 
    action?.echo?.action === echo.action && action?.echo?.ts === echo.ts
  )
  
  if (actionIndex === -1) {
    console.warn(`[ActionManager] 未找到对应的动作: ${echo.action} @ ${echo.ts}`)
    return
  }
  
  let action = actions.splice(actionIndex, 1)[0]
  
  // 根据 Lagrange.OneBot 文档检查响应状态
  if (status === 'ok' && retcode === 0) {
    console.log(`[ActionManager] 动作成功: ${echo.action}`)
    action.resolve(data)
  } else {
    console.warn(`[ActionManager] 动作失败: ${echo.action}, status: ${status}, retcode: ${retcode}`)
    const error = new Error(`API 调用失败: ${echo.action}, status: ${status}, retcode: ${retcode}`)
    error.status = status
    error.retcode = retcode
    error.data = data
    
    // 对于某些可预期的错误，提供更友好的处理
    if (retcode === 404) {
      console.warn(`[ActionManager] 资源未找到 (404): ${echo.action}`)
    } else if (retcode === 1403) {
      console.warn(`[ActionManager] 权限不足 (1403): ${echo.action}`)
    } else if (retcode === 1404) {
      console.warn(`[ActionManager] 群/用户不存在 (1404): ${echo.action}`)
    }
    
    action.reject(error)
  }
}

module.exports = {
  createAction,
  responseAction
}