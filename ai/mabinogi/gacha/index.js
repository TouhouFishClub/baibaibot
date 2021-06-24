const https = require('https');
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
	console.log(urls)

}

const fetchData = async url => {
	return new Promise(resolve => {
		https.get(url, res => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', chunk => {
				rawData += chunk;
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
