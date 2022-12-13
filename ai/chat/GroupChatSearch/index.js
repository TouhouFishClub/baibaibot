const { readFileSync } = require('fs')
const { join } = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl, IMAGE_DATA, myip} = require('../../../baibaiConfigs')
const nodeHtmlToImage = require('node-html-to-image')
const path = require("path");
const http = require("http");

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

const searchDesc = async (msg, targetArray, offsetStart = 10, offsetEnd = 10) => {
	let st = msg.length, ed = 0
	targetArray.forEach(target => {
		let s = msg.indexOf(target)
		if(s < st) {
			st = s
		}
		if(s + target.length > ed) {
			ed = target.length
		}
	})
	return msg.substring(st - offsetStart, ed + offsetEnd)
}

const analysisData = async (data, targetArr) => {
	let userTargetSet = new Set(), out = []
	data.filter(x => !(x.d.startsWith('gcs') || x.uid === 1561267174)).forEach(msg => {
		if(!userTargetSet.has(msg.uid)) {
			let desc = searchDesc(msg.d, targetArr)
			let msgObj = Object.assign(msg, {
				desc,
				targetArr
			})
			out.push(msgObj)
			userTargetSet.add(msg.uid)
		}
	})
	return out
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
}

module.exports = {
	searchGroupChat
}