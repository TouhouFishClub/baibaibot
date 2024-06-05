// const { drawTxtImage } = require('../../cq/drawImageBytxt')
const fs = require('fs-extra')
const path = require('path-extra')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, registerFont} = require('canvas')
const GLOBAL_MARGIN = 20
const TEXT_LINE_HEIGHT = 30
const TEXT_FONT_SIZE = 25
const CHART_WIDTH = 700
const CHART_HEIGHT = 100
const fontFamily = 'STXIHEI'

let eventSet = new Set()

const infos = [
	{ level: 1, updateRare: [1,1,1], increase : [1], drop : false},
	{ level: 2, updateRare: [1,1,1], increase : [1], drop : false },
	{ level: 3, updateRare: [1,1,1], increase : [1], drop : false },
	{ level: 4, updateRare: [1,1,1], increase : [1], drop : false },
	{ level: 5, updateRare: [1,1,1], increase : [1], drop : false },
	{ level: 6, updateRare: [1,1,1], increase : [1], drop : false },
	{ level: 7, updateRare: [1,1,1], increase : [1,2], drop : false },
	{ level: 8, updateRare: [1,1,1], increase : [1,2], drop : false },
	{ level: 9, updateRare: [1,1,1], increase : [1,2], drop : false },
	{ level: 10, updateRare: [0.9,1,1], increase : [1,2,3], drop : false },
	{ level: 11, updateRare: [0.9,1,1], increase : [1,2,3], drop : false },
	{ level: 12, updateRare: [0.9,1,1], increase : [1,2,3], drop : false },
	{ level: 13, updateRare: [0.8,0.96,1], increase : [1,2,3,4], drop : false },
	{ level: 14, updateRare: [0.8,0.96,1], increase : [1,2,3,4], drop : false },
	{ level: 15, updateRare: [0.8,0.96,1], increase : [1,2,3,4], drop : false },
	{ level: 16, updateRare: [0.7,0.84,1], increase : [1,2,3,4,5], drop : false },
	{ level: 17, updateRare: [0.7,0.84,1], increase : [1,2,3,4,5], drop : false },
	{ level: 18, updateRare: [0.7,0.84,1], increase : [1,2,3,4,5], drop : false },
	{ level: 19, updateRare: [0.6,0.72,0.9], increase : [1,2,3,4,5,6], drop : false },
	{ level: 20, updateRare: [0.6,0.72,0.9], increase : [1,2,3,4,5,6], drop : false },
	{ level: 21, updateRare: [0.6,0.72,0.9], increase : [1,2,3,4,5,6], drop : false },
	{ level: 22, updateRare: [0.5,0.6,0.75], increase : [1,2,3,4,5,6,7], drop : false },
	{ level: 23, updateRare: [0.5,0.6,0.75], increase : [1,2,3,4,5,6,7], drop : false },
	{ level: 24, updateRare: [0.5,0.6,0.75], increase : [1,2,3,4,5,6,7], drop : false },
	{ level: 25, updateRare: [0.3,0.36,0.45], increase : [4,5,6,7,8], drop : true },
	{ level: 26, updateRare: [0.3,0.36,0.45], increase : [4,5,6,7,8], drop : true },
	{ level: 27, updateRare: [0.3,0.36,0.45], increase : [4,5,6,7,8], drop : true },
	{ level: 28, updateRare: [0.3,0.36,0.45], increase : [5,6,7,8,9], drop : true },
	{ level: 29, updateRare: [0.3,0.36,0.45], increase : [5,6,7,8,9], drop : true },
]

const echoStoneEventSwitch = (group, callback, isOpen) => {
	if(isOpen) {
		eventSet.add(group)
		callback('活动已开启')
	} else {
		eventSet.delete(group)
		callback('活动已关闭')
	}
}

