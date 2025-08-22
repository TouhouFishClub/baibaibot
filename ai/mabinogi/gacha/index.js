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
let userSelectGacha = {

}

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

const groupWhiteList = new Set([
	250324987,
	577587780,
	727605874,
	271340645,
	629965211,
	910505194,
	315902131,
	949651646,
	891964430,
	584155191,
	725252375,
	// 1011153915
])

const matchItemWeight = [
	{regexp: new RegExp('亡灵'), rare: 0.9},
	{regexp: new RegExp('惊悚'), rare: 0.95},
	{regexp: new RegExp('阴沉'), rare: 0.95},
	{regexp: new RegExp('战栗'), rare: 0.95},
	{regexp: new RegExp('特殊恶'), rare: 0.97},
	{regexp: new RegExp('PLUS辅助'), rare: 0.97},
]

const checkWriteList = (user, groupId) => {
	return user == 799018865 || groupWhiteList.has(groupId)
}

const mabiGacha = async (user, groupId, callback, gachaCount = 60, gachaGroup) => {
	if(!checkWriteList(user, groupId)) {
		return
	}
	if(!gachaInfo.length) {
		await loadGachaGroup()
	}
	let gacha = gachaInfo[userSelectGacha[user] || 0], isHunDan = false, isShengDi = false, isChongwu = false, otherCount = 0
  if(gacha.name.indexOf('宠物') > -1) {
    isChongwu = true
  } else if(gacha.name.indexOf('圣地钥匙') > -1) {
    isShengDi = true
  } else if(gacha.rare['C'][2].length == 0 && gacha.rare['D'][2].length == 0) {
		isHunDan = true
	}

	let point = 0

	switch(gachaCount) {
		case 1:
			point = isHunDan ? 500 : isShengDi ? 100 : isChongwu ? 398 :50
			break
		case 11:
			if(isHunDan)
				gachaCount = 11
			if(isChongwu)
				gachaCount = 10
			if(isShengDi)
				otherCount = 1
			point = isHunDan ? 5400 : isShengDi ? 1000 : isChongwu ? 3980 :500
			break
		case 60:
			if(isHunDan)
				gachaCount = 11
      if(isChongwu)
        gachaCount = 6
			if(isShengDi)
				otherCount = 15
			point = isHunDan ? 5400 : isShengDi ? 6000 : isChongwu ? 1658 : 2640
			break
		case 600:
			if(isHunDan)
				gachaCount = 110
      if(isChongwu)
        gachaCount = 60
			if(isShengDi)
				otherCount = 150
			point = isHunDan ? 54000 : isShengDi ? 60000 : isChongwu ? 16580 :26400
			break
		default:
			point = 0
	}
	let { items, matchInfo } = randomGacha(gacha, gachaCount)

	// console.log(point)

	// if(userGachaLimit[user]) {
	// 	if(Date.now() < userGachaLimit[user].expire) {
	// 		drawTxtImage(`[CQ:at,qq=${user}]`, `你还在搬砖赚钱，请${createTimeStr(userGachaLimit[user].expire - Date.now())}后再抽`, callback, {color: 'black', font: 'STXIHEI.TTF'})
	// 		return
	// 	} else {
	// 		userGachaLimit[user] = {
	// 			breakPoint: point,
	// 			expire: Date.now() + point * 1000
	// 		}
	// 	}
	// } else {
	// 	userGachaLimit[user] = {
	// 		breakPoint: point,
	// 		expire: Date.now() + point * 1000
	// 	}
	// }


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

	str += `\n-------------------\n`

	if(isShengDi && otherCount) {
		let oc = randomGacha(gacha, otherCount, new Set(['S', 'A']))

		str +=  `你获得了${otherCount}次特殊礼包\n`

		if(oc.items.filter(x => x.rare == 'S').length > 0) {
			str += `其中S级有：\n${oc.items.filter(x => x.rare == 'S').map(x => x.item).sort().join('\n')}`
		} else if(oc.items.filter(x => x.rare == 'A').length > 0) {
			str += `其中A级有：\n${oc.items.filter(x => x.rare == 'A').map(x => x.item).sort().join('\n')}`
		}

	}

	str += `${matchInfo.join('\n')}\n`

	str += `\n你已经用了${userPointCount.get(user)}点`

	// console.log(str)
	drawTxtImage(`[CQ:at,qq=${user}]`, str, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

const selectGachaGroup = async (user, groupId, callback, select) => {
	if(!checkWriteList(user, groupId)) {
		return
	}
	if(!gachaInfo.length) {
		await loadGachaGroup()
	}
	if(select) {
		if(select < gachaInfo.length) {
			userSelectGacha[user] = select
			callback(`选择 ${gachaInfo[select].name} 成功`)
		} else {
			callback(`选择失败`)
		}
	} else {
		callback(`请选择蛋池\n${gachaInfo.map((x, i) => `洛奇蛋池${i} | ${x.name}${userSelectGacha[user] ? (userSelectGacha[user] == i ? '（√）' : '') : (i == 0 ? '（√）' : '')}`).join(`\n`)}`)
	}
}

const randomGacha = (gachaInfo, count, rareLimitSet) => {
	let items = [], rareTag = _.concat(
		new Array(~~(gachaInfo.rare['S'][1] * 100)).fill('S'),
		new Array(~~(gachaInfo.rare['A'][1] * 100)).fill('A'),
		new Array(~~(gachaInfo.rare['B'][1] * 100)).fill('B'),
		new Array(~~(gachaInfo.rare['C'][1] * 100)).fill('C'),
		new Array(~~(gachaInfo.rare['D'][1] * 100)).fill('D')
	), matchInfo = []
	for(let i = 0; i < count; i++) {
		let targetRare = rareTag[~~(Math.random() * rareTag.length)]
		if(rareLimitSet && !rareLimitSet.has(targetRare)) {
			i --;
			continue
		}
		let target = gachaInfo.rare[targetRare][2][~~(Math.random() * gachaInfo.rare[targetRare][2].length)]
		let reRandomInfo = matchItemWeight.filter(x => target.match(x.regexp))[0], rd = Math.random()
		if(reRandomInfo && reRandomInfo.rare) {
			if(rd > reRandomInfo.rare) {
				i --
				matchInfo.push(`${target} 炸掉了(${rd.toFixed(3)}/${reRandomInfo.rare})`)
				continue
			} else {
				// matchInfo.push(`${target} 获得了(${rd.toFixed(3)}/${reRandomInfo.rare})`)
			}
		}
		items.push({
			rare: targetRare,
			item: target
		})
	}
	return { items, matchInfo }
}

const loadGachaGroup = async (page = 1, source = false) => {
	let article = await fetchData(`https://luoqi.tiancity.com/homepage/article/Class_231_Time_${page}.html`)
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
			/* 处理不合适的名称 */
			let formatName = t.name
			formatName = formatName.substring(formatName.indexOf('>') + 1)
			if(formatName.indexOf('[') > -1) {
				formatName = formatName.substring(0, formatName.indexOf('['))
			}
			if(formatName.indexOf('<') > -1) {
				formatName = formatName.substring(0, formatName.indexOf('<'))
			}
			info.name = formatName
			let data = await fetchData(t.link)
			// let sp = splitStr(data, '<body', '</body>')
			// console.log(splitStr(data, 'var pl', '}'))
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
				if(source) {
					let rareKeys = Object.keys(raremap), out = []
					for(let i = 0; i < rareKeys.length; i ++) {
						let rareInfo = raremap[rareKeys[i]]
						let [color, rare, rareList] = rareInfo
						for(let j = 0; j < rareList.length; j ++) {
							out.push({
								_id: rareList[j],
								pool: info.name,
								rare,
								color,
								rareTag: rareKeys[i]
							})
						}
					}
					return out
				}

				if(!client) {
					try {
						client = await MongoClient.connect(MONGO_URL)
					} catch (e) {
						console.log('MONGO ERROR FOR MABINOGI GACHA MODULE!!')
						console.log(e)
					}
				}
				let col = client.db('db_bot').collection('cl_mabinogi_gacha_info'), rareKeys = Object.keys(raremap)
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
								alias: rareList[j].replace(/[()（）]/g, ''),
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
				console.log(data)
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
				rawData += chunk
				// rawData += iconv.decode(iconv.encode(chunk, 'utf16'), charset);
			});
			res.on('end', () => {
				let data = iconv.decode(iconv.encode(rawData, 'utf16'), 'utf8')
				let charset = splitStr(data, 'charset=', '"', true)
				// console.log('=======\n\n\n\ncharset', charset)
				resolve(iconv.decode(iconv.encode(rawData, 'utf16'), charset))
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

const Test = async testCount => {
	if(!gachaInfo.length) {
		let o = await loadGachaGroup(1, true)
		console.log(o.filter(x => x.rareTag == 'S').length)
	}
	let count = 0
	for(let i = 0; i < testCount; i ++) {
		let { items } = randomGacha(gachaInfo[0], 1)
		count ++
		if(items[0].item.match('亡灵')) {
			console.log(`第${i + 1}(${count})发抽到了${items[0].item}(${(1 / count).toFixed(7)})`)
			count = 0
		}
	}
}

// Test(1000000)

module.exports = {
	mabiGacha,
	fetchData,
	loadGachaGroup,
	selectGachaGroup
}
