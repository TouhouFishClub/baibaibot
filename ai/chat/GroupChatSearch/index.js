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

const fetchGroupData = async (port, groupId, content) => {
	let users = await fetchGroupUsers(groupId, port)
	let userMap = {}
	users.forEach(x => {
		userMap[x.uid] = x.nid
	})
	let groupData = await client.db('db_bot').collection('cl_chat').find({
		_id: { $gt: new Date(Date.now() - 1000*60*60*24*3) },
		gid: groupId,
		d: new RegExp(content)
	}).toArray()
	console.log(`===> group data length: ${groupData.length}`)
	return groupData
}

const analysisData = async (data, target) => {
	let userTargetSet = new Set(), out = []
	data.filter(x => !x.d.startsWith('gcs') || x.uid !== 1561267174).forEach(msg => {
		if(!userTargetSet.has(msg.uid)) {
			let desc = msg.split('\n').map(x => x.trim()).filter(x => x.indexOf(target) > -1)
			let msgObj = Object.assign(msg, {
				desc,
				target
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

	let groupChatData = await fetchGroupData(port, groupId, content)
	console.log(from, content, port, groupId)
	// console.log('===== group chat data =====\n\n\n')
	// console.log(groupChatData)
	// console.log('\n\n\n===== group chat data =====')
	let res = await analysisData(groupChatData, content)
	console.log('===== analysis group chat data =====\n\n\n')
	console.log(res)
	console.log('\n\n\n===== group chat data =====')
}

module.exports = {
	searchGroupChat
}