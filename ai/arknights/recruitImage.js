const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas')
const _ = require('lodash')

const CHARACTER_CARD_WIDTH = 200
const CHARACTER_CARD_HEIGHT = 40
const TAG_WIDTH = 120
const TAG_HEIGHT = 32
const GLOBAL_MARGIN = 20
const INSET_MARGIN = 10
const ROW_MAX_CARD = 3


const renderImage = async data => {
  console.log('=== render image ===')
  console.log(JSON.stringify(data))
  /* 计算画布 */
  let canvasWidth = ( CHARACTER_CARD_WIDTH + INSET_MARGIN ) * ROW_MAX_CARD - INSET_MARGIN + 2 * GLOBAL_MARGIN
  let canvasHeight =
    Object.keys(data).length * ( TAG_HEIGHT + INSET_MARGIN ) +
    Object.values(data).reduce((p, c) =>
      p + Math.ceil((c[3].length + c[4].length + c[5].length + c[6].length) / 3) * ( CHARACTER_CARD_HEIGHT + INSET_MARGIN ), 0) - INSET_MARGIN + 2 * GLOBAL_MARGIN

  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d');
  let fontFamily = 'STXIHEI'
  ctx.font = `14px ${fontFamily}`

  let offsetTop = GLOBAL_MARGIN, offsetLeft = GLOBAL_MARGIN

  // _.forEach(Object.keys(data), async tagGroup => {
  //   offsetTop = await renderTagGroup(ctx, offsetTop, data, tagGroup)
  // })
  let keys = Object.keys(data)
  for(let i = 0; i < keys.length; i++){
    console.log('=========')
    console.log(offsetTop)
    let tagGroup = keys[i]
    renderTags(ctx, offsetTop, tagGroup.split(' + '))
    offsetTop += TAG_HEIGHT + INSET_MARGIN
    let allData = [].concat(data[tagGroup][3], data[tagGroup][4], data[tagGroup][5], data[tagGroup][6])
    await renderCharacters(ctx, offsetTop, allData)
    offsetTop += (CHARACTER_CARD_HEIGHT + INSET_MARGIN) * (Math.ceil(allData.length / ROW_MAX_CARD))
  }



  // ctx.fillStyle = 'rgba(255,255,255,1)'
  // ctx.fillRect(30, 30, 100, 100)
  // ctx.fillStyle = 'rgba(0,0,0,1)'
  // ctx.fillText('测试文字', 0, 20, 100)
  //
  // let arr = []
  //
  // for (let oy = 0; oy < 400; oy += 100){
  //   for(let ox = 0; ox < 400; ox += 100){
  //     arr.push(drawImageSync(ctx, './test/guiguie.jpeg', ox, oy, 100, 100))
  //   }
  // }
  //
  // await Promise.all(arr)

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

const renderCharacters = async (ctx, offsetTop, characters) => {
  for(let i = 0; i < characters.length; i++) {
    await renderCharacter(
      ctx,
      offsetTop + parseInt(i / ROW_MAX_CARD) * (CHARACTER_CARD_HEIGHT + INSET_MARGIN),
      GLOBAL_MARGIN + (i % ROW_MAX_CARD) * (CHARACTER_CARD_WIDTH + INSET_MARGIN),
      characters[i]
    )
  }
}

const renderCharacter = async (ctx, offsetTop, offsetLeft, character) => {
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fillRect(offsetLeft, offsetTop, CHARACTER_CARD_WIDTH, CHARACTER_CARD_HEIGHT)
  await drawImageSync(ctx, './test/guigui.jpeg', offsetLeft, offsetTop, 100, 40)
}

const renderTags = (ctx, offsetTop, tags) => {
  let offsetLeft = GLOBAL_MARGIN
  tags.forEach(tag => {
    renderTag(ctx, offsetTop, offsetLeft, tag)
    offsetLeft += ( TAG_WIDTH + INSET_MARGIN )
  })
}

const renderTag = (ctx, offsetTop, offsetLeft, tag) => {
  ctx.fillStyle = 'rgba(43,144,217,1)'
  ctx.fillRect(offsetLeft, offsetTop, TAG_WIDTH, TAG_HEIGHT)
}

const drawImageSync = async (ctx, url, ...args) => {
  try {
    let img = await loadImage(url)
    ctx.drawImage(img, ...args)
  } catch (e) {
    console.log('==== load image error ====')
    // console.log(e)
  }
}


module.exports = {
  renderImage
}