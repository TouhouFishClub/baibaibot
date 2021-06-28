const { baiduocr } = require('../image/baiduocr');

const Reliquary = (content, callback) => {
	let n = content.indexOf('[CQ:image,')
	if(n > -1){
		content.substr(n).split(',').forEach(p => {
			let sp = p.split('=')
			if(sp[0] == 'url'){
				// console.log(sp[1])
				baiduocr(sp[1], d => {
					let filter = d.split('\n').filter(x => /$/)
				})
			}
		})
	} else {
		callback('没有识别到图片')
	}
}

module.exports = {
	Reliquary
}
