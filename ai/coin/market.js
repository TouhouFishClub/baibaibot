const fs = require('fs'),
  path = require('path'),
  Canvas = require('canvas'),
  { sendImageMsgBuffer } = require(path.join(__dirname, '../../cq/sendImage.js')),
  { getCoinMarket } = require(path.join(__dirname, '../push.js'))
// const gm = require('gm')
// let imageMagick = gm.subClass({ imageMagick : true });

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
const renderText = (ctx, textArr, topMargin, leftMargin, lineHeight) => {
  textArr.forEach((text, index) => {
    ctx.fillText(text, leftMargin, topMargin + lineHeight * (index + 1))
  })
}

const MAX_WIDTH=350;

module.exports = function(callback){
  getCoinMarket(data => {
    console.log(data)
    let canvasTmp = new Canvas(400, 2000)
      , ctxTmp = canvasTmp.getContext('2d');
    let fontFamily = 'DFGirl'
    ctxTmp.font = `20px ${fontFamily}`;
    /* 预处理币种，美元，人民币 */
    let typeMaxWidth = 0, usdMaxWidth = 0, cnyMaxWidth = 0
    data.forEach(val => {
      if(ctxTmp.measureText(val.type).width > typeMaxWidth){
        typeMaxWidth = ctxTmp.measureText(val.type).width
      }
      if(ctxTmp.measureText(val.usd).width > usdMaxWidth){
        usdMaxWidth = ctxTmp.measureText(`$ ${val.usd}`).width
      }
      if(ctxTmp.measureText(val.cny).width > cnyMaxWidth){
        cnyMaxWidth = ctxTmp.measureText(`￥ ${val.cny}`).width
      }
    })
    let canvasWidth = typeMaxWidth + usdMaxWidth + cnyMaxWidth + 80
    console.log(canvasWidth)
    let cavasHeight = data.length * 25 + 40

    let canvas = new Canvas(canvasWidth, cavasHeight)
      , ctx = canvas.getContext('2d')

    ctx.font = `20px ${fontFamily}`
    ctx.fillStyle = 'rgba(0,0,20,0.9)'
    ctx.fillRect(0, 0, canvasWidth, cavasHeight)

    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'

    renderText(ctx, data.map(val => val.type), 20, 20, 25)
    renderText(ctx, data.map(val => `$ ${val.usd}`), 20, 40 + typeMaxWidth, 25)
    renderText(ctx, data.map(val => `￥ ${val.cny}`), 20, 60 + typeMaxWidth + usdMaxWidth, 25)


    let imgData = canvas.toDataURL()
    let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
    let dataBuffer = new Buffer(base64Data, 'base64')




    fs.writeFile(path.join(__dirname, '../../test/image.png'), dataBuffer, function(err) {
      if(err){
        console.log(err)
      }else{
        console.log("保存成功！");
      }
    });
  }, false, true)


}
