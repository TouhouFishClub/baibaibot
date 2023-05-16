const fs = require('fs-extra')
const path = require("path-extra")
const util = require('node:util')
const request = require('request')
const requestPromise = util.promisify(request)

let expire = 0
const targetPath = path.join(__dirname, '..', '../coolq-data/cq/data/image/send/tapFish/')

const fetchImage = (url, filename) => new Promise((resolve, reject) => {
	const reqs = request({
		url,
		method: "GET",
		headers:{
			'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
		},
		followRedirect: true
	}, (error, response, body) => {
		if(error && error.code){
			console.log('tap fish load image fail!')
			reject(error)
		}
	}).pipe(fs.createWriteStream(path.join(targetPath, filename)))
	reqs.on('close', () => {
		resolve('success')
	})
})

const vvhanApi = async filename => {
	await fetchImage(`http://api.vvhan.com/api/moyu`, filename)
}

const tuotuodeApi = async filename => {
	console.log(`\n\n\n\n\n=== tuotuode api ===`)
	let res = await requestPromise(`https://j4u.ink/moyuya`)
	let d = JSON.parse(res.body), sourceUrl = d.data.moyu_url
	// console.log(sourceUrl)
	// let res2 = await requestPromise(sourceUrl)
	// console.log('===')
	// console.log(res2)
	// return false
	await fetchImage(sourceUrl, filename)
}

const tapFish = async callback => {
	let d = new Date(), filename = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}.png`
	fs.ensureDirSync(targetPath, 0o2777)
	if(fs.existsSync(path.join(targetPath, filename)) && Date.now() < expire) {
		console.log('=============== 已经下载过文件，直接发送')
	} else {
		console.log('=============== 未下载过文件，先启用下载')
		try {
			await tuotuodeApi(filename)
		} catch (e) {
			console.log(e)
			return
		}
		expire = Date.now() + 30*60*1000
	}
	callback(`[CQ:image,file=send/tapFish/${filename}]`)
}

module.exports = {
	tapFish
}