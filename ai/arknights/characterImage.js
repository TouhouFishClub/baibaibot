const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage'),
  { AllRangeData } = require('./arkNightsRange'),
  { AllBuildingData } = require('./arkNightsBuilding')
const aks = require('./arkNightsSkill')
const TAB_MARGIN = 20
const TAB_WIDTH = 600
let TAB_HEIGHT = 1542
const INSET_MARGIN = 10
const AVATAR_WIDTH = 150
const fontFamily = 'STXIHEI'
const TAG_WIDTH = 120
const TAG_HEIGHT = 32

const rangeMap = AllRangeData()


const renderImage = async (chInfo, level, callback, otherMsg = '') => {
  // console.log('=======')
  // console.log(chInfo)
  TAB_HEIGHT = 1542

  TAB_HEIGHT = TAB_HEIGHT - 184 * (3 - chInfo.info.source.skills.length)

  let canvasWidth = TAB_WIDTH + 2 * TAB_MARGIN, canvasHeight = TAB_HEIGHT + 2 * TAB_MARGIN

  let canvas = createCanvas(canvasWidth, canvasHeight)
    , ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, canvasWidth, TAB_MARGIN)
  ctx.fillRect(0, TAB_MARGIN + TAB_HEIGHT, canvasWidth, TAB_MARGIN)
  ctx.fillRect(0, 0, TAB_MARGIN, canvasHeight)
  ctx.fillRect(TAB_MARGIN + TAB_WIDTH, 0, TAB_MARGIN, canvasHeight)

  ctx.shadowOffsetX = 5
  ctx.shadowOffsetY = 5
  ctx.shadowColor = '#333'
  ctx.shadowBlur = 8
  ctx.fillRect(TAB_MARGIN, TAB_MARGIN, TAB_WIDTH, TAB_HEIGHT)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  await drawImageSync(
    ctx,
    path.join(__dirname, `assets/bg.png`),
    TAB_MARGIN,
    TAB_MARGIN,
    TAB_WIDTH,
    TAB_HEIGHT
  )
  await drawImageSync(
    ctx,
    path.join(__dirname, `logo/${chInfo.info.displayLogo}.png`),
    TAB_MARGIN + TAB_WIDTH - 240,
    TAB_MARGIN + TAB_HEIGHT - 240,
    240,
    240
  )
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillRect(TAB_MARGIN, TAB_MARGIN, TAB_WIDTH, TAB_HEIGHT)


  ctx.font = `14px ${fontFamily}`
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2

  let offsetTop = 20, offsetLeft = TAB_MARGIN, fontSize = 14

  fontSize = 30
  ctx.font = `${fontSize}px ${fontFamily}`

  /* title */
  let title = '干  员  入  职  申  请  书'
  ctx.fillText(title, (canvasWidth - ctx.measureText(title).width) / 2 , offsetTop + fontSize + INSET_MARGIN - 3)
  ctx.strokeRect(TAB_MARGIN, offsetTop, TAB_WIDTH, fontSize + INSET_MARGIN * 2)
  offsetTop = offsetTop + fontSize + INSET_MARGIN * 2

  /* avatar*/
  let hasAvatar = await drawImageSync(
    ctx,
    path.join(__dirname, `chara/${chInfo.info.appellation}.png`),
    offsetLeft,
    offsetTop,
    AVATAR_WIDTH,
    AVATAR_WIDTH
  )
  if(!hasAvatar){
    let text = 'NO INFO'
    ctx.fillText(text, offsetLeft + (AVATAR_WIDTH - ctx.measureText(text).width) / 2, offsetTop + AVATAR_WIDTH / 2 + fontSize / 2)
  }
  ctx.strokeRect(offsetLeft, offsetTop, AVATAR_WIDTH, AVATAR_WIDTH)


  ctx.shadowColor = '#000'
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.font = `20px ${fontFamily}`
  ctx.fillStyle = '#ffdf02'
  for(let i = 0; i < chInfo.info.rare; i++){
    ctx.fillText(
      '★',
      offsetLeft + 5 + i * 15,
      offsetTop + 22,
    )
  }
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  ctx.fillStyle = '#000'

  ctx.fillStyle = '#333'
  let professionWidth = 30
  ctx.fillRect(offsetLeft + AVATAR_WIDTH - professionWidth, offsetTop + AVATAR_WIDTH - professionWidth, professionWidth, professionWidth)
  await drawImageSync(
    ctx,
    path.join(__dirname, `profession/${chInfo.info.profession}.png`),
    offsetLeft + AVATAR_WIDTH - professionWidth,
    offsetTop + AVATAR_WIDTH - professionWidth,
    professionWidth,
    professionWidth,
  )
  ctx.fillStyle = '#000'

  offsetLeft = offsetLeft + AVATAR_WIDTH

  /* name */
  fontSize = 50
  ctx.font = `${fontSize}px ${fontFamily}`

  ctx.fillText(
    chInfo.name,
    offsetLeft + INSET_MARGIN,
    offsetTop + fontSize + (90 - fontSize) / 2 - 3
  )
  let nameWidth = ctx.measureText(chInfo.name).width, nameHeight = fontSize + (90 - fontSize) / 2 - 3

  fontSize = 30
  ctx.font = `${fontSize}px ${fontFamily}`

  ctx.fillText(
    chInfo.info.appellation,
    offsetLeft + INSET_MARGIN * 2 + nameWidth,
    offsetTop + nameHeight
  )

  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH - AVATAR_WIDTH, 90)

  offsetTop = offsetTop + 90

  /* tag */
  let tags
  if(chInfo.info.source.tagList.length) {
    tags = chInfo.info.source.tagList
  }
  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH - AVATAR_WIDTH, 60)
  renderTags(ctx, offsetTop + (60 - TAG_HEIGHT) / 2 , offsetLeft + INSET_MARGIN, tags)

  offsetTop = offsetTop + 60
  offsetLeft = TAB_MARGIN

  /* attribute */
  ctx.fillStyle = '#000'
  offsetTop = renderTitle(ctx, offsetTop, '属性 Attributes')

  fontSize = 20
  ctx.font = `${fontSize}px ${fontFamily}`

  ctx.fillText(
    `生命：${infoText(chInfo, 'maxHp')}`,
    offsetLeft + INSET_MARGIN,
    offsetTop + 25 - 2 + 5
  )

  ctx.fillText(
    `再部署时间：${infoText(chInfo, 'respawnTime')}`,
    offsetLeft + 250,
    offsetTop + 25 - 2 + 5
  )

  ctx.fillText(
    `攻击：${infoText(chInfo, 'atk')}`,
    offsetLeft + INSET_MARGIN,
    offsetTop + 25 + 30 - 2 + 5
  )

  ctx.fillText(
    `部署费用：${infoText(chInfo, 'cost')}`,
    offsetLeft + 250,
    offsetTop + 25 + 30 - 2 + 5
  )

  ctx.fillText(
    `防御：${infoText(chInfo, 'def')}`,
    offsetLeft + INSET_MARGIN,
    offsetTop + 25 + 60 - 2 + 5
  )

  ctx.fillText(
    `阻挡数：${infoText(chInfo, 'blockCnt')}`,
    offsetLeft + 250,
    offsetTop + 25 + 60 - 2 + 5
  )

  ctx.fillText(
    `法术抗性：${infoText(chInfo, 'magicResistance')}`,
    offsetLeft + INSET_MARGIN,
    offsetTop + 25 + 90 - 2 + 5
  )

  ctx.fillText(
    `攻击速度：${infoText(chInfo, 'baseAttackTime')}`,
    offsetLeft + 250,
    offsetTop + 25 + 90 - 2 + 5
  )
  ctx.strokeRect(offsetLeft, offsetTop, 425 + 2 * INSET_MARGIN, 130)

  renderRange(ctx, offsetTop, offsetLeft + 425 + 2 * INSET_MARGIN, TAB_WIDTH - (offsetLeft + 425 + 2 * INSET_MARGIN) + TAB_MARGIN , 130, ...chInfo.info.source.phases.map(d => d.rangeId))

  offsetTop += 130

  /* 精英化 */

  ctx.fillStyle = '#000'
  ctx.font = `20px ${fontFamily}`
  ctx.fillText('精英材料', offsetLeft + INSET_MARGIN, offsetTop + 35)

  offsetLeft += ctx.measureText('精英材料').width + INSET_MARGIN * 2
  if(chInfo.info.source.phases[1]) {
    ctx.fillStyle = '#000'
    ctx.font = `20px ${fontFamily}`
    ctx.fillText('1阶', offsetLeft, offsetTop + 35)
    offsetLeft += ctx.measureText('1阶').width + INSET_MARGIN
    switch(chInfo.info.rare){
      case 3:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '1w')
        break
      case 4:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '1.5w')
        break
      case 5:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '2w')
        break
      case 6:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '3w')
        break
    }
    offsetLeft += 50
    if(chInfo.info.source.phases[1].evolveCost && chInfo.info.source.phases[1].evolveCost.length){
      let items = chInfo.info.source.phases[1].evolveCost
      for(let i = 0; i < items.length; i++){
        let item = items[i]
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, item.id, item.count)
        offsetLeft += 50
      }
    }
  }
  offsetLeft += INSET_MARGIN
  if(chInfo.info.source.phases[2]) {
    ctx.fillStyle = '#000'
    ctx.font = `20px ${fontFamily}`
    ctx.fillText('2阶', offsetLeft, offsetTop + 35)
    offsetLeft += ctx.measureText('2阶').width + INSET_MARGIN
    switch(chInfo.info.rare){
      case 4:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '6w')
        break
      case 5:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '12w')
        break
      case 6:
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, 4001, '18w')
        break
    }
    offsetLeft += 50
    if(chInfo.info.source.phases[2].evolveCost && chInfo.info.source.phases[2].evolveCost.length){
      let items = chInfo.info.source.phases[2].evolveCost
      for(let i = 0; i < items.length; i++){
        let item = items[i]
        await renderItem(ctx, offsetLeft, offsetTop + 5, 40, item.id, item.count)
        offsetLeft += 50
      }
    }
  }

  offsetLeft = TAB_MARGIN
  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH, 50)
  offsetTop += 50




  /* potential */
  ctx.fillStyle = '#000'
  let potWidth = 200
  renderText(ctx, '潜能 Potential', offsetTop, offsetLeft + INSET_MARGIN, potWidth, 40, 20)
  ctx.strokeRect(offsetLeft, offsetTop, potWidth, 40)

  if(chInfo.info.source.potentialRanks.length){
    chInfo.info.source.potentialRanks.map(pot => pot.description).forEach((desc, idx) => {
      renderText(ctx, desc, offsetTop + 40 + idx * 30 + 25, offsetLeft + INSET_MARGIN, potWidth, 30, 20)
    })
  }
  ctx.strokeRect(offsetLeft, offsetTop + 40, potWidth, 200)
  offsetLeft += potWidth

  /* talent */
  renderText(ctx, '天赋 Talent', offsetTop, offsetLeft + INSET_MARGIN, TAB_WIDTH - offsetLeft - INSET_MARGIN, 40, 20)
  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH - offsetLeft + TAB_MARGIN, 40)

  offsetTop += 40
  let top = offsetTop
  chInfo.info.source.talents.map(tal => {
    return {
      name: tal.candidates[tal.candidates.length - 1].name,
      desc: ignoreModal(tal.candidates[tal.candidates.length - 1].description)
    }
  }).forEach(t => {
    ctx.font = `16px ${fontFamily}`
    ctx.fillStyle = '#2c2c2c'
    ctx.fillRect(offsetLeft + INSET_MARGIN, top + INSET_MARGIN, ctx.measureText(t.name).width + INSET_MARGIN * 2, 20)
    ctx.fillStyle = '#fff'
    ctx.fillText(t.name, offsetLeft + INSET_MARGIN * 2, top + 16 + INSET_MARGIN)
    top += 20 + INSET_MARGIN + 5
    ctx.fillStyle = '#000'
    top = renderText(ctx, t.desc, top, offsetLeft + INSET_MARGIN, TAB_WIDTH - offsetLeft - INSET_MARGIN, 20, 16)
  })
  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH - potWidth, 200)
  offsetTop += 200
  offsetLeft = TAB_MARGIN

  /* skill */
  ctx.fillStyle = '#000'
  offsetTop = renderTitle(ctx, offsetTop, '技能 Skill')

  /* skill level up */
  ctx.font = `16px ${fontFamily}`
  let lvUp = chInfo.info.source.allSkillLvlup
  for(let index = 0; index < lvUp.length; index ++) {
    ctx.fillStyle = '#000'
    let skillUp = lvUp[index]
    let baseTop = offsetTop + 50 * parseInt(index / 3), baseLeft = offsetLeft + 15 + 190 * (index % 3)
    ctx.fillText(`${index + 1} > ${index + 2}`, baseLeft, baseTop + 30)
    let skillItem = skillUp.lvlUpCost
    if(skillItem) {
      for(let idx = 0; idx < skillItem.length; idx ++){
        let co = skillItem[idx]
        await renderItem(ctx, baseLeft + 40 + 45 * idx, baseTop + 5, 40, co.id, co.count)
      }
    }
  }
  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH, 100)
  offsetTop += 100

  /* skill master */
  let skillRange = 160, skillMaster = 150, skillWidth = TAB_WIDTH - skillRange - skillMaster, skillHeight = 184
  let skills = chInfo.info.source.skills

  for(let i = 0; i < skills.length; i++){
    let skill = aks(skills[i].skillId)
    let lev = level
    let hasRange = false
    if(skill.levels.length < level + 1) {
      lev = 0
    }
    if(i == 0) {
      ctx.fillStyle = '#000'
      ctx.font = `18px ${fontFamily}`
      ctx.fillText(`(${lev + 1}级)`, offsetLeft + 100, offsetTop - 114)
    }
    if(skill.levels[lev].source.rangeId){
      hasRange = true
    }
    ctx.strokeRect(offsetLeft, offsetTop, skillWidth + (hasRange ? 0 : skillRange), skillHeight)
    ctx.fillStyle = '#000'
    ctx.font = `16px ${fontFamily}`
    ctx.fillText(skill.levels[0].name, offsetLeft + INSET_MARGIN, offsetTop + 22)
    ctx.fillText(`初始：${skill.levels[lev].initSp}  |  消耗：${skill.levels[lev].spCost}  |  持续：${skill.levels[lev].duration}`, offsetLeft + INSET_MARGIN, offsetTop + 42)
    renderText(ctx, skill.levels[lev].desc, offsetTop + 45, offsetLeft + INSET_MARGIN, skillWidth + (hasRange ? 0 : skillRange) - 2 * INSET_MARGIN, 20, 16)
    offsetLeft += skillWidth
    if(hasRange) {
      renderRange(ctx, offsetTop, offsetLeft, skillRange, skillHeight, skill.levels[lev].source.rangeId)
    }
    offsetLeft += skillRange
    let masterMat = skills[i].levelUpCostCond
    for(let idx = 0; idx < masterMat.length; idx ++) {

      let baseTop = offsetTop + 27 + 40 * idx, baseLeft = offsetLeft + 20
      let skillItem = masterMat[idx].levelUpCost
      if(skillItem) {
        for(let idxc = 0; idxc < skillItem.length; idxc ++){
          let co = skillItem[idxc]
          await renderItem(ctx, baseLeft + 40 * idxc, baseTop + 5, 35, co.id, co.count)
        }
      }
    }
    ctx.strokeRect(offsetLeft, offsetTop, skillMaster, skillHeight)

    offsetLeft = TAB_MARGIN
    offsetTop += skillHeight
  }

  ctx.fillStyle = '#000'
  offsetTop = renderTitle(ctx, offsetTop, '基建技能 Building Buff')

  let buildingData = AllBuildingData()
  ctx.strokeRect(offsetLeft, offsetTop, TAB_WIDTH, 150)

  buildingData.chars[chInfo.info.pubId].buffChar.forEach(char => {
    if(char.buffData.length) {
      let bId = char.buffData[char.buffData.length - 1].buffId
      let buff = buildingData.buffs[bId]
      ctx.font = `16px ${fontFamily}`
      ctx.fillStyle = buff.buffColor
      ctx.fillRect(offsetLeft + INSET_MARGIN, offsetTop + INSET_MARGIN, ctx.measureText(buff.buffName).width + 2 * INSET_MARGIN, 20)
      ctx.fillStyle = buff.textColor
      ctx.fillText(buff.buffName, offsetLeft + INSET_MARGIN * 2, offsetTop + 16 + INSET_MARGIN)
      offsetTop += 20 + 2 * INSET_MARGIN - 5

      ctx.fillStyle = '#000'
      offsetTop = renderText(ctx, ignoreBuildModal(buff.description), offsetTop, offsetLeft + INSET_MARGIN, TAB_WIDTH - 2 * INSET_MARGIN, 20 , 16) + 5
    }
  })



  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  // fs.writeFile(path.join(__dirname, '/char.png'), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });

  sendImageMsgBuffer(dataBuffer, chInfo.name, 'arknights', msg => {
    callback(msg)
  }, otherMsg)
}

