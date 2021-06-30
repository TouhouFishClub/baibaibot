const { baiduocr } = require('../image/baiduocr');
const { ocr } = require('../image/cqhttp-ocr')
const { drawTxtImage } = require('../../cq/drawImageBytxt')

/*
*
*
*
生命值	1045	1495	209	239	269	299
攻击力	70	95	14	16	18	19
防御力	80	115	16	19	21	23
攻击、生命%	20.5%	29.0%	4.1%	4.7%	5.3%	5.8%
防御%	25.5%	36.5%	5.1%	5.8%	6.6%	7.3%
元素充能效率	22.5%	32.5%	4.5%	5.2%	5.8%	6.5%
元素精通	80	115	16	19	21	23
暴击率	13.5%	19.5%	2.7%	3.1%	3.5%	3.9%
暴击伤害	27.0%	39.0%	5.4%	6.2%	7.0%	7.8%
*
*
* */

const Reliquary = (content, qq, port, callback, type = 'cq-http') => {
	let n = -1
	switch (type) {
		case 'baiduAip':
			n = content.indexOf('[CQ:image,')
			if(n > -1){
				content.substr(n).split(',').forEach(p => {
					let sp = p.split('=')
					if(sp[0] == 'url'){
						// console.log(sp[1])
						baiduocr(sp[1], d => {
							let filter = d.split('\n').map(x => x.match(/[\u4e00-\u9fa5]+\+(\d+,)?\d+(\.\d+)?%?/)).filter(x => x).map(x => x[0])
							drawTxtImage(`[CQ:at,qq=${qq}]`, analysis(filter), callback, {color: 'black', font: 'STXIHEI.TTF'})
						})
					}
				})
			} else {
				callback('没有识别到图片')
			}
			break
		case 'cq-http':
			n = content.indexOf('[CQ:image')
			if(n > -1){
				content.substr(n).split(',').forEach(p => {
					let sp = p.split('=')
					if(sp[0] == 'file'){
						// console.log(sp[1])
						ocr(sp[1], port, d => {
							if(d.data) {
								let texts = d.data.texts.map(x => x.text.replace(/[ ,，]/g, ''))
								let filter = texts.map(x => x.match(/[\u4e00-\u9fa5]+\+(\d+,)?\d+(\.\d+)?%?/)).filter(x => x).map(x => x[0])
								drawTxtImage(`[CQ:at,qq=${qq}]`, analysis(filter), callback, {color: 'black', font: 'STXIHEI.TTF'})
							} else {
								callback(d.msg)
							}
						})
					}
				})
			} else {
				callback('没有识别到图片')
			}
			break
		default:
			callback('没有识别到图片')
	}
}

