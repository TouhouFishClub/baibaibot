const { readFileSync } = require('fs')
const { join } = require('path')
const MongoClient = require('mongodb').MongoClient
const { mongourl, IMAGE_DATA } = require('../../../baibaiConfigs')
const nodeHtmlToImage = require('node-html-to-image')
const path = require("path");

let echart = readFileSync(join(__dirname, '..', 'libs', 'echart.min.js'), 'utf-8')
let echartWordcloud = readFileSync(join(__dirname, '..', 'libs', 'echart-wordcloud.js'), 'utf-8')
let personasLimit = {}

let client

const analysisChatData = data => {
	let accountCount = {}
	data.forEach(msg => {
		if(msg.d && msg.uid != 981069482){
			if(accountCount[msg.uid]) {
				accountCount[msg.uid] = accountCount[msg.uid] + 1
			} else {
				accountCount[msg.uid] = 1
			}
		}
	})
	// return Object.keys(accountCount).map(uid => {return {uid, count: accountCount[uid]}}).sort((a, b) => b.count - a.count)
	return accountCount
}

const fetchGroupData = async groupId => {
	let groupData = await client.db('db_bot').collection('cl_chat').find({
		_id: { $gt: new Date(Date.now() - 1000*60*60*24) },
		gid: groupId
	}).toArray()
	console.log(`===> group data length: ${groupData.length}`)
	return analysisChatData(groupData)
}

const renderGroupCountChart = async (groupCountObj, groupId, callback) => {
	console.log(groupCountObj)

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
						sizeRange: [4, 150],
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

const renderGroupCount = async (groupId, callback, type = 'img') => {
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

	let groupCountObj = await fetchGroupData(groupId)
	// console.log(extractArr)

	switch(type) {
		case 'img':
			renderGroupCountChart(groupCountObj, groupId, callback)
			break
	}
}

module.exports = {
	renderGroupCount
}
// renderChatPersonas(205700800)