const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas')

const renderImage = async () => {
  let canvas = createCanvas(400, 400)
    , ctx = canvas.getContext('2d');
  let fontFamily = 'STXIHEI'
  ctx.font = `20px ${fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(30, 30, 100, 100)
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fillText('测试文字', 0, 20, 100)

  await loadImage('./test/timg.jpg').then((image) => {
    console.log(image)
    ctx.drawImage(image, 50, 0, 70, 70)
  })


  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  fs.writeFile(path.join(__dirname, '/test/image.png'), dataBuffer, function(err) {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！");
    }
  });
}


module.exports = {
  renderImage
}