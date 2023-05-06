const fs = require('fs-extra')
const path = require("path-extra")
const request = require('request')

const targetPath = path.join(__dirname, '../coolq-data/cq/data/image/send/tapFish/')

const fetchImage = filename => new Promise((resolve, reject) => {
	const reqs = request({
		url: `https://api.vvhan.com/api/moyu`,
		method: "GET",
		headers:{
			'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
		}
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


const tapFish = async callback => {
	let d = new Date(), filename = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}.png`
	fs.ensureDirSync(targetPath, 0o2777)
	if(fs.existsSync(path.join(targetPath, filename))) {
		console.log('=============== 已经下载过文件，直接发送')
	} else {
		console.log('=============== 未下载过文件，先启用下载')
		try {
			await fetchImage(filename)
		} catch (e) {
			console.log(e)
			return
		}
	}
	callback(`[CQ:image,file=send/tapFish/${filename}]`)
}

module.exports = {
	tapFish
}