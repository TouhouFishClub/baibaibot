const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage')

const CHARACTER_CARD_WIDTH = 230
const CHARACTER_CARD_HEIGHT = 60
const TAG_WIDTH = 120
const TAG_HEIGHT = 32
const GLOBAL_MARGIN = 20
const INSET_MARGIN = 10
const ROW_MAX_CARD = 4
const fontFamily = 'STXIHEI'


const renderImage = async (tags, data, callback, isExcellent = false) => {
  console.log('=== render image ===')
  // console.log(JSON.stringify(Object.keys(data)))
  /* 计算画布 */
  let canvasWidth = ( CHARACTER_CARD_WIDTH + INSET_MARGIN ) * ROW_MAX_CARD - INSET_MARGIN + 2 * GLOBAL_MARGIN
  let canvasHeight =
    Object.keys(data).length * ( TAG_HEIGHT + INSET_MARGIN ) +
    Object.values(data).reduce((p, c) =>
      p + Math.ceil((c[3].length + c[4].length + c[5].length + c[6].length) / ROW_MAX_CARD) * ( CHARACTER_CARD_HEIGHT + INSET_MARGIN ), 0) - INSET_MARGIN + 2 * GLOBAL_MARGIN
  let excellentHeight = 40
  if(isExcellent) {
    canvasHeight = canvasHeight + excellentHeight + GLOBAL_MARGIN
  }

  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,.8)'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.font = `14px ${fontFamily}`

  let offsetTop = GLOBAL_MARGIN, offsetLeft = GLOBAL_MARGIN

  if(isExcellent){
    let text = '！！！ 以下组合必定出现4星以上干员 ！！！', fontSize = 30
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillStyle = '#f00'
    ctx.fillText(text, (canvasWidth - ctx.measureText(text).width) / 2 , offsetTop + (excellentHeight - fontSize) / 2 + fontSize)
    offsetTop = offsetTop + excellentHeight + GLOBAL_MARGIN
  }

  // _.forEach(Object.keys(data), async tagGroup => {
  //   offsetTop = await renderTagGroup(ctx, offsetTop, data, tagGroup)
  // })
  let keys = Object.keys(data)
  for(let i = 0; i < keys.length; i++){
    // console.log('=========')
    // console.log(offsetTop)
    let tagGroup = keys[i]
    renderTags(ctx, offsetTop, tagGroup.split(' + '))
    offsetTop += TAG_HEIGHT + INSET_MARGIN
    let allData = [].concat(data[tagGroup][6], data[tagGroup][5], data[tagGroup][4], data[tagGroup][3])
    await renderCharacters(ctx, offsetTop, allData)
    offsetTop += (CHARACTER_CARD_HEIGHT + INSET_MARGIN) * (Math.ceil(allData.length / ROW_MAX_CARD))
  }

  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')


  // console.log(tags)
  sendImageMsgBuffer(dataBuffer, tags.split('+').sort().join('_'), 'arknights', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, '/test/image.png'), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });
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
  let typeWidth = 20
  ctx.fillStyle = '#333'
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3
  ctx.shadowColor = '#333'
  ctx.shadowBlur = 6
  ctx.fillRect(offsetLeft, offsetTop, CHARACTER_CARD_WIDTH, CHARACTER_CARD_HEIGHT)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.moveTo(offsetLeft, offsetTop)
  ctx.lineTo(offsetLeft + 100 + 2 * typeWidth - 3, offsetTop)
  ctx.lineTo(offsetLeft + 100 - 3, offsetTop + CHARACTER_CARD_HEIGHT)
  ctx.lineTo(offsetLeft, offsetTop + CHARACTER_CARD_HEIGHT)
  ctx.lineTo(offsetLeft, offsetTop)
  ctx.fill()
  ctx.closePath()

  // console.log(character)
  await drawImageSync(
    ctx,
    path.join(__dirname, `chara/${character.appellation}.png`),
    0,
    (180 - CHARACTER_CARD_HEIGHT * 1.8) / 2 + 10,
    180,
    CHARACTER_CARD_HEIGHT * 1.8,
    offsetLeft,
    offsetTop,
    100,
    CHARACTER_CARD_HEIGHT)

  ctx.globalAlpha = 0.2
  await drawImageSync(
    ctx,
    path.join(__dirname, `logo/${character.displayLogo}.png`),
    0,
    30,
    240,
    180,
    offsetLeft + CHARACTER_CARD_WIDTH - CHARACTER_CARD_HEIGHT / 180 * 240 - 10,
    offsetTop,
    CHARACTER_CARD_HEIGHT / 180 * 240,
    CHARACTER_CARD_HEIGHT
  )
  ctx.globalAlpha = 1


  let lengthDepth = 5
  for(let i = 1; i <= lengthDepth; i++){
    ctx.beginPath()
    switch(character.rare){
      case 1:
        ctx.fillStyle = `rgba(249,249,249,${1 / lengthDepth})`
        break
      case 2:
        ctx.fillStyle = `rgba(163,171,20,${1 / lengthDepth})`
        break
      case 3:
        ctx.fillStyle = `rgba(0,160,226,${1 / lengthDepth})`
        break
      case 4:
        ctx.fillStyle = `rgba(211,194,236,${1 / lengthDepth})`
        break
      case 5:
        ctx.fillStyle = `rgba(255,238,149,${1 / lengthDepth})`
        break
      case 6:
        ctx.fillStyle = `rgba(229,167,64,${1 / lengthDepth})`
        break

    }
    ctx.moveTo(offsetLeft + 100 + (i - 1) * typeWidth / lengthDepth + typeWidth, offsetTop)
    ctx.lineTo(offsetLeft + 100 + 2 * typeWidth, offsetTop)
    ctx.lineTo(offsetLeft + 100, offsetTop + CHARACTER_CARD_HEIGHT)
    ctx.lineTo(offsetLeft + 100 + (i - 1) * typeWidth / lengthDepth - typeWidth, offsetTop + CHARACTER_CARD_HEIGHT)
    ctx.lineTo(offsetLeft + 100 + (i - 1) * typeWidth / lengthDepth + typeWidth, offsetTop)
    ctx.fill()
    ctx.closePath()
  }

  ctx.fillStyle = 'rgba(249,249,249,1)'
  let fontSize = 24
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillText(
    character.name,
    offsetLeft + CHARACTER_CARD_WIDTH - ctx.measureText(character.name).width - 10,
    offsetTop + 20 + fontSize + (CHARACTER_CARD_HEIGHT - 20 - fontSize) / 2 - 3
  )
  let engFontSize = 16
  ctx.font = `${engFontSize}px ${fontFamily}`
  ctx.fillText(
    character.appellation,
    offsetLeft + CHARACTER_CARD_WIDTH - ctx.measureText(character.appellation).width - 10,
    offsetTop + engFontSize + (20 - engFontSize) / 2 + 3
  )

  ctx.fillStyle = '#333'
  ctx.fillRect(offsetLeft, offsetTop, 20, 20)

  await drawImageSync(
    ctx,
    path.join(__dirname, `profession/${character.profession}.png`),
    offsetLeft,
    offsetTop,
    20,
    20,
  )

  ctx.shadowColor = '#000'
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.font = `14px ${fontFamily}`
  ctx.fillStyle = '#ffdf02'
  for(let i = 0; i < character.rare; i++){
    ctx.fillText(
      '★',
      offsetLeft + 23 + i * 10,
      offsetTop + 14,
    )
  }
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0

}

const renderTags = (ctx, offsetTop, tags) => {
  let offsetLeft = GLOBAL_MARGIN
  tags.forEach(tag => {
    renderTag(ctx, offsetTop, offsetLeft, tag)
    offsetLeft += ( TAG_WIDTH + INSET_MARGIN )
  })
}

const renderTag = (ctx, offsetTop, offsetLeft, tag) => {
  let fontSize = 18
  ctx.fillStyle = 'rgba(43,144,217,1)'
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.shadowColor = '#333'
  ctx.shadowBlur = 4
  ctx.fillRect(offsetLeft, offsetTop, TAG_WIDTH, TAG_HEIGHT)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = 'rgba(255,255,255,1)'
  // console.log('>>>>>')
  // console.log(ctx.measureText(tag))
  ctx.fillText(tag, offsetLeft + (TAG_WIDTH - ctx.measureText(tag).width) / 2, offsetTop + (TAG_HEIGHT - fontSize) / 2 + fontSize - 2)
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