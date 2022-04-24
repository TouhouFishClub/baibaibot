const https = require('https');
const iconv = require('iconv-lite')
const path = require('path-extra')
const _ = require('lodash')
const HTMLParser = require('node-html-parser');
const { drawTxtImage } = require('../../../cq/drawImageBytxt')

let gachaInfo = [

]

const mabiGacha = async (user, callback, gachaType, gachaGroup) => {
	if(!gachaInfo.length) {
		await loadGachaGroup()
	}
	let gachaCount = 60, gacha = gachaInfo[0]
	let items = randomGacha(gacha, gachaCount)
	let str =  `你抽了${gachaCount}次${gacha.name}，其中\nS级: ${items.filter(x => x.rare == 'S').length}次 (${(items.filter(x => x.rare == 'S').length / gachaCount * 100).toFixed(2)}% / ${gachaInfo.rare['S'][1]}%)\nA级: ${items.filter(x => x.rare == 'A').length}次 (${(items.filter(x => x.rare == 'A').length / gachaCount * 100).toFixed(2)}% / ${gachaInfo.rare['A'][1]}%)\nB级: ${items.filter(x => x.rare == 'B').length}次 (${(items.filter(x => x.rare == 'B').length / gachaCount * 100).toFixed(2)}% / ${gachaInfo.rare['B'][1]}%)\nC级: ${items.filter(x => x.rare == 'C').length}次 (${(items.filter(x => x.rare == 'C').length / gachaCount * 100).toFixed(2)}% / ${gachaInfo.rare['C'][1]}%)\nD级: ${items.filter(x => x.rare == 'D').length}次 (${(items.filter(x => x.rare == 'D').length / gachaCount * 100).toFixed(2)}% / ${gachaInfo.rare['D'][1]}%)\n其中S级有：\n${items.filter(x => x.rare == 'S').map(x => x.item).join('\n')}`
	drawTxtImage(`[CQ:at,qq=${user}]`, str, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

const randomGacha = (gachaInfo, count) => {
	let items = [], rareTag = _.concat(
		new Array(~~(gachaInfo.rare['S'][1] * 100)).fill('S'),
		new Array(~~(gachaInfo.rare['A'][1] * 100)).fill('A'),
		new Array(~~(gachaInfo.rare['B'][1] * 100)).fill('B'),
		new Array(~~(gachaInfo.rare['C'][1] * 100)).fill('C'),
		new Array(~~(gachaInfo.rare['D'][1] * 100)).fill('D')
	)
	for(let i = 0; i < count; i++) {
		let targetRare = rareTag[~~(Math.random() * rareTag.length)]
		let target = gachaInfo.rare[targetRare][2][~~(Math.random() * gachaInfo.rare[targetRare][2].length)]
		items.push({
			rare: targetRare,
			item: target
		})
	}
	return items
}

const loadGachaGroup = async () => {
	let article = await fetchData(`https://luoqi.tiancity.com/homepage/article/Class_231_Time_1.html`)
	// 拆分
	let urls = splitStr(article, '<ul class="newsList">', '</ul>', true).split('</li>').map(x => {
		return splitStr(x, '//', '"', true)
	}).map(x => x.trim()).filter(x => x.startsWith('luoqi.tiancity.com')).map(x => `https://${x}`)
	if(urls.length) {
		let target = []
		for(let i = 0; i < urls.length; i ++) {
			// 遍历url
			// console.log(`=== fetch ${urls[i]} ===`)
			let data = await fetchData(urls[i])
			data = splitStr(data, 'id="newscontent"', '</dd>')
			let tar = data.split('\n').filter(x => x.indexOf('查看概率') > -1)[0]
			console.log('=========')
			console.log(tar)
			if(tar) {
				let obj = {}
				// console.log(splitStr(tar, '-', '<a', true).replace(/<\/?\w+>/g, '').replace(/【/, '').split(' '))
				obj.name = splitStr(tar, '-', '<a', true).replace(/<\/?\w+>/g, '').replace(/【/, '').split(' ').filter(x => x && x.match(/礼包/))[0]
				obj.link = splitStr(tar, '<a href="', '"', true)
				target.push(obj)
			}
		}
		target = target.filter(x => x.link.startsWith('https://') || x.link.startsWith('http://'))
		console.log(target)
		for(let j = 0; j < target.length; j++) {
			let info = {}
			let t = target[j]
			info.name = t.name
			let data = await fetchData(t.link)
			// let sp = splitStr(data, '<body', '</body>')
			let pl = splitStr(splitStr(data, 'var pl', '}'), '{', '}')
			// console.log('================\n\n\n\n')
			// let root = HTMLParser.parse(sp).querySelectorAll('table').toString()
			// console.log(root)
			// console.log(pl)
			// console.log(data)
			// console.log('\n\n\n\n================')
			// root.querySelectorAll('tr').forEach(tr => {
			// 	console.log('=============')
			// 	console.log(tr)
			// 	tr.querySelectorAll('td').forEach(td => {
			// 		console.log(td)
			// 	})
			// })
			// console.log(root)
			try {
				let raremap
				eval(`raremap = ${pl.trim()}`)
				info.rare = raremap
				gachaInfo.push(info)
			} catch (e) {
				console.log('====== MABINOGI GACHA ERROR ======')
				console.log(e)
			}
		}
		// console.log(gachaInfo)
	}
}

const fetchData = async url => {
	return new Promise(resolve => {
		https.get(url, res => {
			res.setEncoding('utf16le');
			let rawData = '';
			res.on('data', chunk => {
				rawData += iconv.decode(iconv.encode(chunk, 'utf16'), 'gbk');
			});
			res.on('end', () => {
				resolve(rawData)
			})
			res.on('error', e => {
				console.log(`===== FETCH DATA ERROR：${url} =====`)
				console.log(e.message)
				resolve('')
			})
		})

	})
}

const splitStr = (str, start, end, ignoreSearch = false) => {
	let subStr = str
	let st = subStr.indexOf(start)
	if(start && st >= 0) {
		subStr = subStr.substring(st + (ignoreSearch ? start.length : 0))
	}
	let et = subStr.indexOf(end)
	if(end && et >= 0) {
		subStr = subStr.substring(0, et + (ignoreSearch ? 0 : end.length))
	}
	return subStr
}

module.exports = {
	mabiGacha
}
