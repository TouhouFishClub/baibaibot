const https = require('https')
const qs = require('qs')
const path = require("path-extra");
let GroupExpire = {

}

let DataExpire = {
	data: [],
	expire: 0
}

const getVoteData = (page, type, status) => new Promise((resolve, reject) => {
	let options = {
		host: 'evt05.tiancity.com',
		port: 443,
		path: '/luoqi/51724/home/index.php/comfort',
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

const searchTarget = (listData, targetName) => {
	let index = listData.findIndex(x => x.name == targetName)
	if(index < 0) {
		return {page:0,line:0,index:0}
	}
	let page = ~~(index / 12) + 1
	index = index % 12
	let line = ~~(index / 3) + 1
	index = index % 3 + 1
	return {page, line, index}
}

// const init = async () => {
// 	let listData = []
// 	for(let i = 1; i < 5; i ++) {
// 		let d = await getVoteData(i,1,2)
// 		try {
// 			d = JSON.parse(d)
// 			listData = listData.concat(d.data.lists)
// 		} catch(e) {
// 			console.log(e)
// 		}
// 	}
// 	listData.sort((a, b) => b.count - a.count)
// 	let {page, line, index} = searchTarget(listData, 'Flandre')
// 	console.log(`目标在第${page}页，第${line}行，第${index}个`)
// 	console.log(listData.map(x => `[${fixStrLength(4, x.id)}][${['亚特  ','伊鲁夏'][x.server - 1]}]${fixStrLength(12, x.name)}: 《${x.content}》(${x.count})`).join('\n'))
// }
// init()

const fetchAllData = async () => {
	let listData = []
	for(let i = 1; i < 5; i ++) {
		let d = await getVoteData(i,1,2)
		try {
			d = JSON.parse(d)
			listData = listData.concat(d.data.lists)
		} catch(e) {
			console.log(e)
		}
	}
	DataExpire = {
		data: listData,
		expire: Date.now() + 30*60*1000
	}
	return listData
}

const autoVoteSend = async (groupId, callback) => {
	let listData = DataExpire.data
	if(Date.now() > DataExpire.expire) {
		listData = await fetchAllData()
	}
	if(Math.random() > 0.2) {
		console.log('==============> 未触发随机值')
		return
	}
	if(listData && listData.length) {
		if(GroupExpire[groupId] && Date.now() < GroupExpire[groupId]){
			console.log('==============> 群发送还在cd')
			return
		}
		let {page, line, index} = searchTarget(listData, 'Flandre')
		GroupExpire[groupId] = Date.now() + 4*60*60*1000
		setTimeout(() => {
			callback(`麻烦大家每天帮百百妈投下票喵~\nhttps://evt05.tiancity.com/luoqi/51724/home/index.php\n首次投票先选择人气，翻到第${page}页找到第${line}排第${index}个（大概）\n然后，点击小星星收藏后就不用每天找得那么辛苦喵\n一天可以投一票，谢谢大家了喵~\n[CQ:image,file=${path.join('send', 'other', `farm.jpg`)}]`)
		}, 20000)
	} else {
		console.log('==============> 没有数据')
	}
}

module.exports = {
	autoVoteSend
}