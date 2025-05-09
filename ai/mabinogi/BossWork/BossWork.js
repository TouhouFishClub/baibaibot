const fs = require('fs')
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')
// const { drawTxtImage } = require('../../cq/drawImageBytxt')
const BossList = {
	BlackDragon: {
		genMinute: 57,
		hourOfWeek: [
			[0,1,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16],
			[17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16],
			[17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
		],
		cnName: '黑龙',
		name: 'Black Dragon',
		progressColor: '#000',
		textColor: '#505050',
		monsterColor: '#2b2b2b',
		monsterInfoColor: '#fff',
		monsterImage: 'BlackDragon.png'
	},
	WhiteDragon: {
		genMinute: 57,
		hourOfWeek: [
			[0,1,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16],
			[17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16],
			[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '白龙',
		name: 'White Dragon',
		progressColor: '#b4fff8',
		textColor: '#00564e',
		monsterColor: '#d9edec',
		monsterImage: 'WhiteDragon.png'
	},
	PrairieDragon: {
		genMinute: 12,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '平原龙',
		name: 'Prairie Dragon',
		progressColor: '#008a07',
		textColor: '#265428',
		monsterColor: '#c2d1a6',
		monsterImage: 'PrairieDragon.png'
	},
	DesertDragon: {
		genMinute: 12,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23]
		],
		cnName: '沙漠龙',
		name: 'Desert Dragon',
		progressColor: '#703c00',
		textColor: '#985200',
		monsterColor: '#fef2ca',
		monsterImage: 'DesertDragon.png'
	},
	RedDragon: {
		genMinute: 12,
		hourOfWeek: [
			[18,19,20,21,22,23],
			[0,1,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17]
		],
		cnName: '红龙',
		name: 'Red Dragon',
		progressColor: '#d80000',
		textColor: '#9d0000',
		monsterColor: '#f2d0cf',
		monsterImage: 'RedDragon.png'
	},
	Mokkurkalfi: {
		genMinute: 27,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '莫库尔卡皮',
		name: 'Mokkurkalfi',
		progressColor: '#003d00',
		textColor: '#274b27',
		monsterColor: '#cebcca',
		monsterImage: 'Mokkurkalfi.png'
	},
	SylvanDragon: {
		genMinute: 27,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '希尔斑龙',
		name: 'Sylvan Dragon',
		progressColor: '#315bc9',
		textColor: '#7b94b4',
		monsterColor: '#d6cabe',
		monsterImage: 'SylvanDragon.png'
	},
	Mammoth: {
		genMinute: 32,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '猛犸象',
		name: 'Mammoth',
		progressColor: '#ffa036',
		textColor: '#4f2a00',
		monsterColor: '#cabcb1',
		monsterImage: 'Mammoth.png'
	},
	Ifrit: {
		genMinute: 32,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23]
		],
		cnName: '火神',
		name: 'Ifrit',
		progressColor: '#ff7272',
		textColor: '#770000',
		monsterColor: '#f8d9bd',
		monsterImage: 'Ifrit.png'
	},
	Yeti: {
		genMinute: 32,
		hourOfWeek: [
			[18,19,20,21,22,23],
			[0,1,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17]
		],
		cnName: '雪人',
		name: 'Yeti',
		progressColor: '#6e98ff',
		textColor: '#002172',
		monsterColor: '#cbd2ee',
		monsterImage: 'Yeti.png'
	},
	GiantLion: {
		genMinute: 45,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '巨大狮子',
		name: 'Giant Lion',
		progressColor: '#ffb820',
		textColor: '#593e00',
		monsterColor: '#fbd374',
		monsterImage: 'GiantLion.png'
	},
	GiantSandworm: {
		genMinute: 45,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23]
		],
		cnName: '巨大沙虫怪',
		name: 'Giant Sandworm',
		progressColor: '#8f8f8f',
		textColor: '#3f3232',
		monsterColor: '#ebebeb',
		monsterImage: 'GiantSandworm.png'
	},
	GiantAlligator: {
		genMinute: 45,
		hourOfWeek: [
			[18,19,20,21,22,23],
			[0,1,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17]
		],
		cnName: '巨大鳄鱼',
		name: 'Giant Alligator',
		progressColor: '#74903d',
		textColor: '#2b3d00',
		monsterColor: '#8cb7ae',
		monsterImage: 'GiantAlligator.png'
	},
}

const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'Corp-Bold.otf'))

