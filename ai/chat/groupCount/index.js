const { readFileSync } = require('fs')
const { join } = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl, IMAGE_DATA, myip} = require('../../../baibaiConfigs')
const nodeHtmlToImage = require('node-html-to-image')
const path = require("path");
const http = require("http");
// 延迟加载以避免循环依赖
// const { createHttpApiWrapper } = require('../../../reverseWsUtils')

let echart = readFileSync(join(__dirname, '..', 'libs', 'echart.min.js'), 'utf-8')
let echartWordcloud = readFileSync(join(__dirname, '..', 'libs', 'echart-wordcloud.js'), 'utf-8')
let personasLimit = {}

let client

const analysisChatData = (data, userMap) => {
	let accountCount = {}
	data.forEach(msg => {
		if(msg.d && msg.uid != 981069482){
			let nid = userMap[msg.uid] || msg.uid
			if(accountCount[nid]) {
				accountCount[nid] = accountCount[nid] + 1
			} else {
				accountCount[nid] = 1
			}
		}
	})
	// return Object.keys(accountCount).map(uid => {return {uid, count: accountCount[uid]}}).sort((a, b) => b.count - a.count)
	return accountCount
}

/**
 * 获取群成员列表（优先使用反向 WebSocket，失败时回退到 HTTP）
 * @param {string} groupid - 群ID
 * @param {string} port - 端口/机器人名称
 * @returns {Promise<Array>} 群成员列表
 */
const fetchGroupUsers = async (groupid, port) => {
	console.log(`[群成员获取] 开始获取群 ${groupid} 成员列表，使用端口/机器人: ${port}`)
	
	try {
		// 延迟加载以避免循环依赖
		const { createHttpApiWrapper } = require('../../../reverseWsUtils')
		// 优先尝试使用反向 WebSocket 接口
		const apiWrapper = createHttpApiWrapper(port)
		console.log(`[反向 WebSocket] 创建 API 包装器成功，机器人名: ${port}`)
		
		// 尝试不使用缓存获取群成员列表
		let groupMemberData = await apiWrapper.getGroupMemberList(groupid, true)
		console.log(`[反向 WebSocket] 首次获取结果 (no_cache=true):`, groupMemberData ? `数组长度 ${groupMemberData.length}` : '空响应')
		
		// 如果不使用缓存失败，尝试使用缓存
		if (!groupMemberData || !Array.isArray(groupMemberData) || groupMemberData.length === 0) {
			console.log(`[反向 WebSocket] 首次获取失败，尝试使用缓存 (no_cache=false)`)
			groupMemberData = await apiWrapper.getGroupMemberList(groupid, false)
			console.log(`[反向 WebSocket] 缓存获取结果:`, groupMemberData ? `数组长度 ${groupMemberData.length}` : '空响应')
		}
		
		if (groupMemberData && Array.isArray(groupMemberData) && groupMemberData.length > 0) {
			const groupUsers = groupMemberData.map(x => {
				let nid = x.card || x.nickname, alias = nid
				if(nid.length > 7) {
					alias = `${nid.substring(0, 7)}...`
				}
				return {
					uid: x.user_id,
					nid,
					alias
				}
			})
			console.log(`[反向 WebSocket] 成功获取群 ${groupid} 成员列表，共 ${groupUsers.length} 人`)
			console.log(`[反向 WebSocket] 前3个成员示例:`, groupUsers.slice(0, 3))
			return groupUsers
		} else {
			console.warn(`[反向 WebSocket] 群 ${groupid} 成员列表为空或格式错误`)
			console.warn(`[反向 WebSocket] 原始响应:`, groupMemberData)
		}
	} catch (error) {
		console.error(`[反向 WebSocket] 获取群成员列表异常:`, error.message)
		console.error(`[反向 WebSocket] 错误堆栈:`, error.stack)
	}

	// 回退到原有的 HTTP 调用方式
	console.log(`[HTTP 回退] 反向 WebSocket 方式失败，尝试 HTTP 方式`)
	return new Promise(resolve => {
		let url = `http://${myip}:${port}/get_group_member_list?group_id=${groupid}`
		console.log(`[HTTP 回退] 请求 URL: ${url}`)
		
		http.get(url, (res) => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				try {
					console.log(`[HTTP 回退] 收到原始响应 (长度: ${rawData.length}):`, rawData.substring(0, 500))
					const parsedData = JSON.parse(rawData);
					console.log(`[HTTP 回退] 解析后的响应:`, JSON.stringify(parsedData, null, 2))
					
					if (!parsedData.data || !Array.isArray(parsedData.data)) {
						console.error(`[HTTP 回退] 响应格式错误，data 不是数组:`, parsedData)
						resolve([])
						return
					}
					
					const groupUsers = parsedData.data.map(x => {
						let nid = x.card || x.nickname, alias = nid
						if(nid.length > 7) {
							alias = `${nid.substring(0, 7)}...`
						}
						return {
							uid: x.user_id,
							nid,
							alias
						}
					})
					console.log(`[HTTP 回退] 成功获取群 ${groupid} 成员列表，共 ${groupUsers.length} 人`)
					resolve(groupUsers);
				} catch (e) {
					console.error(`[HTTP 回退] 解析响应失败:`, e.message);
					console.error(`[HTTP 回退] 原始响应:`, rawData);
					resolve([])
				}
			});
		}).on('error', (e) => {
			console.error(`[HTTP 回退] 请求失败:`, e.message);
			resolve([])
		})
	})
}

