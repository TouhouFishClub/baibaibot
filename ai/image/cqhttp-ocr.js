const http = require('http')
const ocr = (imageId, port, callback) => {
	var options = {
		host: '192.168.17.52',
		port: port,
		path: `/ocr_image?image=${imageId}`,
		method: 'GET',
		headers: {}
	};
	var req = http.request(options, res => {
		let resdata = ''
		res.on('data', chunk => {
			resdata = resdata + chunk
		})
		res.on('end', () => {
			if(resdata.length > 0){
				try {
					let d = JSON.parse(resdata)
					callback(d)
				} catch {
					console.log('ERROR: 【COOLQ HTTP OCR】转换JSON错误')
				}
			}
		})
	})
	req.on('error', err => {
		console.log('req err:')
		console.log(err)
	})
	req.end()
}

module.exports = {
	ocr
}
