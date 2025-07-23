const socketManager = require('./socketManager')
const deepMerge = require('../utils/deepMerge')

let actions = []

const createAction = (actionObject, bot_name) => {
  let ws = socketManager.get(bot_name)
  if(!ws) {
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
    ws.send(JSON.stringify(markedAction))
  })
}

const responseAction = res => {
  let { status, retcode, data, echo } = res
  
  if (!echo || !echo.action || !echo.ts) {
    return
  }
  
  let actionIndex = actions.findIndex(action => 
    action?.echo?.action === echo.action && action?.echo?.ts === echo.ts
  )
  
  if (actionIndex === -1) {
    return
  }
  
  let action = actions.splice(actionIndex, 1)[0]
  
  // 根据 Lagrange.OneBot 文档检查响应状态
  if (status === 'ok' && retcode === 0) {
    action.resolve(data)
  } else {
    const error = new Error(`API 调用失败: ${echo.action}, status: ${status}, retcode: ${retcode}`)
    error.status = status
    error.retcode = retcode
    error.data = data
    action.reject(error)
  }
}

module.exports = {
  createAction,
  responseAction
}