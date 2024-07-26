const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, registerFont} = require('canvas')
const { createColorForCode } = require('./color/switchColor')
const _ = require('lodash')

const renderColorBoard = async (context, callback) => {
  let c = '', rgb = '', hex = ''
  // RGB
  if(context.match(/\d{1,3}[,， ]\d{1,3}[,， ]\d{1,3}/)) {
    let cp = context.replace(/[， ]/g, ',').split(',')
    if(cp.filter(x => parseInt(x) < 256).length == 3){
      rgb = `${cp.join(',')}`
      hex = `#${cp.map(x => `${x < 16 ? '0': ''}${parseInt(x).toString(16)}`).join('').toUpperCase()}`
      c = `rgb(${cp.join(',')})`
    }
  }
  // HEX
  if((context.length == 6 || context.length == 3) && context.match(/^[0-9ABCDEFabcdef]*$/)) {
    c = context.toUpperCase()
    if(c.length == 3) {
      c = c.split('').map(x => `${x}${x}`).join('')
    }
    hex = `#${c.toUpperCase()}`
    rgb = _.chunk(c.split(''), 2).map(x => `${parseInt(x.join(''), 16)}`).join(',')
    c = `#${c}`
  }
  if(context.length == 8 && context.match(/^[0-9ABCDEFabcdef]*$/)) {
    // MABINOGI SWITCH COLOR
    const res = await createColorForCode(context)
    callback(res)
    return
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
    }, `${context}是这个颜色:\nRGB: ${rgb}\nHEX: ${hex}`, 'MF')
  } else {
    callback(`${context} 输入错误`)
  }
}

module.exports = {
  renderColorBoard
}
