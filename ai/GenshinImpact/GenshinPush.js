
const path = require("path");
const _ = require('lodash')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))

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
			if(line.trim().startsWith('###')) {
				users.push(userInfo)
				userInfo = {}
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
	// out.users = users
	// console.log(out)

}

const renderImage = data => {
	let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
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
    }
    .good-name{
      color: #090704;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      border-radius: 5px;
      padding: 10px 20px;
    }
    .info-flex {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-top: 10px;
    }
    .info-flex .good-info,
    .info-flex .carrier-info{
      flex-grow: 1;
      border-radius: 5px;
      padding: 10px 20px;
      background: #eee3cd;
    }
    .info-flex .carrier-info{
      margin-left: 10px;
    }
    .city-info-container {
      margin-top: 10px;
      padding-bottom: 20px;
      border-radius: 5px;
      background: #eee3cd;
    }
    .city-info-container .label {
      font-size: 16px;
      font-weight: bold;
      padding-top: 10px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #000;
      text-align: center;
    }
    .city-info-container .city-info {
      margin-left: 20px;
      margin-right: 20px;
      margin-top: 10px;
    }
    .city-info-container .city-info .name{
      font-size: 16px;
    }
    .city-info-container .carrier-flex {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-top: 5px;
      border-radius: 5px;
      padding-top: 5px;
      padding-bottom: 5px;
      background: #fff;
    }
    .city-info-container .carrier-flex .carrier-infos{
      padding-left: 8px;
      padding-right: 8px;
      flex-grow: 1;
    }
    .city-info-container .carrier-flex .carrier-infos + .carrier-infos{
      border-left: 1px dashed #bbb;
    }
    .first {
      background: rgba(255, 215, 0, .5);
    }
    .second {
      background: rgba(169, 169, 169, .5);
    }
    .third {
      background: rgba(210, 105, 30, .5);
    }
  </style>
</head>
<body>
  <div class="trade-card">
    <div class="good-name">${cityInfo.name} - ${name}</div>
    <div class="info-flex">
      <div class="good-info">
        <p>单个箱位容量: ${blockLimit}</p>
        <p>单个重量: ${weight}</p>
      </div>
      <div class="carrier-info">
        ${carrierInfo.map(x => `<p>${x.name}: ${x.count}</p>`).join('')}
      </div>
    </div>
    <div class="city-info-container">
      <div class="label">各村落市价</div>
      ${allCityDesc.map(city => `
        <div class="city-info">
          <div class="name">${city.name} ( ${city.profit > 0 ? `<span style="color: #d40000; font-weight: bold">+ ${city.profit}</span>` : '<span style="color: #0f97f8; font-weight: bold">无利润</span>'} )</div>
          ${city.profit > 0 ? `
            <div class="carrier-flex">
              ${city.item.map(ci => `
                <div class="carrier-infos">
                  <div class="carrier-name">${ci.name} (${ci.time}s)</div>
                  <div class="carrier-item-desc">
                    <div class="${['', 'first', 'second', 'third'][ci.expRank]}">总经验:${ci.exp} (${ci.expRank})</div>
                    <div class="${['', 'first', 'second', 'third'][ci.expAvgRank]}">每秒经验:${ci.expAvg} (${ci.expAvgRank})</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
          <div class="carrier-flex">
            <div class="carrier-infos">该城市没有利润</div>
          </div>
          `}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
	let output = path.join(IMAGE_DATA, 'mabi_trade', `trade.png`)
	// let output = './trade.png'
	nodeHtmlToImage({
		output,
		html
	})
		.then(() => {
			console.log(`保存trade.png成功！`)
			let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_trade', `trade.png`)}]`
			callback(imgMsg)
		})

}

module.exports = {
	analyzerMessage
}