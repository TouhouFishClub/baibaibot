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
    ws.send(markedAction)
  })
}

const responseAction = data => {

}