const analysis = arr => {
	if(!arr.length) {
		return '未识别到任何属性'
	}
	let out = '【圣遗物评价】\n'
	out += '=============\n'
	out += `${arr.join('\n')}\n`
	out += '=============\n'
	let score = 0
	for(let i = 0; i < arr.length; i ++) {
		let info = arr[i], sp = info.split('+')
		if(info.indexOf('击率') > -1) {
			let src = sp[1].split('%')[0]
			let res = uniAnalysis(src, [2.7,3.1,3.5,3.9], 10)
			sortData(res, src)
			res = simplifyData(res, src)
			out += `${sp[0]}: ${renderRank(res)}\n`
			score += calcScore(res, 'CRIT-RATE')
			continue
		}
		if(info.indexOf('精') > -1 || info.indexOf('通') > -1) {
			let src = sp[1]
			let res = uniAnalysis(src, [16,19,21,23], 2)
			sortData(res, src)
			res = simplifyData(res, src)
			out += `${sp[0]}: ${renderRank(res)}\n`
			score += calcScore(res, 'Elemental-mastery')
			continue
		}
		if(info.indexOf('充') > -1 || info.indexOf('能') > -1) {
			let src = sp[1].split('%')[0]
			let res = uniAnalysis(src, [4.5,5.2,5.8,6.5], 10)
			sortData(res, src)
			res = simplifyData(res, src)
			out += `${sp[0]}: ${renderRank(res)}\n`
			score += calcScore(res, 'Energy-Recharge')
			continue
		}
		if(info.indexOf('伤') > -1 || info.indexOf('害') > -1) {
			let src = sp[1].split('%')[0]
			let res = uniAnalysis(src, [5.4,6.2,7.0,7.8], 10)
			sortData(res, src)
			res = simplifyData(res, src)
			out += `${sp[0]}: ${renderRank(res)}\n`
			score += calcScore(res, 'CRIT-DMG')
			continue
		}
		if(info.indexOf('生') > -1 || info.indexOf('值') > -1) {
			if(info.indexOf('%') > -1 || info.indexOf('.') > -1) {
				let src = sp[1].split('%')[0]
				let res = uniAnalysis(src, [4.1,4.7,5.3,5.8], 10)
				sortData(res, src)
				res = simplifyData(res, src)
				out += `${sp[0]}(%): ${renderRank(res)}\n`
				score += calcScore(res, 'HP-per')
				continue
			} else {
				let src = sp[1]
				let res = uniAnalysis(src, [209,239,269,299], 2)
				sortData(res, src)
				res = simplifyData(res, src)
				out += `${sp[0]}: ${renderRank(res)}\n`
				score += calcScore(res, 'HP')
				continue
			}
		}
		if(info.indexOf('攻') > -1 || info.indexOf('击') > -1) {
			if(info.indexOf('%') > -1 || info.indexOf('.') > -1) {
				let src = sp[1].split('%')[0]
				let res = uniAnalysis(src, [4.1,4.7,5.3,5.8], 10)
				sortData(res, src)
				res = simplifyData(res, src)
				out += `${sp[0]}(%): ${renderRank(res)}\n`
				score += calcScore(res, 'ATK-per')
				continue
			} else {
				let src = sp[1]
				let res = uniAnalysis(src, [14,16,18,19], 2)
				sortData(res, src)
				res = simplifyData(res, src)
				out += `${sp[0]}: ${renderRank(res)}\n`
				score += calcScore(res, 'ATK')
				continue
			}
		}
		if(info.indexOf('防') > -1 || info.indexOf('御') > -1) {
			if(info.indexOf('%') > -1 || info.indexOf('.') > -1) {
				let src = sp[1].split('%')[0]
				let res = uniAnalysis(src, [5.1,5.8,6.6,7.3], 10)
				sortData(res, src)
				res = simplifyData(res, src)
				out += `${sp[0]}(%): ${renderRank(res)}\n`
				score += calcScore(res, 'DEF-per')
				continue
			} else {
				let src = sp[1]
				let res = uniAnalysis(src, [16,19,21,23], 2)
				sortData(res, src)
				res = simplifyData(res, src)
				out += `${sp[0]}: ${renderRank(res)}\n`
				score += calcScore(res, 'DEF')
				continue
			}
		}
		out += `${sp[0]}: 无法分析\n`
	}
	out += `========\n评分（实验性质）：${score}`
	return out
}

const sortData = (arr, source) => {
	arr.sort((a, b) => Math.abs(a.val - source) - Math.abs(b.val - source))
}

const simplifyData = (arr, source) => {
	let out = arr.filter(x => x.index.length == Math.min(...arr.map(x => x.index.length)))
	if(out.length && out[0].index.length == 1) {
		out = out.filter(x => x.val == source)
	}
	return out
}

const calcScore = (arr, type) => {
	if(!arr.length){
		return 0
	}
	let sum = arr.reduce((p, e) => p + e.index.split('').reduce((a, b) => a + [2.5, 3, 3.5, 4][b], 0), 0) / arr.length
	sum *= 2
	switch(type) {
		case 'CRIT-RATE':
			sum *= 1.5
			break
		case 'CRIT-DMG':
			sum *= 2
			break
		case 'Elemental-mastery':
			sum *= 0.7
			break
		case 'Energy-Recharge':
			sum *= 0.7
			break
		case 'HP-per':
			sum *= 0.5
			break
		case 'HP':
			sum *= 0.35
			break
		case 'ATK-per':
			sum *= 1.2
			break
		case 'ATK':
			sum *= 0.7
			break
		case 'DEF-per':
			sum *= 0.5
			break
		case 'DEF':
			sum *= 0.35
			break
	}
	return sum
}

const renderRank = arr => arr.length ? arr.map(x => x.index.split('').map(x => ['D','C','B','A'][parseInt(x)]).join('')).join(', ') : '无法分析'

const uniAnalysis = (tar, arr, precision) => createRange(arr).filter(range => ignoreError(tar, range.val, precision))

const createRange = (arr, max = 6, inject = {}, start = 0) => {
	let out = []
	for(let i = start; i < arr.length; i ++) {
		let obj = {
			val: parseFloat(arr[i]) + (inject.val || 0),
			index: `${inject.index || ''}${i}`
		}
		out = out.concat([obj])
		if(max > 1) {
			out = out.concat(createRange(arr, max - 1, obj, i))
		}
	}
	return out
}

const ignoreError = (tar, comp, precision = 10) => {
	return (tar <= comp + 2 / precision && tar >= comp - 2 / precision)
}

module.exports = {
	Reliquary,
	createRange,
	uniAnalysis,
}
