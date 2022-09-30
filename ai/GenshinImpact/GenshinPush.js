const http = require("http");
const path = require("path");
const _ = require('lodash')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA, myip } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')
//FONTS
const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'hk4e_zh-cn.ttf'))

const emojiSet = new Set([
	'🏆',
	'✔',
	'✖',
	'🔅',
	'🌈',
	'👀',
	'💠',
	'🌕',
])

const analyzerMessage = msg => {
	let out = {}, users = [], userInfo = {}, analyzerUser = false
	msg.split('\n').forEach(line => {
		if(analyzerUser) {
			if(line.trim().startsWith('🔅')) {
				// 🔅{nickname} {level} {region_name}
				let [nickname, level, region_name] = line.split('🔅')[1].trim().split(' ').filter(x => x)
				userInfo = Object.assign(userInfo, {
					nickname,
					level,
					region_name
				})
				return
			}
			if(line.trim().startsWith('Today')) {
				// Today's reward: {reward_name} × {reward_cnt}
				let [reward_name, reward_cnt] = line.split(':')[1].trim().split('×').filter(x => x).map(x => x.trim())
				userInfo = Object.assign(userInfo, {
					reward_name,
					reward_cnt
				})
				return
			}
			if(line.trim().startsWith('Total')) {
				// Total monthly check-ins: {total_sign_day} days
				userInfo.total_sign_day = line.split(':')[1].split('days')[0].trim()
				return
			}
			if(line.trim().startsWith('Status')) {
				// Status: {status}
				userInfo.status = line.split(':')[1].trim()
				return
			}
			if(line.trim().startsWith('💠')) {
				// 💠primogems: {current_primogems}
				userInfo.current_primogems = line.split(':')[1].trim()
				return
			}
			if(line.trim().startsWith('🌕')) {
				// 🌕mora: {current_mora}
				userInfo.current_mora = line.split(':')[1].trim()
				return
			}
			if(line.trim().startsWith('🌈')) {
				users.push(userInfo)
				userInfo = {}
			}
			if(line.indexOf('失效') > -1) {
				userInfo.error = line.trim()
			}
		} else {
			if(line.trim().startsWith('#')) {
				analyzerUser = true
				return
			}
			if(line.indexOf('✔') > -1) {
				let s = line.split('·')
				out.successCount = s[0].split('✔')[1].trim()
				out.failCount = s[1].split('✖')[1].trim()
			}
		}
	})
	out.users = users.filter(x => x.nickname)
	let update = new Date()
	out.dateStr = `${update.getFullYear()}-${addZero(update.getMonth() + 1)}-${addZero(update.getDate())} ${update.getHours()}:${addZero(update.getMinutes())}:${addZero(update.getSeconds())}`
	console.log(out)
	renderImage(out)
}

const addZero = num => num < 10 ? `0${num}` : num

