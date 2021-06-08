// const { drawTxtImage } = require('../../cq/drawImageBytxt')
const fs = require('fs-extra')
const path = require('path-extra')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, registerFont} = require('canvas')
const GLOBAL_MARGIN = 20
const TEXT_LINE_HEIGHT = 20
const TEXT_FONT_SIZE = 16
const CHART_WIDTH = 700
const CHART_HEIGHT = 100
const fontFamily = 'STXIHEI'

const infos = [
	{ level: 1, updateRare: [1,1,1], increase : [1], drop : false},
	{ level: 2, updateRare: [0.8,0.96,1], increase : [1], drop : false },
	{ level: 3, updateRare: [0.6,0.72,0.9], increase : [1], drop : false },
	{ level: 4, updateRare: [0.4,0.48,0.6], increase : [1], drop : false },
	{ level: 5, updateRare: [0.385,0.462,0.5775], increase : [1], drop : false },
	{ level: 6, updateRare: [0.375,0.45,0.5625], increase : [1], drop : false },
	{ level: 7, updateRare: [0.365,0.438,0.5475], increase : [1,2], drop : false },
	{ level: 8, updateRare: [0.355,0.426,0.5325], increase : [1,2], drop : false },
	{ level: 9, updateRare: [0.345,0.414,0.5175], increase : [1,2], drop : false },
	{ level: 10, updateRare: [0.335,0.402,0.5025], increase : [1,2,3], drop : false },
	{ level: 11, updateRare: [0.325,0.39,0.4875], increase : [1,2,3], drop : false },
	{ level: 12, updateRare: [0.315,0.378,0.4725], increase : [1,2,3], drop : false },
	{ level: 13, updateRare: [0.305,0.366,0.4575], increase : [1,2,3,4], drop : false },
	{ level: 14, updateRare: [0.295,0.354,0.4425], increase : [1,2,3,4], drop : false },
	{ level: 15, updateRare: [0.285,0.342,0.4275], increase : [1,2,3,4], drop : false },
	{ level: 16, updateRare: [0.275,0.33,0.4125], increase : [1,2,3,4,5], drop : false },
	{ level: 17, updateRare: [0.265,0.318,0.3975], increase : [1,2,3,4,5], drop : false },
	{ level: 18, updateRare: [0.26,0.312,0.39], increase : [1,2,3,4,5], drop : false },
	{ level: 19, updateRare: [0.255,0.306,0.3825], increase : [1,2,3,4,5,6], drop : false },
	{ level: 20, updateRare: [0.25,0.30,0.375], increase : [1,2,3,4,5,6], drop : false },
	{ level: 21, updateRare: [0.245,0.294,0.3675], increase : [1,2,3,4,5,6], drop : false },
	{ level: 22, updateRare: [0.24,0.288,0.36], increase : [1,2,3,4,5,6,7], drop : false },
	{ level: 23, updateRare: [0.235,0.282,0.3525], increase : [1,2,3,4,5,6,7], drop : false },
	{ level: 24, updateRare: [0.23,0.276,0.345], increase : [1,2,3,4,5,6,7], drop : false },
	{ level: 25, updateRare: [0.225,0.27,0.3375], increase : [4,5,6,7,8], drop : true },
	{ level: 26, updateRare: [0.22,0.264,0.33], increase : [4,5,6,7,8], drop : true },
	{ level: 27, updateRare: [0.215,0.258,0.3225], increase : [4,5,6,7,8], drop : true },
	{ level: 28, updateRare: [0.21,0.252,0.315], increase : [5,6,7,8,9], drop : true },
	{ level: 29, updateRare: [0.2,0.24,0.3], increase : [5,6,7,8,9], drop : true },
]

const createEchoStone = (callback, refine = false) => {
	let count = 0, success = 0, fail = 0, list = [1], drop = 0, dropTmp = 0, drops = [0, 0, 0, 0, 0, 0], refineStone = 0, rsArr = new Array(24).fill(0)
	let levelArr = [1]
	const rare = 2
	while (list.length < 30 && count < 30000) {
		let target = infos[list.length - 1]
		if(target.updateRare[rare] > Math.random()) {
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
		} else {
			if(target.drop) {
				list.pop()
				drop ++
				dropTmp ++
			}
			fail ++
		}
		count ++
		levelArr.push(list.length)
	}


	let str = `=== 回音石属性 ===\n你刷了${count}次回音石，成功${success}次，失败${fail}次${drops.map((x, i) => { return {txt: '\n连续掉' + i + '级有' + x + '次', x}}).filter(x => x.x > 0).map(x => x.txt).join('')}\n回音石属性：${list.reduce((p, e) => p + e)}(24级属性：${list.slice(0, 24).reduce((p, e) => p + e)})${refine ? ('\n消耗精炼石' + refineStone + '块') : ''}`
	let txts = str.split('\n')

	let canvasWidth = GLOBAL_MARGIN * 2 + CHART_WIDTH
	let cavasHeight = GLOBAL_MARGIN * 3 + CHART_HEIGHT + txts.length * TEXT_LINE_HEIGHT

	let canvas = createCanvas(canvasWidth, cavasHeight)
		, ctx = canvas.getContext('2d')
	ctx.fillStyle = 'rgb(28,28,28)'
	ctx.fillRect(0, 0, canvasWidth, cavasHeight)
	ctx.font = `${TEXT_FONT_SIZE}px ${fontFamily}`
	ctx.fillStyle = '#fff'
	txts.forEach((txt, line) => {
		// ctx.strokeStyle = '#f00'
		// ctx.strokeRect(GLOBAL_MARGIN, GLOBAL_MARGIN + line * TEXT_LINE_HEIGHT, CHART_WIDTH, TEXT_LINE_HEIGHT)
		ctx.fillText(txt, GLOBAL_MARGIN, GLOBAL_MARGIN + line * TEXT_LINE_HEIGHT + TEXT_LINE_HEIGHT - 4)
	})
	ctx.fillStyle = '#555'
	ctx.fillRect(GLOBAL_MARGIN, GLOBAL_MARGIN * 2 + txts.length * TEXT_LINE_HEIGHT, CHART_WIDTH, CHART_HEIGHT)
	ctx.strokeStyle = '#0AB5CD'
	ctx.beginPath()
	let xs = GLOBAL_MARGIN, ys = GLOBAL_MARGIN * 2 + txts.length * TEXT_LINE_HEIGHT + CHART_HEIGHT
	ctx.moveTo(xs, ys)
	let stepWidth = CHART_WIDTH / levelArr.length, stepHeight = CHART_HEIGHT / 30
	levelArr.forEach((l, i) => {
		let x = xs + stepWidth * i, y = ys - l * stepHeight
		ctx.lineTo(x, y)
	})
	ctx.stroke()









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
	createEchoStone
}
