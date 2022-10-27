const https = require('https')
const qs = require('qs')

const getVoteData = (page, type, status) => new Promise((resolve, reject) => {
	let options = {
		host: 'evt05.tiancity.com',
		port: 443,
		path: '/luoqi/51633/home/index.php/comfort',
		method: 'POST',
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		}
	}
	let postObj = {
		page, type, status
	}
	let postData = qs.stringify(postObj)

	const req = https.request(options, (res) => {
		res.setEncoding('utf8');
		let data = ''
		res.on('data', (chunk) => {
			// console.log(chunk)
			data += chunk
		});
		res.on('end', () => {
			console.log(`=== request data ${page} ===`)
			resolve(data)
		});
		res.on('error', e => {
			console.log('=== request res error ===')
			reject(e.message)
		})
	});

	req.on('error', (e) => {
		console.log('=== request req error ===')
		reject(`problem with request: ${e.message}`);
	});

	req.write(postData);
	req.end();
})

const fixStrLength = (targetLength, str) => {
	let sl =  str.replace(/[^\u0000-\u00ff]/g, "aa").length
	if (sl < targetLength) {
		return `${str}${new Array(targetLength - sl).fill(' ').join('')}`
	}
	return str
}

const init = async () => {
	let listData = []
	for(let i = 1; i < 36; i ++) {
		let d = await getVoteData(i,1,1)
		try {
			d = JSON.parse(d)
			listData = listData.concat(d.data.lists)
		} catch(e) {
			console.log(e)
		}
	}
	listData.sort((a, b) => b.count - a.count)
	console.log(listData.map(x => `[${fixStrLength(4, x.id)}][${['潘妮','亚特','伊文'][x.server - 1]}]${fixStrLength(12, x.name)}: 《${x.title}》(${x.count})`).join('\n'))
}
init()