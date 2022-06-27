const https = require("https")
const { drawTxtImage } = require('../../cq/drawImageBytxt')

const carrot = async callback => {
	let res = await fetchData(), out = ''
	out += `下次刷新时间: ${splitText(res, 'var end = "', '";', true)}\n`
	// out += `当前时间: ${splitText(res, 'var now = "', '";', true)}\n`
	out += `当前胡萝卜售价:\n`
	res.split('当前胡萝卜售价').slice(1).map((str, i) => {
		let price = splitText(str, '<span>', '</span>', true)
		out += `${['菲利亚', '巴勒斯', '克拉'][i]}: ${price}贸易货币/胡萝卜\n`
	})
	// callback(out)
	drawTxtImage(``, out, callback, {color: 'black', font: 'STXIHEI.TTF'})
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

module.exports = {
	carrot
}