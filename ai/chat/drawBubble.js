const fs = require('fs')
const path = require('path')
const {createCanvas, loadImage} = require('canvas')

const analysisContent = content => {
  if(content.length == 2) {
    return [content, content, content, content]
  }
  if(content.split('-').length == 4) {
    return content.split('-')
  }
  return []
}

const drawBubble = (content) => {
  let alc = analysisContent(content)
  if(alc.length == 0){
    return
  }


  let canvas = createCanvas(800, 260)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, 800, 280)






  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  // sendImageMsgBuffer(dataBuffer, content, 'other', msg => {
  //   callback(msg)
  // })

  fs.writeFile(path.join(__dirname, `${content}.png`), dataBuffer, function(err) {
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