const fs = require('fs')
const path = require('path')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, loadImage} = require('canvas')


// http://q1.qlogo.cn/g?b=qq&nk=${msg.uid}&s=100

const MAX_WIDTH = 800
const fontFamily = 'STXIHEI'

const analysisContent = content => {
  if(content.length <= 3) {
    return [content, content, content, content]
  }
  let sp = content.split('#').map(x => x.trim())
  if(sp.length == 2) {
    return [sp[0], sp[0], sp[0], sp[1]]
  }
  if(sp.length == 4) {
    return sp
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


const drawBubble = async (content, callback) => {

  let cnt, cntNew = [], imgHash = {}, count = 0
  cnt = content.split('[CQ:image,')
  cnt.forEach(cn => {
    let index = cn.indexOf('url=')
    if(index > -1) {
      let tmp = cn.substring(index + 4).split(']')
      imgHash[`Image__Tmp__${count}`] = {
        source : tmp[0],
        width: 0,
        height: 0,
      }
      tmp[0] = `Image__Tmp__${count}`
      count ++
      cntNew = cntNew.concat(tmp)
    } else {
      cntNew.push(cn)
    }
  })

  // 处理图片
  let key = Object.keys(imgHash), mw = 0, hc = 0
  for(let i = 0; i < key.length; i++){
    let img = await loadImage(imgHash[key[i]].source)
    imgHash[key[i]].img = img
    let w = img.width, h = img.height
    if(Math.max(w, h) > 400){
      if(w > h) {
        h = h * 400 / w
        w = 400
      } else {
        w = w * 400 / h
        h = 400
      }
    }
    imgHash[key[i]].width = w
    imgHash[key[i]].height = h
    mw = Math.max(mw, w)
    hc += h
  }

  // console.log(imgHash)

  let alc = analysisContent(cntNew.join('\n'))
  if(alc.length == 0){
    return
  }
  let canvasTmp = createCanvas(400, 2000)
    , ctxTmp = canvasTmp.getContext('2d');
  let canvasWidth, canvasHeight
  ctxTmp.font = `40px ${fontFamily}`

  let msg = alc[3]
  let msgSp = msg.split('\n')
  let maxLengthMsg = msgSp.concat([]).filter(x => !x.startsWith('Image__Tmp__')).sort((a, b) => b.length - a.length)[0]

  if(ctxTmp.measureText(maxLengthMsg).width < MAX_WIDTH - 270) {
    canvasWidth = 270 + ctxTmp.measureText(maxLengthMsg).width
  } else {
    canvasWidth = MAX_WIDTH
  }

  canvasWidth = Math.max(canvasWidth, mw)

  let newMsg = []
  canvasHeight = 190
  msgSp.forEach(msg => {
    if(msg.startsWith('Image__Tmp__')){
      newMsg = newMsg.concat([msg])
      canvasHeight += imgHash[msg].height
    } else {
      let check = checkMaxWidth(ctxTmp, msg, canvasWidth - 270)
      newMsg = newMsg.concat(check)
      canvasHeight += check.length * 52
    }
  })

  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d')

  /* avatar */
  if(/^\d+$/.test(alc[0]) && alc[0].length > 4) {
    ctx.arc(70, 70, 50, 0, Math.PI * 2, false)
    ctx.fillStyle = '#e1e1e1'
    ctx.fill()
    try {
      let img = await loadImage(`http://q1.qlogo.cn/g?b=qq&nk=${alc[0]}&s=100`)

      // console.log('=====')
      // console.log(img.width)
      // console.log(img.height)

      ctx.globalCompositeOperation = 'source-in'
      ctx.drawImage(img, 20, 20, 100, 100)
      ctx.globalCompositeOperation = 'source-over'
    } catch (e) {
      console.log('==== load image error ====')
    }
  } else {
    let avtMsg = alc[0]
    if(alc[0].length > 3) {
      avtMsg = alc[0].substring(0, 3)
    }
    renderRadiusRect(ctx, 20, 20 , 100, 100, 50, '#e1e1e1', true)
    let fontsize = 40
    if(avtMsg.length == 3) {
      fontsize = 30
    }
    renderText(ctx, avtMsg, 50, 20, 100, fontsize, 40, '#000', 'center')
  }

  /* bg */
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = 'rgba(245,245,245,1)'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.globalCompositeOperation = 'source-over'

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
    if(msg.startsWith('Image__Tmp__')) {
      let tmp = imgHash[msg]
      ctx.drawImage(tmp.img, 210, offsetTop, tmp.width, tmp.height)
      offsetTop += tmp.height
    } else {
      renderText(ctx, msg, offsetTop, 210, canvasWidth - 270, 40, 52, '#000', 'left')
      offsetTop += 52
    }
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



  // sendImageMsgBuffer(dataBuffer, 'output', 'other', msg => {
  //   callback(msg)
  // })

  fs.writeFile(path.join(__dirname, `${"output" || content}.png`), dataBuffer, function(err) {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！");
    }
  });
}


module.exports = {
  drawBubble,
}