const renderItem = async (ctx, offsetLeft, offsetTop, width, itemId, itemCount) => {
  await drawImageSync(
    ctx,
    path.join(__dirname, `material/${itemId}.png`),
    offsetLeft,
    offsetTop,
    width,
    width
  )
  ctx.fillStyle = '#2c2c2c'
  ctx.beginPath()
  ctx.arc(offsetLeft + width - 5, offsetTop + width - 8, 8, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `16px ${fontFamily}`
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 1
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText(itemCount, offsetLeft + width - ((itemCount >= 10 || typeof itemCount == 'string') ? 13 : 9), offsetTop + width - 2)
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

}

const ignoreModal = text =>
  text
    .replace(new RegExp('<@ba.talpu>', 'g'), '')
    .replace(new RegExp('<@ba.kw>', 'g'), '')
    .replace(new RegExp('</>', 'g'), '')

const ignoreBuildModal = text =>
  text
    .replace(new RegExp('<@cc.vup>', 'g'), '')
    .replace(new RegExp('<@cc.vdown>', 'g'), '')
    .replace(new RegExp('<@cc.kw>', 'g'), '')
    .replace(new RegExp('</>', 'g'), '')

const infoText = (chInfo, infoStr) => {
  let favInfo = chInfo.info.source.favorKeyFrames[chInfo.info.source.favorKeyFrames.length - 1].data[infoStr]
  return `${chInfo.info.source.phases[0].attributesKeyFrames[0].data[infoStr]}(${chInfo.info.source.phases[chInfo.info.source.phases.length-1].attributesKeyFrames[chInfo.info.source.phases[chInfo.info.source.phases.length-1].attributesKeyFrames.length-1].data[infoStr]})${favInfo > 0 ? ('+' + favInfo) : ''}`
}

const renderRange = (ctx, offsetTop, offsetLeft, width, height, ...rangeIds) => {
  ctx.fillStyle = '#2c2c2c'
  ctx.fillRect(offsetLeft, offsetTop, width, height)
  let rangeArr = Array(7).fill(0).map(x => Array(9).fill(0))
  rangeArr[3][3] = 1
  rangeIds.forEach((rangeId, phaseIdx) => {
    let range = rangeMap[rangeId].grids
    range.forEach(rangeObj => {
      let y = 3 + rangeObj.row, x = 3 + rangeObj.col
      if(rangeArr[y][x] == 0) {
        rangeArr[y][x] = phaseIdx + 2
      }
    })
  })
  let blockWidth = 10, margin = 5
  rangeArr.forEach((row, rowIdx) => {
    let y = offsetTop + (height - 7 * 15) / 2 + (blockWidth + margin) * rowIdx
    row.forEach((block, colIdx) => {
      let x = offsetLeft + 5 + (blockWidth + margin) * colIdx
      switch(block) {
        case 0:
          break
        case 1:
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#fff'
          ctx.fillRect(x, y, blockWidth, blockWidth)
          ctx.strokeRect(x, y, blockWidth, blockWidth)
          break
        case 2:
          ctx.strokeStyle = '#818181'
          ctx.strokeRect(x, y, blockWidth, blockWidth)
          break
        case 3:
          ctx.strokeStyle = '#22bbff'
          ctx.strokeRect(x, y, blockWidth, blockWidth)
          break
        case 4:
          ctx.strokeStyle = '#fd6137'
          ctx.strokeRect(x, y, blockWidth, blockWidth)
          break
      }
    })
    ctx.strokeStyle = '#000'
  })
  ctx.strokeRect(offsetLeft, offsetTop, width, height)
}

const renderText = (ctx, text, offsetTop, offsetLeft, maxWidth, lineHeight, fontSize) => {
  let textArr = [], textTmp = ''
  ctx.font = `${fontSize}px ${fontFamily}`
  text.split('').forEach(t => {
    if(ctx.measureText(`${textTmp}${t}`).width < maxWidth){
      if(t == '\n'){
        textArr.push(textTmp)
        textTmp = ''
      } else {
        textTmp += t
      }
    } else {
      textArr.push(textTmp)
      textTmp = t
    }
  })
  textArr.push(textTmp)
  let top = offsetTop
  textArr.forEach((text, line) => {
    ctx.fillText(text, offsetLeft, top + lineHeight * line + fontSize + (lineHeight - fontSize) / 2 - 2)
  })
  return offsetTop + textArr.length * lineHeight
}

const renderTitle = (ctx, offsetTop, title) => {
  let fontSize = 20, titleHeight = 40
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillText(
    title,
    TAB_MARGIN + INSET_MARGIN,
    offsetTop + fontSize + (titleHeight - fontSize) / 2 - 3
  )
  ctx.strokeRect(TAB_MARGIN, offsetTop, TAB_WIDTH, titleHeight)
  return offsetTop + titleHeight
}

const renderTags = (ctx, offsetTop, offsetLeft, tags) => {
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
  ctx.fillText(tag, offsetLeft + (TAG_WIDTH - ctx.measureText(tag).width) / 2, offsetTop + (TAG_HEIGHT - fontSize) / 2 + fontSize - 2)
}

const drawImageSync = async (ctx, url, ...args) => {
  try {
    let img = await loadImage(url)
    ctx.drawImage(img, ...args)
    return true
  } catch (e) {
    if(url.match('chara')){
      return false
    }
    console.log('==== load image error ====')
  }
}


module.exports = {
  renderImage
}