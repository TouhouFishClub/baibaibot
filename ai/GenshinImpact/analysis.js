const cheerio = require('cheerio')

const formatArray = argumentObject => {
	if(argumentObject.length && argumentObject[0] && argumentObject.length >= 0) {
		let arr = []
		for(let i = 0; i < argumentObject.length; i++) {
			arr.push(argumentObject[i])
		}
		return arr
	} else {
		return [argumentObject]
	}
}

const analysisHtml = htmlData => {
  const $ = cheerio.load(htmlData)
  // console.log($('.obc-tmpl__part'))
	console.log(typeof $('.obc-tmpl__part'))
	formatArray($('.obc-tmpl__part')).forEach(ele => {
		console.log('==========')
		console.log($(ele).html())
	})
	// console.log('>>>>>>>>>>>')
	// console.log( $('.obc-tmpl__part'))
	// console.log( $('.obc-tmpl__part').html())
}

module.exports = {
  analysisHtml,
}