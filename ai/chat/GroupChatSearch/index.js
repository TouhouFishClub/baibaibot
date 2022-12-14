const { readFileSync } = require('fs')
const { join } = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl, IMAGE_DATA, myip} = require('../../../baibaiConfigs')
const nodeHtmlToImage = require('node-html-to-image')
const path = require("path");
const http = require("http");
const font2base64 = require('node-font2base64')
//FONTS
const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

let personasLimit = {}

let client

const fetchGroupUsers = (groupid, port) =>
	new Promise(resolve => {
		let url = `http://${myip}:${port}/get_group_member_list?group_id=${groupid}`
		http.get(url, (res) => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				try {
					const parsedData = JSON.parse(rawData);
					const groupUsers = parsedData.data.map(x => {
						return {
							uid: x.user_id,
							nid: x.card || x.nickname
						}
					})
					// console.log('===============')
					// console.log(groupUsers)
					// console.log('===============')
					resolve(groupUsers);
				} catch (e) {
					console.error(e.message);
					resolve([])
				}
			});
		}).on('error', (e) => {
			console.error(`Got error: ${e.message}`);
			resolve([])
		})
	})

const fetchGroupData = async (port, groupId, targetArr) => {
	let users = await fetchGroupUsers(groupId, port)
	let userMap = {}
	users.forEach(x => {
		userMap[x.uid] = x.nid
	})
	let groupData = await client.db('db_bot').collection('cl_chat').find({
		_id: { $gt: new Date(Date.now() - 1000*60*60*24*3) },
		gid: groupId,
		'$and': targetArr.map(w => {
			return {
				'd': new RegExp(w)
			}
		})
	}).toArray()
	console.log(`===> group data length: ${groupData.length}`)
	return groupData
}

const searchDesc = (msg, targetArray, offsetStart = 20, offsetEnd = 20) => {
	let st = msg.length, ed = 0
	targetArray.forEach(target => {
		let s = msg.indexOf(target)
		if(s < st) {
			st = s
		}
		if(s + target.length > ed) {
			ed = s + target.length
		}
	})
	return msg.substring(st - offsetStart, ed + offsetEnd)
}

const analysisData = (data, targetArr) => {
	let userTargetSet = new Set(), out = []
	data.filter(x => !(x.d.startsWith('gcs') || x.uid === 1561267174) && (x.d.indexOf('出') > -1 || x.d.indexOf('收') > -1)).forEach(msg => {
		if(!userTargetSet.has(msg.uid)) {
			let content = msg.d.split('[CQ:').map((x, i) => i ? x.split(']')[1]: x).filter(x => x.trim()).join('')
			let desc = searchDesc(content, targetArr)
			if(!desc) {
				return
			}
			let descReplace = desc
			targetArr.forEach(target => {
				descReplace = descReplace.replace(new RegExp(target), `<strong>${target}</strong>`)
			})
			let msgObj = Object.assign(msg, {
				content,
				desc,
				targetArr,
				descReplace
			})
			out.push(msgObj)
			userTargetSet.add(msg.uid)
		}
	})
	return out
}

const addZero = n => n < 10 ? ('0' + n) : n

const formatTime = ts => `${new Date(ts).getMonth() + 1}-${new Date(ts).getDate()} ${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`

const renderData = (data, targetArr, groupId, callback) => {
	// console.log(groupCountObj)
	let fileName = `${groupId}_${targetArr.join('_')}_img.png`
	let output = path.join(IMAGE_DATA, 'other', fileName)
	// let output = path.join(`${groupId}.png`)

	nodeHtmlToImage({
		output,
		html: `
<!DOCTYPE html>
<html>
<head>
  <title>Title</title>
	<meta charSet="utf-8">
	<style>
		@font-face {
			font-family: 'HANYIWENHEI';
			src: url(${HANYIWENHEI}) format('truetype');
		}
		* {
			border: 0;
			padding: 0;
			margin: 0;
		}
		body {
			width: 640px;
			min-height: 20px;
			padding: 20px;
			box-sizing: border-box;
			background: #fff;
			font-size: 14px;
			line-height: 1.4;
			font-family: HANYIWENHEI;
		}
		.main-container {
			background-color: #999;
		}
		.main-container .chat-info-item{
			width: 600px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-top: 15px;
			padding-bottom: 15px;				
		}
		.main-container .chat-info-item + .chat-info-item{
			border-top: 1px solid #999;					
		}
		.main-container .chat-info-item .time{
			width: 150px;
			padding-left: 15px;
			padding-right: 15px;
			box-sizing: border-box;
			text-align: center;
			flex-shrink: 0;
		}
		.main-container .chat-info-item .user-info{
			width: 200px;
			padding-left: 15px;
			padding-right: 15px;
			box-sizing: border-box;
			text-align: center;
			flex-shrink: 0;
		}
		.main-container .chat-info-item .desc{
			flex-grow: 1;
			padding-left: 15px;
			padding-right: 15px;
			box-sizing: border-box;
		}
		.main-container .chat-info-item .desc strong{
			color: #f00;
		}
	</style>
</head>
<body>
<div class="main-container">
	${
		data.map(item => `
			<div class="chat-info-item">
				<div class="time">${formatTime(item.ts)}</div>
				<div class="user-info">
					<div class="user-id">${item.uid}</div>
					<div class="user-nick">${item.n}</div>
				</div>
				<div class="desc">
					${
						item.descReplace.split('\n').map(line => line.trim()).join('<br>')
					}
				</div>
			</div>
		`).join('')
	}
	<hr/>
</div>
</body>
</html>
		`
	})
		.then(() => {
			console.log(`保存${fileName}成功！`)
			let imgMsg = `[CQ:image,file=${join('send', 'other', fileName)}]`
			// personasLimit[groupId] = Date.now() + 30 * 60 * 1000
			callback(imgMsg)
		})
}

const searchGroupChat = async (from, content, port, groupId, callback, type = 'img') => {
	if(!client) {
		try {
			client = await MongoClient.connect(mongourl)
		} catch (e) {
			console.log('MONGO ERROR FOR PERSONAS MODULE!!')
			console.log(e)
		}
	}
	if(content.length < 2) {
		callback('查询过短')
		return
	}
	if(/^\d/.test(content)) {
		callback('不允许数字开头&不允许查询数字')
		return
	}
	let targetArr = content.split(' ').filter(x => x)
	if(targetArr.length > 3) {
		callback('不允许超过3关键词')
		return
	}

	let groupChatData = await fetchGroupData(port, groupId, targetArr)
	console.log(from, content, port, groupId)
	// console.log('===== group chat data =====\n\n\n')
	// console.log(groupChatData)
	// console.log('\n\n\n===== group chat data =====')
	let res = await analysisData(groupChatData, targetArr)
	console.log('===== analysis group chat data =====\n\n\n')
	console.log(`count: ${res.length}`)
	console.log(res)
	console.log('\n\n\n===== group chat data =====')
	if(res.length) {
		renderData(res, targetArr, groupId, callback)
	} else {
		callback('没有查到记录')
	}
}

module.exports = {
	searchGroupChat
}