const fetchGroupData = async (port, groupId) => {
	let users = await fetchGroupUsers(groupId, port)
	let userMap = {}
	users.forEach(x => {
		userMap[x.uid] = x.alias
	})
	let groupData = await client.db('db_bot').collection('cl_chat').find({
		_id: { $gt: new Date(Date.now() - 1000*60*60*24) },
		gid: groupId
	}).toArray()
	console.log(`===> group data length: ${groupData.length}`)
	return analysisChatData(groupData, userMap)
}

const renderGroupCountChart = async (groupCountObj, groupId, callback) => {
	// console.log(groupCountObj)

	let output = path.join(IMAGE_DATA, 'other', `${groupId}_count_img.png`)
	// let output = path.join(`${groupId}.png`)

	nodeHtmlToImage({
		output,
		html: `
			<html>
			<head>
				<meta charSet="utf-8">
				<script>
					${echart}
				</script>
				<script>
					${echartWordcloud}
				</script>
				<style>
					html, body, #main {
						width: 100%;
						height: 100%;
						margin: 0;
						background-color: #0a0905;
					}
				</style>
			</head>
			<body>
			<div id='main'></div>
			<script>
				var chart = echarts.init(document.getElementById('main'));
				var keywords = ${JSON.stringify(groupCountObj)}
			
				var data = [];
				for (var name in keywords) {
					data.push({
						name: name,
						value: Math.sqrt(keywords[name])
					})
				}
			
				var option = {
					series: [{
						type: 'wordCloud',
						width: '100%',
						height: '100%',
						sizeRange: [2, 60],
						rotationRange: [0, 0],
						// rotationRange: [-90, 90],
						// rotationStep: 15,
						gridSize: 0,
						shape: 'circle',
						drawOutOfBound: false,
						keepAspect: true,
						textStyle: {
							fontWeight: 'bold',
							color: function () {
								// var c = Math.round(Math.random() * 200) + 50;
								return 'rgb(' + [
									// Math.round(Math.random() * 200) + 50,
									// Math.round(Math.random() * 50),
									// Math.round(Math.random() * 50) + 50
									Math.round(Math.random() * 150) + 100,
									Math.round(Math.random() * 150) + 100,
									Math.round(Math.random() * 150) + 100
									// 255,
									// 255,
									// c
								].join(',') + ')';
							}
						},
						emphasis: {
							textStyle: {
								color: '#fff'
							}
						},
						data: data.sort(function (a, b) {
							return b.value - a.value;
						})
					}]
				};
				chart.setOption(option);
			</script>
			</body>
			</html>
		`
	})
		.then(() => {
			console.log(`保存${groupId}_count_img.png成功！`)
			let imgMsg = `[CQ:image,file=${join('send', 'other', `${groupId}_count_img.png`)}]`
			personasLimit[groupId] = Date.now() + 30 * 60 * 1000
			callback(imgMsg)
		})
}

const renderGroupCount = async (port, groupId, callback, type = 'img') => {
	if(!client) {
		try {
			client = await MongoClient.connect(mongourl)
		} catch (e) {
			console.log('MONGO ERROR FOR PERSONAS MODULE!!')
			console.log(e)
		}
	}

	if(personasLimit[groupId] && Date.now() < personasLimit[groupId]) {
		let imgMsg = `[CQ:image,file=${join('send', 'other', `${groupId}_count_${type}.png`)}]`
		callback(imgMsg)
		return
	}

	let groupCountObj = await fetchGroupData(port, groupId)
	// console.log(extractArr)
	console.log(Object.keys(groupCountObj).map(nick => {return {nick, count: groupCountObj[nick]}}).sort((a, b) => b.count - a.count).splice(0, 10).map(x => `${x.nick} : ${x.count}`))

	switch(type) {
		case 'img':
			renderGroupCountChart(groupCountObj, groupId, callback)
			break
	}
}

const randomGroupUser = async (content, port, groupId, callback, at = false) => {
	let users = await fetchGroupUsers(groupId, port)
	let target = users[~~(Math.random() * users.length)]
	content = content.replace(/我/g, '你')
	if(at) {
		callback(`你抽到了 [CQ:at,qq=${target.uid}]${content}`)
	} else {
		callback(`你抽到了 ${target.nid}${content}`)
	}
}

module.exports = {
	renderGroupCount,
	randomGroupUser
}
// renderChatPersonas(205700800)