const http = require("http")
const https = require("https")
const { myip } = require('../../baibaiConfigs')
const { drawTxtImage } = require('../../cq/drawImageBytxt')

const carrot = async (getData, callback) => {
	let res = await fetchData(), out = ''
	let next = splitText(res, 'var end = "', '";', true), nextTs = new Date(next).getTime()
	out += `下次刷新时间: ${next}\n`
	let nowTs = parseInt(splitText(res, 'var now = "', '";', true))
	// out += `当前时间: ${nowTs}\n`
	out += `当前胡萝卜售价:\n`
	let goodPrice = false
	res.split('当前胡萝卜售价').slice(1).map((str, i) => {
		let price = splitText(str, '<span>', '</span>', true)
		if(price == 5) {
			goodPrice = true
		}
		out += `${['菲利亚', '巴勒斯', '克拉'][i]}: ${price}贸易货币/胡萝卜\n`
	})
	// callback(out)
	if(getData) {
		return {
			out,
			nextTs,
			nowTs,
			goodPrice
		}
	} else {
		drawTxtImage(``, out, callback, {color: 'black', font: 'STXIHEI.TTF'})
	}
}

const splitText = (str, start, end = '', ignore = false) => {
	if(str.length == '') {
		return str
	}
	let si = str.indexOf(start), strTmp = str
	if(si < 0) {
		si = 0
		start = ''
	} else {
		strTmp = str.substring(si + start.length)
	}
	let ei = end.length ? strTmp.indexOf(end) : str.length
	if(ei < 0) {
		ei = str.length
		end = ''
	} else {
		ei = si + start.length + ei
	}

	return ignore ? str.substring(si + start.length, ei) : str.substring(si, ei + end.length)
}

const fetchData = async () => {
	return new Promise(resolve => {
		https.get(`https://evt05.tiancity.com/luoqi/51587/home/index.php`, res => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', chunk => {
				rawData += chunk
			});
			res.on('end', () => {
				resolve(rawData)
			})
			res.on('error', e => {
				console.log(`===== FETCH MABINOGI CARROT DATA ERROR =====`)
				console.log(e.message)
				resolve('')
			})
		})
	})
}
// carrot(d=> {
// 	console.log(d)
// })

const autoWhiteList = [{
	id: 727605874,
	port: 29334
}]

const autoSendMsg = (msg) => {
	autoWhiteList.forEach(group => {
		let options = {
			host: myip,
			port: group.port,
			path: `/send_group_msg?group_id=${group.id}&message=${encodeURIComponent(`【自动查询】\n${msg}`)}`,
			method: 'GET',
			headers: {}
		}
		let req = http.request(options);
		req.on('error', function(err) {
			console.log('req err:');
			console.log(err);
		});
		req.end();
	})
}


const startTimeout = async (isFirst = false) => {
	let data = await carrot(true)
	if(data.goodPrice) {
		autoSendMsg(`${data.out}${data.goodPrice ? '\n赶紧卖萝卜！！！！': ''}`)
	}
  let timeLeft = data.nextTs - data.nowTs + 10000
  setTimeout(() => {
    startTimeout()
  }, timeLeft)
}

startTimeout(true)

module.exports = {
	carrot
}