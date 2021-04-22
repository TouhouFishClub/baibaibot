const http = require('http')
const flashHandler = (cacheFile, port, isResend, callback) => {
	var options = {
		host: '192.168.17.52',
		port: port,
		path: `get_image?file=${cacheFile}`,
		method: 'GET',
		headers: {}
	};
	var req = http.request(options, res => {
		let resdata = ''
		res.on('data', chunk => {
			resdata = resdata + chunk
		})
		res.on('end', () => {
			if(resdata.length>0){
				callback(`port: ${port}\ndata: ${resdata}`);
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
	flashHandler
}
