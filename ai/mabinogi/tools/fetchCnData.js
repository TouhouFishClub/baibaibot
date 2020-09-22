const http = require('http')
const iconv = require('iconv-lite')
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://192.168.1.19:27017/db_bot'

const config = {
	headUrl: '/wiki/forum.php?mod=forumdisplay&fid=3&sortid=2&filter=sortid&sortid=2&searchsort=1&enchantps=1&page=',
	endUrl: '/wiki/forum.php?mod=forumdisplay&fid=3&filter=sortid&sortid=2&searchsort=1&enchantps=2&page=',
	headMaxPage: 15,
	endMaxPage: 16,
}

const getPageData = url => {
	return new Promise((resolve) => {
		const options = {
			hostname: 'www.mabinogi.club',
			port: 80,
			path: url,
			method: 'GET',
			headers:{
				'Referer': 'http://www.mabinogi.club/wiki/forum.php?mod=forumdisplay&fid=3&sortid=2&filter=sortid&sortid=2&searchsort=1&enchantps=1&page=1',
				'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
			},
		}
		const req = http.request(options, (res) => {
			let chunks = [], size = 0
			res.on('data', (chunk) => {
				chunks.push(chunk)
				size += chunk.length
			});
			res.on('end', () => {
				let buf = Buffer.concat(chunks, size)
				resolve(iconv.decode(buf, 'gbk'))
			});
		});
		req.on('error', (e) => {
			console.error(`problem with request: ${e.message}`);
			resolve('')
		});
		req.end();
	})
}

const formatData = data => {
	let str = splitText(data, '<table class="enchantlist tac">', '</table>', true)
	let sp = str.split('</tr>')
	sp.shift()
	sp.pop()
	let out = []
	sp.forEach(ele => {
		let obj = {}
		let sd = ele.split('</td>')
		obj.level = splitText(sd[0], '<span class="pipe"></span>', '', true).trim()
		obj.name = splitText(sd[0], '.html">', '</a>', true).split('-')[0].trim()
		obj.site = splitText(sd[1], '<td>', '', true)
			.replace(new RegExp('<br>', 'g'), ' ')
			.replace(new RegExp('&nbsp;', 'g'), ' ')
			.replace(/ +/g, ' ')
			.split(' ')
			.map(x => x.trim())
			.filter(x => x != '')
		obj.buff = splitText(sd[2], '<span class="buff">', '</span>', true)
			.split('\n')
			.map(x => x.trim())
			.filter(x => x != '')
		obj.debuff = splitText(sd[2], '<p class="rq">', '</p>', true)
			.split('\n')
			.map(x => x.trim())
			.filter(x => x != '')
		obj.where = splitText(sd[3], '<pre>', '</pre>', true)
			.split('\n')
			.map(x => x.trim())
			.filter(x => x != '')
		console.log(`===> ${obj.name}`)
		out.push(obj)
	})
	return out
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

(async () => {
	/* init db */
	let client, collection

	try {
		client = await MongoClient.connect(MONGO_URL)
	} catch (e) {
		console.log('MONGO ERROR FOR PCR GUILD RANK MODULE!!')
		console.log(e)
	}

	let allData = []
	for(let i = 1; i <= config.headMaxPage; i ++) {
		console.log(`=== head page ${i} ===`)
		let d = await getPageData(`${config.headUrl}${i}`)
		allData = allData.concat(formatData(d))
	}
	for(let i = 1; i <= config.endMaxPage; i ++) {
		console.log(`=== end page ${i} ===`)
		let d = await getPageData(`${config.endUrl}${i}`)
		allData = allData.concat(formatData(d))
	}
	collection = client.collection('cl_mabinogi_optionset')

	for(let i = 0; i < allData.length; i ++) {
		await collection.save(Object.assign({'_id': allData[i].name}, allData[i]))
	}
	console.log('save success!!')
})()
