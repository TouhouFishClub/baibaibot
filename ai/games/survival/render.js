const fs = require('fs')
const MARGIN = 10
const BLOCK_SIDE = 100
const {createCanvas, loadImage} = require('canvas')

const fontFamily = 'STXIHEI'

const renderImage = async (mapOption) => {
  let width = mapOption[0].length, height = mapOption.length,
    canvasWidth = width * BLOCK_SIDE + (width + 1) * MARGIN,
    canvasHeight = height * BLOCK_SIDE + (height + 1) * MARGIN
  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.font = `14px ${fontFamily}`

  for(let y = 0; y < mapOption.length; y ++){
    for(let x = 0; x < y.length; x++){
      if(typeof mapOption[y][x] == 'object'){
        await drawImageSync(
          ctx,
          path.join(__dirname, `../../../${mapOption[y][x].qq}.png`),
          x * (MARGIN + BLOCK_SIDE) + MARGIN,
          y * (MARGIN + BLOCK_SIDE) + MARGIN,
          BLOCK_SIDE,
          BLOCK_SIDE,
        )
      }
      ctx.lineWidth = 5
      ctx.strokeStyle = '#2196f3'
      ctx.strokeRect(x * (MARGIN + BLOCK_SIDE) + MARGIN, y * (MARGIN + BLOCK_SIDE) + MARGIN, BLOCK_SIDE, BLOCK_SIDE)
    }
  }

  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  fs.writeFile(path.join(__dirname, '/tmp/image.png'), dataBuffer, function(err) {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！");
    }
  });
}

const drawImageSync = async (ctx, url, ...args) => {
  try {
    let img = await loadImage(url)
    ctx.drawImage(img, ...args)
  } catch (e) {
    console.log('==== load image error ====')
    console.log(e)
  }
}

module.exports = {
  renderImage
}