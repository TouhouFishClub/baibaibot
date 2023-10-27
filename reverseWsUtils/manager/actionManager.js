const socketManager = require('./socketManager')
const deepMerge = require('../utils/deepMerge')

let actions = []

const createAction = (actionObject, port) => {
  let ws = socketManager.get(port)
  if(!ws) {
    return false
  }
  return new Promise((resolve, reject) => {
    let markedAction = deepMerge(actionObject, {
      echo: {
        action: actionObject.action,
        ts: Date.now()
      }
    })
    actions.push(deepMerge(markedAction, { resolve }))
    ws.send(JSON.stringify(markedAction))
  })
}

const responseAction = res => {
  let { data, echo } = res
  let actionIndex = actions.findIndex(action => action?.echo?.action === echo.action && action?.echo?.ts === echo.ts)
  if(actionIndex > -1) {
    let action = actions.splice(actionIndex, 1)[0]
    action.resolve(data)
  }
}

module.exports = {
  createAction,
  responseAction
}