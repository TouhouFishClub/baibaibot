const https = require("https");

const carrot = async callback => {
	let res = await fetchData()
	console.log(res)
	console.log('end', splitText(res, 'var end = "', '"', false))
	console.log('now', splitText(res, 'var now = "', '"', false))
	res.split('当前胡萝卜售价').slice(1).map(str => {
		console.log(splitText(str, '<span>', '</span>', true))
	})
}

const splitText = (str, start, end = '', ignore = false) => {
	if(str.length == '') {
		return str
	}
	let si = str.indexOf(start), ei = end.length ? str.indexOf(end) : str.length
	if(si < 0) {
		si = 0
		start = ''
	}
	if(ei < 0) {
		ei = str.length
		end = ''
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
carrot()

// module.exports = {
// 	carrot
// }