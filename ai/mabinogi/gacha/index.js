const https = require('https');
const iconv = require('iconv-lite')
const path = require('path-extra')
const _ = require('lodash')
const HTMLParser = require('node-html-parser');
const { drawTxtImage } = require('../../../cq/drawImageBytxt')

const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../../../baibaiConfigs').mongourl;
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_mabinogi_gacha'

let userPointCount = new Map()
let userGachaLimit = {}

let gachaInfo = [

]

let client

const createTimeStr = ts => {
	ts = ~~(ts / 1000)
	let out = []
	for(let i = 0; i < 3; i ++) {
		if(ts) {
			let t = ts
			if(i < 2) {
				t = ts % 60
			}
			if(t) {
				out.unshift(`${t}${['秒', '分', '小时'][i]}`)
			}
			ts = ~~(ts/60)
		}
	}
	return out.join('')
}

const mabiGacha = async (user, callback, gachaCount = 60, gachaGroup) => {
	if(!gachaInfo.length) {
		await loadGachaGroup()
	}
	let gacha = gachaInfo[0], isHunDan = false
	if(gacha.rare['C'][2].length == 0 && gacha.rare['D'][2].length == 0) {
		isHunDan = true
	}

	let point = 0

	switch(gachaCount) {
		case 1:
			point = isHunDan ? 500 : 50
			break
		case 11:
			if(isHunDan)
				gachaCount = 11
			point = isHunDan ? 5400 : 500
			break
		case 60:
			if(isHunDan)
				gachaCount = 11
			point = isHunDan ? 5400 : 2640
			break
		case 600:
			if(isHunDan)
				gachaCount = 110
			point = isHunDan ? 54000 : 26400
			break
		default:
			point = 0
	}
	let items = randomGacha(gacha, gachaCount)

	// console.log(point)
	if(userGachaLimit[user]) {
		if(Date.now() < userGachaLimit[user].expire) {
			drawTxtImage(`[CQ:at,qq=${user}]`, `你还在搬砖赚钱，请${createTimeStr(userGachaLimit[user].expire - Date.now())}后再抽`, callback, {color: 'black', font: 'STXIHEI.TTF'})
			return
		} else {
			userGachaLimit[user] = {
				breakPoint: point,
				expire: Date.now() + point * 100
			}
		}
	} else {
		userGachaLimit[user] = {
			breakPoint: point,
			expire: Date.now() + point * 100
		}
	}


	if(userPointCount.has(user)) {
		userPointCount.set(user, userPointCount.get(user) + point)
	} else {
		userPointCount.set(user, point)
	}


	let str =  `你抽了${gachaCount}次${gacha.name}，其中(本次概率 / 官方概率)\nS级: ${items.filter(x => x.rare == 'S').length}次 (${(items.filter(x => x.rare == 'S').length / gachaCount * 100).toFixed(2)}% / ${gacha.rare['S'][1]}%)\nA级: ${items.filter(x => x.rare == 'A').length}次 (${(items.filter(x => x.rare == 'A').length / gachaCount * 100).toFixed(2)}% / ${gacha.rare['A'][1]}%)\nB级: ${items.filter(x => x.rare == 'B').length}次 (${(items.filter(x => x.rare == 'B').length / gachaCount * 100).toFixed(2)}% / ${gacha.rare['B'][1]}%)\nC级: ${items.filter(x => x.rare == 'C').length}次 (${(items.filter(x => x.rare == 'C').length / gachaCount * 100).toFixed(2)}% / ${gacha.rare['C'][1]}%)\nD级: ${items.filter(x => x.rare == 'D').length}次 (${(items.filter(x => x.rare == 'D').length / gachaCount * 100).toFixed(2)}% / ${gacha.rare['D'][1]}%)\n`

	if(items.filter(x => x.rare == 'S').length > 0) {
		str += `其中S级有：\n${items.filter(x => x.rare == 'S').map(x => x.item).sort().join('\n')}`
	} else if(items.filter(x => x.rare == 'A').length > 0) {
		str += `其中A级有：\n${items.filter(x => x.rare == 'A').map(x => x.item).sort().join('\n')}`
	} else if(items.filter(x => x.rare == 'B').length > 0) {
		str += `其中B级有：\n${items.filter(x => x.rare == 'B').map(x => x.item).sort().join('\n')}`
	} else if(items.filter(x => x.rare == 'C').length > 0) {
		str += `其中C级有：\n${items.filter(x => x.rare == 'C').map(x => x.item).sort().join('\n')}`
	} else if(items.filter(x => x.rare == 'D').length > 0) {
		str += `其中D级有：\n${items.filter(x => x.rare == 'D').map(x => x.item).sort().join('\n')}`
	}

	str += `\n你已经用了${userPointCount.get(user)}点`

	// console.log(str)
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
		target = target.filter(x => (x.link.startsWith('https://') || x.link.startsWith('http://')) && x.name)
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
				let raremap = {}
				// console.log(`raremap = ${pl.trim()}`)
				eval(`raremap = ${pl.trim()}`)
				info.rare = raremap
				gachaInfo.push(info)

				if(!client) {
					try {
						client = await MongoClient.connect(MONGO_URL)
					} catch (e) {
						console.log('MONGO ERROR FOR MABINOGI GACHA MODULE!!')
						console.log(e)
					}
				}
				let col = client.collection('cl_mabinogi_gacha_info'), rareKeys = Object.keys(raremap)
				for(let i = 0; i < rareKeys.length; i ++) {
					let rareInfo = raremap[rareKeys[i]]
					let [color, rare, rareList] = rareInfo
					for(let j = 0; j < rareList.length; j ++) {
						let target = await col.findOne({_id: rareList[j]})
						if(target) {
							if(target.info.findIndex(x => x.pool === info.name) === -1) {
								await col.updateOne(
									{ _id: rareList[j] },
									{
										'$set': {
											info: target.info.concat([{
												pool: info.name,
												rare,
												color,
												rareTag: rareKeys[i]
											}])
										}
									}
								)
							}
						} else {
							await col.save({
								_id: rareList[j],
								info: [
									{
										pool: info.name,
										rare,
										color,
										rareTag: rareKeys[i]
									}
								]
							})
						}
					}
				}
			} catch (e) {
				console.log(`====== MABINOGI GACHA ERROR ======`)
				console.log(t.name)
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
	mabiGacha,
	fetchData
}