const createEchoStone = (group, callback, refine = false, rare = 2, care = false) => {
	let count = 0, success = 0, fail = 0, list = [1], drop = 0, dropTmp = 0, drops = [0, 0, 0, 0, 0, 0], refineStone = 0, rsArr = new Array(24).fill(0), avgData = [], avgTmp = [], popTmp = 0
	let levelArr = [{
    l: 1,
    rare
  }]
	while (list.length < 30 && count < 30000) {
		let target = infos[list.length - 1], ur = target.updateRare[rare]
		if(eventSet.has(group)) {
			ur += 0.1
		}
		if(ur > Math.random()) {
			let inc = target.increase[~~(target.increase.length * Math.random())]
			if(refine && (infos[list.length] && !infos[list.length].drop)) {
				let tmp = 0
				while (inc !== target.increase[target.increase.length - 1]) {
					inc = target.increase[~~(target.increase.length * Math.random())]
					refineStone ++
					tmp ++
				}
				// console.log(`== ${target.level} ==`)
				// console.log(refineStone)
				rsArr[target.level - 1] = tmp
			}
			list.push(inc)
			success ++
			if(dropTmp) {
				drops[dropTmp] ++
				dropTmp = 0
			}
      if(care && target.drop) {
        avgData.push(target.increase.reduce((p, e) => p + e, 0) / target.increase.length)
        avgTmp.push(inc)
        if(avgTmp.reduce((p, e) => p + e, 0) < avgData.reduce((p, e) => p + e, 0)) {
          rare = 0
        }
      }
		} else {
			if(target.drop) {
				list.pop()
				drop ++
				dropTmp ++
        if(care && avgTmp.length > 0) {
          popTmp = avgData.pop()
          avgTmp.pop()
          if(avgTmp.reduce((p, e) => p + e, 0) < avgData.reduce((p, e) => p + e, 0)) {
            rare = 0
          } else {
            rare = 2
          }
        }
			}
			fail ++
		}
		count ++
    let level = list.length
    let ins = level > 28 ? [0] : infos[level - 2].increase
    let up = popTmp > 0 ? (0 - popTmp) : list[level - 1]
    popTmp = 0
		levelArr.push({
      l: level,
      min: ins[0],
      max: ins[ins.length - 1],
      up,
      source: list.concat([]),
      rare
    })
	}
  console.log(levelArr.map(x => `${["简单","普通","困难"][x.rare]} (${x.min}-${x.max})\t${x.up}\tlevel: ${x.l}`).join('\n'))


	let str = `=== 回音石属性${eventSet.has(group) ? '（活动开启中）':''} ===\n你刷了${count}次回音石，成功${success}次，失败${fail}次${drops.map((x, i) => { return {txt: '\n连续掉' + i + '级有' + x + '次', x}}).filter(x => x.x > 0).map(x => x.txt).join('')}\n回音石属性：${list.reduce((p, e) => p + e)}(24级属性：${list.slice(0, 24).reduce((p, e) => p + e)})${refine ? ('\n消耗精炼石' + refineStone + '块') : ''}`
	let txts = str.split('\n')

	let canvasWidth = GLOBAL_MARGIN * 2 + CHART_WIDTH
	let cavasHeight = GLOBAL_MARGIN * 3 + CHART_HEIGHT + txts.length * TEXT_LINE_HEIGHT

	let canvas = createCanvas(canvasWidth, cavasHeight)
		, ctx = canvas.getContext('2d')
	ctx.fillStyle = '#fff'
	ctx.fillRect(0, 0, canvasWidth, cavasHeight)
	ctx.font = `${TEXT_FONT_SIZE}px ${fontFamily}`
	ctx.fillStyle = '#111'
	txts.forEach((txt, line) => {
		// ctx.strokeStyle = '#f00'
		// ctx.strokeRect(GLOBAL_MARGIN, GLOBAL_MARGIN + line * TEXT_LINE_HEIGHT, CHART_WIDTH, TEXT_LINE_HEIGHT)
		ctx.fillText(txt, GLOBAL_MARGIN, GLOBAL_MARGIN + line * TEXT_LINE_HEIGHT + TEXT_LINE_HEIGHT - 4)
	})
	ctx.fillStyle = '#efefef'
	ctx.fillRect(GLOBAL_MARGIN, GLOBAL_MARGIN * 2 + txts.length * TEXT_LINE_HEIGHT, CHART_WIDTH, CHART_HEIGHT)
	ctx.strokeStyle = '#0AB5CD'
	ctx.lineWidth = 1;
	let xs = GLOBAL_MARGIN, ys = GLOBAL_MARGIN * 2 + txts.length * TEXT_LINE_HEIGHT + CHART_HEIGHT
	let xt = xs, yt = ys
	let stepWidth = CHART_WIDTH / levelArr.length, stepHeight = CHART_HEIGHT / 30, tmpS = 0
	levelArr.forEach(({l, rare}, i) => {
    ctx.fillStyle = ['#adadad', '#d7d7d7', '#efefef'][rare]
    ctx.fillRect(xt, ys-CHART_HEIGHT, stepWidth, CHART_HEIGHT)

		if(tmpS == l) {
			ctx.strokeStyle = '#6f6f6f'
		} else {
			if(tmpS > l) {
				ctx.strokeStyle = '#076d07'
			} else {
				ctx.strokeStyle = '#d40000'
			}
		}
		ctx.beginPath()
		ctx.moveTo(xt, yt)
		let x = xs + stepWidth * i, y = ys - l * stepHeight
		tmpS = l
		ctx.lineTo(x, y)
		ctx.stroke()

		xt = x
		yt = y
	})

	let imgData = canvas.toDataURL()
	let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
	let dataBuffer = new Buffer(base64Data, 'base64')

	sendImageMsgBuffer(dataBuffer, 'output', 'other', msg => {
		callback(msg)
	})

	// fs.writeFile(path.join(__dirname, `test.png`), dataBuffer, (err) => {
	//   if(err){
	//     console.log(err)
	//   }else{
	//     console.log("保存成功！");
	//   }
	// });


	// let tmpObj = {
	// 	count,
	// 	success,
	// 	fail,
	// 	drop,
	// 	drops,
	// 	list,
	// 	levelArr,
	// }
	// console.log(list)
	// callback(tmpObj)
	// console.log(rsArr)
	// let str = `=== 回音石属性 ===\n你刷了${count}次回音石，成功${success}次，失败${fail}次${drops.map((x, i) => { return {txt: '\n连续掉' + i + '级有' + x + '次', x}}).filter(x => x.x > 0).map(x => x.txt).join('')}\n回音石属性：${list.reduce((p, e) => p + e)}(24级属性：${list.slice(0, 24).reduce((p, e) => p + e)})${refine ? ('\n消耗精炼石' + refineStone + '块') : ''}`
	// callback(str)
	// drawTxtImage('', str, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

module.exports = {
	createEchoStone,
	echoStoneEventSwitch
}
