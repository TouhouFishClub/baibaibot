const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas')
const CHARACTER_CARD_WIDTH = 200
const CHARACTER_CARD_HEIGHT = 40
const TAG_WIDTH = 100
const TAG_HEIGHT = 20
const GLOBAL_MARGIN = 20
const ROW_MAX_CARD = 3


const renderImage = async data => {
  console.log('=== render image ===')
  console.log(JSON.stringify(data))
  /* 计算画布 */
  let canvasWidth = ( CHARACTER_CARD_WIDTH + GLOBAL_MARGIN ) * ROW_MAX_CARD + GLOBAL_MARGIN
  let canvasHeight =
    Object.keys(data).length * ( TAG_HEIGHT + GLOBAL_MARGIN ) +
    Object.values(data).reduce((p, c) =>
      p + Math.ceil((c[3].length + c[4].length + c[5].length + c[6].length) / 3) * ( CHARACTER_CARD_HEIGHT + GLOBAL_MARGIN ), 0) + GLOBAL_MARGIN


  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d');
  let fontFamily = 'STXIHEI'
  ctx.font = `20px ${fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(30, 30, 100, 100)
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fillText('测试文字', 0, 20, 100)

  let arr = []

  for (let oy = 0; oy < 400; oy += 100){
    for(let ox = 0; ox < 400; ox += 100){
      arr.push(drawImageSync(ctx, './test/guiguie.jpeg', ox, oy, 100, 100))
    }
  }

  await Promise.all(arr)

  // await drawImageSync(ctx, './test/timg.jpg', 0, 0, 100, 100)

  // await loadImage('./test/timg.jpg').then((image) => {
  //   console.log(image)
  //   ctx.drawImage(image, 50, 0, 70, 70)
  // })


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