const checkWorkState = (genMinute, workTimes, yesterdayWorkTimes) => {
	let now = new Date(), cHour = now.getHours(), cMinute = now.getMinutes()
	if(cHour < 1 && workTimes[0] == 0 && cMinute < genMinute && yesterdayWorkTimes[yesterdayWorkTimes.length - 1] == 23) {
		return true
	}
	if(cMinute < genMinute) {
		return new Set(workTimes).has(cHour - 1)
	} else {
		return new Set(workTimes).has(cHour)
	}
}

const checkCurrentTime = (genMinute, workTimes) => {
	let now = new Date(), cHour = now.getHours(), cMinute = now.getMinutes(), tHour = cHour - (cMinute < genMinute ? 1 : 0)
	return {
		count: workTimes.filter(x => x > tHour).length,
		current: new Set(workTimes).has(tHour) ? `${tHour}:${genMinute}` : '--:--'
	}
}
const checkNextTime = (genMinute, workTimes, tomorrowWorkTimes) => {
	let now = new Date(), cHour = now.getHours(), cMinute = now.getMinutes(), tHour = cHour + (cMinute < genMinute ? 0 : 1)
	let targetHour = workTimes.concat(tomorrowWorkTimes.map(x => x + 24)).filter(x => x >= tHour)[0]
	return targetHour > 23 ?
		{
			isTomorrow: true,
			time: `${targetHour % 24}:${genMinute}`
		}
		:
		{
			isTomorrow: false,
			time: `${targetHour}:${genMinute}`
		}
}

