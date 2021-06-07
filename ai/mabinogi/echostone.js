const { drawTxtImage } = require('../../cq/drawImageBytxt')
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
	let count = 0, success = 0, fail = 0, list = [1], drop = 0, dropTmp = 0, drops = [0, 0, 0, 0, 0, 0], refineStone = 0
	const rare = 2
	while (list.length < 30 && count < 30000) {
		let target = infos[list.length - 1]
		if(target.updateRare[rare] > Math.random()) {
			let inc = target.increase[~~(target.increase.length * Math.random())]
			if(refine && !target.drop) {
				while (inc !== target.increase[target.increase.length - 1]) {
					inc = target.increase[~~(target.increase.length * Math.random())]
					refineStone ++
				}
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
	}
	let tmpObj = {
		count,
		success,
		fail,
		drop,
		drops,
		list
	}
	// console.log(list)
	// callback(tmpObj)
	let str = `=== 回音石属性 ===\n你刷了${count}次回音石，成功${success}次，失败${fail}次${drops.map((x, i) => { return {txt: '\n连续掉' + i + '级有' + x + '次', x}}).filter(x => x.x > 0).map(x => x.txt).join('')}\n回音石属性：${list.reduce((p, e) => p + e)}(24级属性：${list.slice(0, 24).reduce((p, e) => p + e)})${refine ? ('\n消耗精炼石' + refineStone + '块') : ''}`
	// callback(str)
	drawTxtImage('', str, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

module.exports = {
	createEchoStone
}
