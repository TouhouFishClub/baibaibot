const https = require('https');
const iconv = require('iconv-lite')
const path = require('path-extra')
const _ = require('lodash')

let gachaInfo = [

]

const mabiGacha = async (user, gachaType, gachaGroup, callback) => {
	if(!gachaInfo.length) {
		await loadGachaGroup()
	}

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
			console.log(`=== fetch ${urls[i]} ===`)
			let data = await fetchData(urls[i])
			data = splitStr(data, 'id="newscontent"', '</dd>')
			let tar = data.split('\n').filter(x => x.indexOf('查看概率') > -1)[0]
			console.log('=========')
			console.log(tar)
			if(tar) {
				let obj = {}
				obj.name = splitStr(tar, '-', '<a', true).trim()
				obj.link = splitStr(tar, '<a href="', '"', true)
				target.push(obj)
			}
		}
		target = target.filter(x => x.link.startsWith('https://') || x.link.startsWith('http://'))
		console.log(target)
		for(let j = 0; j < target.length; j++) {
			let t = target[j]
			let data = await fetchData(t.link)
			splitStr(data, '<table', '</table>')
		}
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
