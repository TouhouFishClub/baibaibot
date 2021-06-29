const { baiduocr } = require('../image/baiduocr');

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

const Reliquary = (content, callback) => {
	let n = content.indexOf('[CQ:image,')
	if(n > -1){
		content.substr(n).split(',').forEach(p => {
			let sp = p.split('=')
			if(sp[0] == 'url'){
				// console.log(sp[1])
				baiduocr(sp[1], d => {
					let filter = d.split('\n').map(x => x.match(/[\u4e00-\u9fa5]+\+\d+(\.\d+)?%?/)).filter(x => x).map(x => x[0])
					callback(analysis(filter))
				})
			}
		})
	} else {
		callback('没有识别到图片')
	}
}

const analysis = arr => {
	let out = ''
	out += `【${arr.join(', ')}】\n`
	for(let i = 0; i < arr.length; i ++) {
		let info = arr[i], sp = info.split('+')
		if(info.indexOf('率') > -1) {
			out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1].split('%')[0], [2.7,3.1,3.5,3.9], 10))}\n`
			continue
		}
		if(info.indexOf('精') > -1 || info.indexOf('通') > -1) {
			out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1], [16,19,21,23], 2))}\n`
			continue
		}
		if(info.indexOf('充') > -1 || info.indexOf('能') > -1) {
			out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1].split('%')[0], [4.5,5.2,5.8,6.5], 10))}\n`
			continue
		}
		if(info.indexOf('伤') > -1 || info.indexOf('害') > -1) {
			out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1].split('%')[0], [5.4,6.2,7.0,7.8], 10))}\n`
			continue
		}
		if(info.indexOf('生') > -1 || info.indexOf('值') > -1) {
			if(info.indexOf('%') > -1 || info.indexOf('.') > -1) {
				out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1].split('%')[0], [4.1,4.7,5.3,5.8], 10))}\n`
				continue
			} else {
				out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1], [209,239,269,299], 2))}\n`
				continue
			}
		}
		if(info.indexOf('攻') > -1 || info.indexOf('击') > -1) {
			if(info.indexOf('%') > -1 || info.indexOf('.') > -1) {
				out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1].split('%')[0], [4.1,4.7,5.3,5.8], 10))}\n`
				continue
			} else {
				out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1], [14,16,18,19], 2))}\n`
				continue
			}
		}
		if(info.indexOf('防') > -1 || info.indexOf('御') > -1) {
			if(info.indexOf('%') > -1 || info.indexOf('.') > -1) {
				out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1].split('%')[0], [5.1,5.8,6.6,7.3], 10))}\n`
				continue
			} else {
				out += `${sp[0]}: ${renderRank(uniAnalysis(sp[1], [16,19,21,23], 2))}\n`
				continue
			}
		}
		out += `${sp[0]}: 无法分析\n`
	}
	return out
}
const renderRank = arr => arr.length ? arr.map(x => x.index.split('').map(x => ['D','B','C','A'][parseInt(x)]).join('')).join(', ') : '无法分析'

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
