const searchCharacter = require('./arkNightsCharacter')
const fs = require('fs')
const path = require('path')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, loadImage} = require('canvas')
const OUTER_MARGIN = 50
const INSET_MARGIN = 50
const AVATAR_WIDTH = 150
const CHART_WIDTH = 400
const fontFamily = 'STXIHEI'

module.exports = function(qq, content, callback) {
  let sp = content.split('-').splice(0, 2), charaArr = []
  for(let i = 0; i < sp.length; i++) {
    let tmp
    searchCharacter(1, sp[i].trim(), d => tmp = d.concat([]), true)
    if(typeof tmp == 'string') {
      callback(`${sp[i]} : 未找到此干员`)
      return
    }
    if(tmp.length > 1) {
			// console.log('======')
			// console.log(tmp.map(ch => infoText(ch, 'cost')).sort((a, b) => a - b))
    	let ind = tmp.findIndex(c => c.name == sp[i].trim())
			if(ind > -1){
				charaArr.push(tmp[ind])
			} else {
				callback(`${sp[i]} : 查询到${tmp.length}位干员，请输入具体干员名称\n${tmp.map(x => x.name).join(' / ')}\n若精确查找干员，请使用正则表达式搜索：如arks ^红$`)
				return
			}
    } else {
    	charaArr.push(tmp[0])
		}
  }
  renderImage(content, charaArr, callback)
}

const renderImage = async (content, chs, callback) => {

  let cWidth = OUTER_MARGIN * 2 + AVATAR_WIDTH * 2 + INSET_MARGIN * 2 + CHART_WIDTH,
    cHeight = CHART_WIDTH + OUTER_MARGIN * 2
  let canvas = createCanvas(cWidth, cHeight)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, cWidth, cHeight)

  await drawImageSync(
    ctx,
    path.join(__dirname, `chara/${chs[0].info.appellation}.png`),
    OUTER_MARGIN,
    (CHART_WIDTH - AVATAR_WIDTH) / 2 + OUTER_MARGIN - 30,
    AVATAR_WIDTH,
    AVATAR_WIDTH
  )


  let colors = ['255,0,0', '0,0,255']

  ctx.font = `20px ${fontFamily}`
  ctx.fillStyle = `rgba(${colors[0]},1)`
  ctx.fillText(
    chs[0].info.name,
    OUTER_MARGIN,
    (CHART_WIDTH + AVATAR_WIDTH) / 2 + OUTER_MARGIN,
  )

  await drawImageSync(
    ctx,
    path.join(__dirname, `chara/${chs[1].info.appellation}.png`),
    OUTER_MARGIN + INSET_MARGIN * 2 + CHART_WIDTH + AVATAR_WIDTH,
    (CHART_WIDTH - AVATAR_WIDTH) / 2 + OUTER_MARGIN - 30,
    AVATAR_WIDTH,
    AVATAR_WIDTH
  )
  ctx.fillStyle = `rgba(${colors[1]},1)`
  ctx.fillText(
    chs[1].info.name,
    OUTER_MARGIN + INSET_MARGIN * 2 + CHART_WIDTH + AVATAR_WIDTH,
    (CHART_WIDTH + AVATAR_WIDTH) / 2 + OUTER_MARGIN,
  )

  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1
  ctx.setLineDash([10, 5])
  for(let i = 1; i <= 5; i ++) {
    if(i == 5) {
      ctx.setLineDash([])
      ctx.lineWidth = 2
    }
    ctx.beginPath()
    ctx.arc(cWidth / 2, cHeight / 2, CHART_WIDTH / 2 / 5 * i, 0 , 2 * Math.PI)
    ctx.stroke()
  }

  for(let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1
    ctx.moveTo(cWidth / 2, cHeight / 2)
    ctx.lineTo(
      cWidth / 2 + Math.sin(2 * Math.PI / 8 * i) * CHART_WIDTH / 2,
      cHeight / 2 - Math.cos(2 * Math.PI / 8 * i) * CHART_WIDTH / 2
    )
    ctx.stroke()
  }

  ctx.font = `16px ${fontFamily}`
  let strArr = ['生命', '攻击', '防御', '阻挡数', '法术抗性', '攻击速度(次/秒)', '部署费用', '再部署时间']
  for(let i = 0; i < 8; i++) {
    ctx.fillText(
      strArr[i],
      cWidth / 2 + Math.sin(2 * Math.PI / 8 * i) * (CHART_WIDTH / 2 + 40) - ctx.measureText(strArr[i]).width / 2,
      cHeight / 2 - Math.cos(2 * Math.PI / 8 * i) * (CHART_WIDTH / 2 + 25) + 8
    )
  }

  let maxVal = [4225, 1175, 796, 3, 30, 1.5, 40, 300]
  let item = ['maxHp', 'atk', 'def', 'blockCnt', 'magicResistance', 'baseAttackTime', 'cost', 'respawnTime']
  for(let i = 0; i < 2; i++) {
    ctx.fillStyle = `rgba(${colors[i]},.1)`
    ctx.strokeStyle = `rgba(${colors[i]},1)`
    ctx.setLineDash([])
    ctx.beginPath()
    for(let j = 0; j < 8; j ++) {
      if(j){
        let val = infoText(chs[i], item[j])
        switch(j) {
          case 5:
            val = 1 / val
            break
          case 6:
            val = 40 - val
            break
          case 7:
            val = 300 - val
            break
        }
        ctx.lineTo(
          cWidth / 2 + Math.sin(2 * Math.PI / 8 * j) * CHART_WIDTH / 2 * val / maxVal[j],
          cHeight / 2 - Math.cos(2 * Math.PI / 8 * j) * CHART_WIDTH / 2 * val / maxVal[j]
        )
      } else {
        ctx.moveTo(
          cWidth / 2 + Math.sin(2 * Math.PI / 8 * j) * CHART_WIDTH / 2 * infoText(chs[i], item[j]) / maxVal[j],
          cHeight / 2 - Math.cos(2 * Math.PI / 8 * j) * CHART_WIDTH / 2 * infoText(chs[i], item[j]) / maxVal[j]
        )
      }
    }
    ctx.closePath()
    ctx.stroke()
    ctx.fill()

    for(let j = 0; j < 8; j ++) {
      ctx.fillStyle = `rgba(${colors[i]},1)`
      let val = infoText(chs[i], item[j])
      switch(j) {
        case 5:
          val = 1 / val
          break
        case 6:
          val = 40 - val
          break
        case 7:
          val = 300 - val
          break
      }
      ctx.fillText(
        infoText(chs[i], item[j]),
        cWidth / 2 + Math.sin(2 * Math.PI / 8 * j) * (CHART_WIDTH / 2 + 20) * val / maxVal[j] - ctx.measureText(infoText(chs[i], item[j])).width / 2,
        cHeight / 2 - Math.cos(2 * Math.PI / 8 * j) * (CHART_WIDTH / 2 + 15) * val / maxVal[j] + 16 * i
      )
    }
  }


  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  sendImageMsgBuffer(dataBuffer, content, 'arknights', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, '/test/char.png'), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });
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

const infoText = (chInfo, infoStr) => {
  let favInfo = chInfo.info.source.favorKeyFrames[chInfo.info.source.favorKeyFrames.length - 1].data[infoStr]
  return parseFloat(chInfo.info.source.phases[chInfo.info.source.phases.length-1].attributesKeyFrames[chInfo.info.source.phases[chInfo.info.source.phases.length-1].attributesKeyFrames.length-1].data[infoStr]) + parseFloat(favInfo)
}