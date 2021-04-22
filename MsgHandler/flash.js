const http = require('http')
const fs = require('fs-extra')
const path = require('path-extra')
const basicPath = '/home/hduser/upload/tk/mb'

const flashHandler = (qq, groupid, cacheFile, port, isResend, callback) => {

	let url = `http://gchat.qpic.cn/gchatpic_new/${qq}/${groupid}-${~~(Math.random() * 10000000000)}-${cacheFile}/0?term=3`

	if(isResend) {
		callback(`检测到闪照：[CQ:image,url=http://gchat.qpic.cn/gchatpic_new/${qq}/${groupid}-${~~(Math.random() * 10000000000)}-${cacheFile}/0?term=3]`)
	} else {
		// callback(`检测到闪照，我自己偷偷存下了`)
	}


	// var options = {
	// 	host: '192.168.17.52',
	// 	port: port,
	// 	path: `/get_image?file=${cacheFile}`,
	// 	method: 'GET',
	// 	headers: {}
	// };
	// var req = http.request(options, res => {
	// 	let resdata = ''
	// 	res.on('data', chunk => {
	// 		resdata = resdata + chunk
	// 	})
	// 	res.on('end', () => {
	// 		if(resdata.length > 0){
	// 			try {
	// 				let d = JSON.parse(resdata)
	// 				let filePath = d.data.file
	// 			} catch {
	// 				console.log('ERROR: 【闪照】转换JSON错误')
	// 			}
	// 			// callback(`port: ${port}\ndata: ${resdata}`);
	// 		}
	// 	})
	// })
	// req.on('error', err => {
	// 	console.log('req err:')
	// 	console.log(err)
	// })
	// req.end()
}
module.exports = {
	flashHandler
}
