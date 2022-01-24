const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, registerFont} = require('canvas')

const renderColorBoard = (context, callback) => {
  if((context.length == 6 || context.length == 3) && context.match(/^[0-9ABCDEFabcdef]*$/)) {
    let c = context.toUpperCase()
    if(c.length == 3) {
      c = c.split('').map(x => `${x}${x}`).join('')
    }


    let canvas = createCanvas(100, 20)
      , ctx = canvas.getContext('2d')
    ctx.fillStyle = `#${c}`
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
