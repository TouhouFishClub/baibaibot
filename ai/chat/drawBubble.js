const fs = require('fs')
const path = require('path')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, loadImage} = require('canvas')

const MAX_WIDTH = 800
const fontFamily = 'STXIHEI'

const analysisContent = content => {
  if(content.length == 2) {
    return [content, content, content, content]
  }
  if(content.split('-').length == 4) {
    return content.split('-')
  }
  return []
}


const renderRadiusRect = (ctx, left, top, width, height, radius, color = '#000', fill = false) => {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.moveTo(left + radius, top)
  ctx.lineTo(left + width - radius, top)
  ctx.arcTo(left + width, top, left + width, top + radius, radius)
  ctx.lineTo(left + width, top + height - radius)
  ctx.arcTo(left + width, top + height, left + width - radius, top + height, radius)
  ctx.lineTo(left + radius, top + height)
  ctx.arcTo(left, top + height, left, top + height - radius, radius)
  ctx.lineTo(left, top + radius)
  ctx.arcTo(left, top, left + radius, top, radius)

  ctx.stroke()
  if(fill) {
    ctx.fillStyle = color
    ctx.fill()
  }
}

const renderText = (ctx, msg, offsetTop, offsetLeft, width, fontSize, lineHeight, color = '#000', textAlign = 'left') => {
  ctx.fillStyle = color
  // ctx.strokeStyle = '#f00'
  // ctx.lineWidth = 1
  // ctx.strokeRect(offsetLeft, offsetTop, width, lineHeight)

  ctx.font = `${fontSize}px ${fontFamily}`
  let tx, ty
  tx = offsetLeft
  switch (textAlign) {
    case 'left':
      break
    case 'right':
      tx += width - ctx.measureText(msg).width
      break
    case 'center':
      tx += (width - ctx.measureText(msg).width) / 2
      break
  }
  ty = offsetTop + fontSize + (lineHeight - fontSize) / 2 - 6
  ctx.fillText(msg, tx, ty)
}

const checkMaxWidth = (ctx, str, maxWidth) => {
  let start = 0, splitArr = []
  for(let i = 1; i < str.length; i++){
    if(ctx.measureText(str.substring(start, i)).width > maxWidth){
      splitArr.push(str.substring(start, i - 1))
      start = i - 1
    }
  }
  splitArr.push(str.substring(start))
  return splitArr
}


const drawBubble = (content, callback) => {
  let alc = analysisContent(content)
  if(alc.length == 0){
    return
  }
  let canvasTmp = createCanvas(400, 2000)
    , ctxTmp = canvasTmp.getContext('2d');
  let canvasWidth, canvasHeight
  ctxTmp.font = `40px ${fontFamily}`

  let msg = alc[3]
  let msgSp = msg.split('\n')
  let maxLengthMsg = msgSp.concat([]).sort((a, b) => b.length - a.length)[0]

  if(ctxTmp.measureText(maxLengthMsg).width < MAX_WIDTH - 270) {
    canvasWidth = 270 + ctxTmp.measureText(maxLengthMsg).width
  } else {
    canvasWidth = MAX_WIDTH
  }
  let newMsg = []
  msgSp.forEach(msg => {
    newMsg = newMsg.concat(checkMaxWidth(ctxTmp, msg, canvasWidth - 270))
  })
  canvasHeight = newMsg.length * 52 + 190

  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(245,245,245,1)'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  /* avatar */
  renderRadiusRect(ctx, 20, 20 , 100, 100, 50, '#e1e1e1', true)
  let fontsize = 40
  if(alc[0].length == 3) {
    fontsize = 30
  }
  renderText(ctx, alc[0], 50, 20, 100, fontsize, 40, '#000', 'center')

  /* badge */
  ctxTmp.font = `32px ${fontFamily}`
  let badgeWidth = ctxTmp.measureText(alc[1]).width + 30
  renderRadiusRect(ctx, 145, 20, badgeWidth, 45, 8, 'rgb(111,216,160)', true)
  renderText(ctx, alc[1], 20, 145, badgeWidth, 32, 45, '#fff', 'center')

  /* nick */
  renderText(ctx, alc[2], 20, 145 + badgeWidth + 10, 300, 32, 45, '#838383')


  /* content */
  renderRadiusRect(ctx, 170, 90, canvasWidth - 190, canvasHeight - 110, 40, '#fff', true)
  let offsetTop = 130
  newMsg.forEach(msg => {
    renderText(ctx, msg, offsetTop, 210, canvasWidth - 270, 40, 52, '#000', 'left')
    offsetTop += 52
  })


  ctx.beginPath()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.moveTo(170, 130)
  ctx.lineTo(140, 120)
  ctx.lineTo(170, 160)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.fill()


  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')



  sendImageMsgBuffer(dataBuffer, 'output', 'other', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, `${"output" || content}.png`), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });
}


module.exports = {
  drawBubble,
}