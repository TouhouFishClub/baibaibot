const https = require('https')
const iconv = require('iconv-lite')
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'

const config = {
	headUrl: '/forum.php?mod=forumdisplay&fid=3&sortid=2&filter=sortid&sortid=2&searchsort=1&enchantps=1&page=',
	endUrl: '/forum.php?mod=forumdisplay&fid=3&sortid=2&filter=sortid&sortid=2&searchsort=1&enchantps=2&page=',
	headMaxPage: 15,
	endMaxPage: 16,
}

const getPageData = url => {
	return new Promise((resolve) => {
		const options = {
			hostname: 'wiki.mabinogi.club',
			port: 443,
			path: url,
			method: 'GET',
			headers:{
				// 'Referer': 'http://wiki.mabinogi.club/forum.php?mod=forumdisplay&fid=3&sortid=2&filter=sortid&sortid=2&searchsort=1&enchantps=2&page=16',
				'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
			},
		}
		const req = https.request(options, (res) => {
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

const formatData = (data, Usage = '0') => {
	let str = splitText(data, '<table class="enchantlist tac">', '</table>', true)
	let sp = str.split('</tr>')
	sp.shift()
	sp.pop()
	let out = []
	sp.forEach(ele => {
		let obj = {}
		let sd = ele.split('</td>')
		obj.Usage = Usage
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
		// console.log(`===> ${obj.name}`)
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
		console.log('MONGO ERROR FOR MABINOGI OPTIONSET MODULE!!')
		console.log(e)
	}

	let allData = []
	for(let i = 1; i <= config.headMaxPage; i ++) {
		console.log(`=== head page ${i} ===`)
		let d = await getPageData(`${config.headUrl}${i}`)
		allData = allData.concat(formatData(d, '0'))
	}
	for(let i = 1; i <= config.endMaxPage; i ++) {
		console.log(`=== end page ${i} ===`)
		let d = await getPageData(`${config.endUrl}${i}`)
		allData = allData.concat(formatData(d, '1'))
	}
	collection = client.collection('cl_mabinogi_optionset')

	for(let i = 0; i < allData.length; i ++) {
		let idQuery = `${allData[i].name.trim()}_${allData[i].level.trim().toUpperCase()}`
		let target = await collection.findOne({ '_id': idQuery })
		if(target) {
			await collection.updateOne(
				{ '_id': idQuery },
				{ '$set': allData[i] }
			)
		} else {
			await collection.save(Object.assign({'_id': idQuery}, allData[i]))
		}
	}
	console.log('save success!!')
})()
