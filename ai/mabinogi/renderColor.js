const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, registerFont} = require('canvas')

const renderColorBoard = (context, callback) => {
  let c = ''
  if(context.match(/\d{1,3}[,， ]\d{1,3}[,， ]\d{1,3}/)) {
    let cp = context.replace(/[， ]/g, ',').split(',')
    if(cp.filter(x => parseInt(x) < 256).length == 3){
      c = `rgb(${cp.join(',')})`
    }
  }
  if((context.length == 6 || context.length == 3) && context.match(/^[0-9ABCDEFabcdef]*$/)) {
    c = context.toUpperCase()
    if(c.length == 3) {
      c = c.split('').map(x => `${x}${x}`).join('')
    }
    c = `#${c}`
  }
  if(c) {
    let canvas = createCanvas(100, 20)
      , ctx = canvas.getContext('2d')
    ctx.fillStyle = `${c}`
    ctx.fillRect(0, 0, 100, 20)

    let imgData = canvas.toDataURL()
    let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
    let dataBuffer = new Buffer(base64Data, 'base64')

    sendImageMsgBuffer(dataBuffer, 'output', 'other', msg => {
      callback(msg)
    }, `${context}是这个颜色:`, 'MF')
  } else {
    callback(`${context} 输入错误`)
  }
}

module.exports = {
  renderColorBoard
}