const renderImage = data => {
	let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
		@font-face {
			font-family: 'HANYIWENHEI';
			src: url(${HANYIWENHEI}) format('truetype');
		}
    * {
      border: 0;
      padding: 0;
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
    }
    body {
      width: 400px;
      min-height: 20px;
      padding: 20px;
      box-sizing: border-box;
      background: #806637;
			font-family: HANYIWENHEI;
    }
    .main-container {
    	min-height: 20px;
    }
    .main-container .top-panel{
    	padding: 10px 20px;
    	background-color: #eee3cd;
    	border-radius: 8px;
    	display: flex;
    	flex-direction: column;
    	align-items: stretch;
    	justify-content: flex-start;
    }
    .main-container .top-panel .title{
    	font-size: 32px;
    	line-height: 1;
    	text-align: center;
    }
    .main-container .top-panel .date{
    	font-size: 14px;
    	margin-top: 10px;
    	line-height: 1;
    	text-align: center;
    }
    .main-container .top-panel .check-status{
    	margin-top: 10px;
    	display: flex;
    	align-items: center;
    	justify-content: space-around;
    }
    .main-container .top-panel .check-status .status-item{
    	border: 1px solid #000;
    	font-size: 14px;
    	padding: 0 10px;
    	border-radius: 4px;
    	display: flex;
    	align-items: center;
    	justify-content: flex-start;
    }
    .main-container .top-panel .check-status .status-item.success{
    	border-color: #00BB2C;
    	color: #00BB2C;
    }
    .main-container .top-panel .check-status .status-item.fail{
    	border-color: #F44336;
    	color: #F44336;
    }
    
    .main-container .user-card{
    	padding: 10px 20px;
    	background-color: #eee3cd;
    	display: flex;
    	flex-direction: column;
    	align-items: stretch;
    	justify-content: flex-start;
    	margin-top: 15px;
    	border-radius: 8px;
    	position: relative;
    }
    .main-container .user-card .user-top{
    	display: flex;
    	align-items: center;
    	justify-content: space-between;
    }
    .main-container .user-card .user-top .user-info{
    	display: flex;
    	align-items: center;
    	justify-content: flex-start;
    }
    .main-container .user-card .user-top .user-info .level{
    	width: 40px;
    	height: 40px;
    	line-height: 40px;
    	font-size: 24px;
    	margin-right: 10px;
    	text-align: center;
    	border: 4px solid #000;
    	border-radius: 50px;
    	background-color: #fff;
    }
    .main-container .user-card .user-top .user-info .nickname{
    	font-size: 32px;
    }
    .main-container .user-card .user-top .user-region{
    	font-size: 20px;
    }
    .main-container .user-card .info-line{
    	font-size: 20px;
    	line-height: 26px;
    	margin-top: 10px;
    }
  </style>
</head>
<body>
<div class="main-container">
	<div class="top-panel">
		<div class="title">Genshin Helper</div>
		<div class="date">${ data.dateStr }</div>
		<div class="check-status">
			<div class="status-item success">
				<div class="status-label">
					成功
				</div>
				<div class="status-count">
					${ data.successCount }
				</div>
			</div>
			<div class="status-item fail">
				<div class="status-label">
					失败
				</div>
				<div class="status-count">
					${ data.failCount }
				</div>
			</div>
		</div>
	</div>
	${data.users.map(user => `
		<div class="user-card">
			${
				user.error 
					? 
					`<div class="info-line">签到状态: ${user.status}</div>` 
					: 
					`
					<div class="user-top">
						<div class="user-info">
							<div class="level">${user.level}</div>
							<div class="nickname">${user.nickname}</div>
						</div>
						<div class="user-region">
							${user.region_name}
						</div>
					</div>
					<div class="info-line">签到状态: ${user.status}</div>
					<div class="info-line">今天获得: ${user.reward_name}×${user.reward_cnt}</div>
					<div class="info-line">(本月签到${user.total_sign_day}天)</div>
					<div class="info-line">旅行者 ${new Date().getMonth() + 1 } 月札记</div>
					<div class="info-line">原石: ${user.current_primogems}</div>
					<div class="info-line">摩拉: ${user.current_mora}</div>
					`
			}
		</div>
	`).join('')}
</div>
  
</body>
</html>`
	let output = path.join(IMAGE_DATA, 'other', `genshin_push.png`)
	// let output = './genshin_push.png'
	nodeHtmlToImage({
		output,
		html
	})
		.then(() => {
			console.log(`保存genshin_push.png成功！`)
			let imgMsg = `[CQ:image,file=file:${path.join(IMAGE_DATA, 'other', `genshin_push.png`)}]`
			sendMsg(imgMsg, {
				port: 24334,
				id: 577587780
			})
		})

}

const sendMsg = (msg, group) => {
	let options = {
		host: myip,
		port: group.port,
		path: `/send_group_msg?group_id=${group.id}&message=${encodeURIComponent(`${msg}`)}`,
		method: 'GET',
		headers: {}
	}
	let req = http.request(options);
	req.on('error', function(err) {
		console.log('req err:');
		console.log(err);
	});
	req.end();
}

// (() => {
// 	let msg = 'Genshin Impact Helper ✔ 2 · ✖ 0\n' +
// 		'\n' +
// 		'🏆 原神签到福利\n' +
// 		'☁️ ✔ 2 · ✖ 0\n' +
// 		'🌈 No.1:\n' +
// 		'    \n' +
// 		'    ####2022-09-26####\n' +
// 		'    🔅芙兰 60 天空岛\n' +
// 		"    Today's reward: 冒险家的经验 × 3\n" +
// 		'    Total monthly check-ins: 20 days\n' +
// 		'    Status: 👀 You have already checked-in\n' +
// 		'    Traveler month 9 diary\n' +
// 		'    💠primogems: 5704\n' +
// 		'    🌕mora: 6812018\n' +
// 		'    ##################\n' +
// 		'🌈 No.2:\n' +
// 		'    \n' +
// 		'    ####2022-09-26####\n' +
// 		'    🔅雪咪 60 天空岛\n' +
// 		"    Today's reward: 摩拉 × 8000\n" +
// 		'    Total monthly check-ins: 14 days\n' +
// 		'    Status: 👀 You have already checked-in\n' +
// 		'    Traveler month 9 diary\n' +
// 		'    💠primogems: 5997\n' +
// 		'    🌕mora: 7176798\n' +
// 		'    ##################\n'
//
// 	analyzerMessage(msg)
//
// })()

module.exports = {
	analyzerMessage
}