const BossWork = (qq, group, callback) => {
	// let now = new Date(), cWeek = now.getDay()
	// let str = Object.values(BossList).map(bossInfo => {
	// 	let state = checkWorkState(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek], bossInfo.hourOfWeek[(cWeek + 6) % 7])
	// 	let currentInfo = checkCurrentTime(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek])
	// 	let nextInfo = checkNextTime(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek], bossInfo.hourOfWeek[(cWeek + 1) % 7])
	// 	return `[${ state ? '上班中': '未上班'}] ${bossInfo.cnName}\n本次出现时间：${currentInfo.current}\n下次出现时间：${nextInfo}\n今日剩余${currentInfo.count}次\n========`
	// }).join('\n')
	// console.log(str)
	RenderWorkTimeLine(callback)
	// drawTxtImage('', str, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

const BossImageParser = filename => `data:image/png;base64,${new Buffer.from(fs.readFileSync(path.join(__dirname, 'img', filename))).toString('base64')}`

const RenderWorkTimeLine = (callback) => {


	let output = path.join(IMAGE_DATA, 'mabi_other', `bosswork.png`)
	// let output = path.join(`bosswork.png`)

	nodeHtmlToImage({
		output,
		html: `
<html>
  <head>
    <title></title>
    <style>
    	@font-face {
        font-family: 'Corp_Bold';
        src: url(${Corp_Bold}) format('opentype');
      }
    	body {
    		width: 1010px;
    	}
    	.main-container {
    		padding: 30px;
    		position: relative;
    	}
    	.main-container .cross-time-line{
    		position: absolute;
    		width: 0px;
    		border: 2px solid #a300c9;
    		border-radius: 2px;
    		top: 30px;
    		bottom: 30px;
    	}
    	.main-container .cross-time-line-base{
    		position: absolute;
    		border: 1px solid #f00;
    		top: 30px;
    		bottom: 30px;
    	}
    	.main-container .time-line{
    		display: flex;
    		justify-content: space-between;
    		height: 60px;
    	}
    	.main-container .time-line + .time-line{
    		/* border-top: 1px solid #666; */
    	}
    	.main-container .time-line .boss-info{
    		width: 137px;
    		height: 60px;
    		position: relative;
    		padding-left: 90px;
    		padding-right: 3px;
    		display: flex;
    		flex-direction: row;
    		justify-content: space-between;
    		align-items: center;
    	}
    	.main-container .time-line .boss-info .boss-image{
    		height: 60px;
    		width: auto;
    		position: absolute;
    		top: 0;
    		left: 10px;
    	}
    	.main-container .time-line .boss-info .boss-time{
    		display: flex;
    		height: 60px;
    		flex-direction: column;
    		justify-content: center;
    		align-items: flex-start;
    		padding-left: 10px;
    		flex-grow: 1;
    	}
    	.main-container .time-line .boss-info .boss-time .time{
    		display: flex;
    		justify-content: space-between;
    		align-items: center;
    	}
    	.main-container .time-line .boss-info .boss-time .time .day-info{
    		font-size: 12px;
    		line-height: 13px;
    		width: 18px;
    		zoom: 0.8;
    	}
    	.main-container .time-line .boss-info .boss-time .time .desc{
    		font-size: 22px;
    		line-height: 26px;
    		font-family: Corp_Bold;
    		flex-shrink: 0;
    	}
    	.main-container .time-line .boss-info .boss-time .time.current{
    		opacity: 0.7;
    	}
    	.main-container .time-line .boss-info .boss-time .time + .time{
    		border-top: 1px solid #999;
    	}
    	.main-container .time-line .boss-info .boss-count{
    		display: flex;
    		height: 60px;
    		flex-direction: column;
    		justify-content: center;
    		align-items: center;
    		padding-right: 10px;
    	}
    	.main-container .time-line .boss-info .boss-count .label{
    		font-size: 16px;
    		line-height: 20px;
    	}
    	.main-container .time-line .boss-info .boss-count .text{
    		font-size: 32px;
    		line-height: 36px;
    		font-family: Corp_Bold;
    	}
    	.main-container .time-line .boss-info .boss-cutline{
				width: 3px;
				height: 60px;
				position: absolute;
				top: 0;
				right: 0;
    	}
    	.main-container .time-line .boss-info .info-desc{
    		line-height: 20px;
    		font-size: 14px;
    	}
    	.main-container .time-line .time-line-progress{
    		width: 720px;
    		height: 60px;
    		position: relative;
    		overflow: hidden;
    	}
    	.main-container .time-line .time-line-progress .boss-name{
    		width: 720px;
    		height: 60px;
    		padding-left: 20px;
    		position: absolute;
    		font-size: 32px;
    		text-align: left;
    		line-height: 60px;
    		text-shadow: 1px 1px 2px #fff;
    	}
    	.main-container .time-line .time-line-progress .time-line-progress-item{
    		width: 29px;
    		border-right: 1px solid #000;
    		height: 60px;
    		position: absolute;
    		top: 0;
    		background-color: #fff;
    	}
    	.main-container .time-line .time-line-progress:nth-child(odd) .time-line-progress-item{
    		background-color: #f3f3f3;
    	}
    </style>
  </head>
  <body>
  	<div class="main-container">
  		${Object.values(BossList).map(bossInfo => {
			let now = new Date(), cWeek = now.getDay()
			let state = checkWorkState(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek], bossInfo.hourOfWeek[(cWeek + 6) % 7])
			let currentInfo = checkCurrentTime(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek])
			let nextInfo = checkNextTime(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek], bossInfo.hourOfWeek[(cWeek + 1) % 7])
			return `
					<div class="time-line">
						<div class="boss-info" style="background-color: ${bossInfo.monsterColor}; color: ${bossInfo.monsterInfoColor || '#333'}">
							<img src="${BossImageParser(bossInfo.monsterImage)}" class="boss-image"/>
							<div class="boss-time">
								<div class="time current">
									<div class="desc">
										${currentInfo.current}
									</div>
								</div>
								<div class="time next">
									<div class="day-info">
										${nextInfo.isTomorrow ? '明日': '今日'}
									</div>
									<div class="desc">
										${nextInfo.time}
									</div>
							</div>
							</div>
							<div class="boss-count">
								<div class="label">剩余</div>
								<div class="text">${currentInfo.count}</div>
							</div>
							<div class="boss-cutline" style="background-color: ${bossInfo.progressColor}"></div>
						</div>
						<div class="time-line-progress">
							${(bossInfo.hourOfWeek[cWeek][0] == 0 && bossInfo.hourOfWeek[(cWeek + 6) % 7][bossInfo.hourOfWeek[(cWeek + 6) % 7].length - 1] == 23) ? `<div class="time-line-progress-item" style="left: ${-1 * 30 + bossInfo.genMinute / 2}px; background-color: ${bossInfo.monsterColor}; border-color: ${bossInfo.progressColor}"></div>` : ''}
							${bossInfo.hourOfWeek[cWeek].map(hour => {
				return `<div class="time-line-progress-item" style="left: ${hour * 30 + bossInfo.genMinute / 2}px; background-color: ${bossInfo.monsterColor}; border-color: ${bossInfo.progressColor}"></div>`
			}).join('')}
							<div class="boss-name" style="color: ${bossInfo.textColor}">${bossInfo.cnName}(${bossInfo.name})</div>
						</div>
					</div>
				`
		}).join('')}
  		<div class="cross-time-line" style="left: ${new Date().getHours() * 30 + new Date().getMinutes() / 2 + 260}px"></div>
  		<!--div class="cross-time-line-base" style="left: 260px"></div-->
		</div>
  </body>
</html>
`
	})
		.then(() => {
			console.log(`保存bosswork.png成功！`)
			let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `bosswork.png`)}]`
			callback(imgMsg)
		})
}

// BossWork()
module.exports = {
	BossWork
}
