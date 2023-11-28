const http = require('http')
const path = require("path-extra");

const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA, myip } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')

const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Corp-Bold.otf'))

let tmpRank = {}

const fetchData = () => new Promise(resolve => {
// http://ba.gamerhub.cn/#/raid-rank-data/s3
	http.get({
		host: 'ba.gamerhub.cn',
		port: 80,
		path: `/api/get_ba_raid_ranking_data?season=8&ranking=1,2001,20001,30001`,
		method: 'GET',
		rejectUnauthorized: false,
		headers: {
			'Accept':'application/json, text/plain, */*',
			'Accept-Encoding':'gzip, deflate',
			'Accept-Language':'zh-CN,zh;q=0.9',
			'Connection':'keep-alive',
			'Host':'ba.gamerhub.cn',
			'Referer': 'http://ba.gamerhub.cn/',
			'Upgrade-Insecure-Requests': '1',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
		},
	}, res => {
		let chunk = ''
		res.on('data', data => {
			chunk += data
		})
		res.on('end', () => {
			try {
				resolve(JSON.parse(chunk))
			} catch (e) {
				console.log(e)
				resolve('ERROR')
			}
		})
	}).on('error', (e) => {
		console.log('ERROR=======')
		console.log(e)
		resolve('ERROR')
	})
})

const BaRaidRanking = async callback => {
	if(Date.now() > (tmpRank.expire || 0)) {
		let res = await fetchData()
		if(res == 'ERROR') {
			callback('获取数据错误')
			return
		}
		let Rank1 = analyzerData(res.data['1'].filter(x => x[1]))
		let Rank2001 = analyzerData(res.data['2001'].filter(x => x[1]))
		let Rank20001 = analyzerData(res.data['20001'].filter(x => x[1]))
		let Rank30001 = analyzerData(res.data['30001'].filter(x => x[1]))
		tmpRank = {
			update: res.lastUpdatedTime * 1000,
			data: [Rank1, Rank2001, Rank20001, Rank30001],
			expire: Date.now() + 60*60*1000
		}
	}
	let output = path.join(IMAGE_DATA, 'other', `ba_raid.png`)
	console.log(tmpRank)
	render(tmpRank, output, callback)
}

const ns = dateTs => new Date(~~((dateTs+14400000)/86400000)*86400000-14400000)

const analyzerData = data => {
	console.log(data)
  let out = {}
  if(data && data.length) {
    let now = data[data.length - 1]
    out.now = {
      point: now[1] || 0,
      ts: now[0] || 0
    }
    let prev = now
    if(data.length - 2 > -1) {
      prev = data[data.length - 2]
    }
    out.prev = {
      point: prev[1] || 0,
      ts: prev[0] || 0,
      diff: (prev[1] || 0) - (now[1] || 0)
    }
    let nowDateSt = ns(now[0]||0)
    let yesterday = data.filter(x => x[0] <= nowDateSt)
		yesterday = yesterday[yesterday.length - 1]
		if(yesterday && yesterday.length > 1) {
			out.yesterday = {
				point: yesterday[1] || 0,
				ts: yesterday[0] || 0,
				diff: (yesterday[1] || 0) - (now[1] || 0)
			}
		} else {
			out.yesterday = {
				point: now[1] || 0,
				ts: now[0] || 0,
				diff: 0
			}
		}
  } else {
    out = {
      now: {
        point: ''
      }
    }
  }
	return out
}

const formatTime = ts => {
	let d = new Date(ts)
	return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}
const addZero = n => n < 10 ? ('0' + n) : n


const render = (data, output, callback) => {

	nodeHtmlToImage({
		output,
		html: `
<!DOCTYPE html>
<html lang="en">
  <head>
  	<meta charset="UTF-8">
    <title></title>
    <style>
			* {
				border: 0;
				padding: 0;
				margin: 0;
			}
    	@font-face {
        font-family: 'Corp_Bold';
        src: url(${Corp_Bold}) format('opentype');
      }
    	body {
    		width: 800px;
      	min-height: 20px;
				box-sizing: border-box;
    		font-family: Corp_Bold;
    		overflow: hidden;
    	}
    	.main-container {
    		padding: 10px 20px;
    		position: relative;
    	}
    	.main-container .update-time {
    		font-size: 20px;
    		color: #999;
    	}
    	.main-container .rank-item + .rank-item {
    		margin-top: 10px;
    	}
    	.main-container .rank-item .rank-title{
    		font-size: 36px;
    	}
    	.main-container .rank-item .info-box{
    		display: flex;
    		justify-content: flex-start;
    		align-items: center;
    	}
    	.main-container .rank-item .info-box .date-info{
    		font-size: 24px;
    		width: 155px;
    		text-align: left;
    		color: #999;
    	}
    	.main-container .rank-item .info-box .point-info{
    		font-size: 26px;
    		color: #000;
    	}
    	.main-container .rank-item .info-box .point-info span{
    		font-size: 18px;
    		color: #8a0000;
    		margin-left: 5px;
    	}
    </style>
  </head>
  <body>
  	<div class="main-container">
  		<div class="update-time">更新时间: ${formatTime(data.update)}</div>
  		${data.data.map((rank, index) => {
			return `
					<div class="rank-item">
						<div class="rank-title">第${[1, 2001, 20001, 30001][index]}名</div>
						${
              rank.now.point ? `
                <div class="info-box now-info">
                  <div class="date-info">${formatTime(rank.now.ts)}</div>
                  <div class="point-info">${rank.now.point}</div>
                </div>
                <div class="info-box prev-info">
                  <div class="date-info">${formatTime(rank.prev.ts)}</div>
                  <div class="point-info">${rank.prev.point}<span>(${rank.prev.diff})</span></div>
                </div>
                <div class="info-box yesterday-info">
                  <div class="date-info">${formatTime(rank.yesterday.ts)}</div>
                  <div class="point-info">${rank.yesterday.point}<span>(${rank.yesterday.diff})</span></div>
                </div>
              ` : `
                <div class="info-box now-info">
                  <div class="point-info">未获取数据</div>
                </div>
              `
            }
					</div>`
		}).join('')}
		</div>
  </body>
</html>
`
	})
		.then(() => {
			console.log(`保存ba_raid.png成功！`)
			let imgMsg = `[CQ:image,file=${path.join('send', 'other', `ba_raid.png`)}]`
			callback(imgMsg)
		})
}

module.exports = {
	BaRaidRanking
}
