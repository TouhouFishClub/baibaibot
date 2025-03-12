const fs = require('fs')
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const { drawTxtImage } = require('../../cq/drawImageBytxt')
const font2base64 = require('node-font2base64')
//THEME
const THEMES = {
	BG: '#012273',
	PORT_LABEL: '#FFF',
	TEXT: '#FFF',
	TIME: '#FFA',
	ROW_BG_ST: '#3C76FF',
	ROW_BG_FROM: '#3969e3',
	ROW_BG_TO: '#042e83',
	ROW_BG_ED: '#001F5D',
	STATUS_CHECK_IN: '#34ff34',
	STATUS_WAIT: '#ffff1a'
}
//FONTS
const ALGER = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'ALGER.ttf'))
const SANS_SERIF = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Microsoft Sans Serif.ttf'))
const AGT_SUPER_BOLD = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'ArupalaGroteskTrial-SuperBold.ttf'))
// const Acosta = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Acosta.otf'))
const FPT_BOLD = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'FPTypewriterDEMO-Bold.otf'))
// const MasSimple = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'MasSimple_1.0.ttf'))
// const NortuneExtrablack = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'NortuneExtrablack-L3zO4.ttf'))
const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Corp-Bold.otf'))
const MalbergTrial = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'MalbergTrial-Heavy.ttf'))
// require('../../font/')

const calcOffset = (time1, time2, intervalArray) => {
	let basePeriod = intervalArray[0] + intervalArray[1]
	return (time2.getTime() - time1.getTime() - ~~((time2.getTime() - time1.getTime()) / basePeriod) * basePeriod) / 1000
}

//TODO 基础应该用伊利亚时间，不应该用贝岛时间，所以0应该是卡普-贝岛，1-10应该是卡普-凯安时间，周三以后同步修改
const IrusanBaseInfo = [
	[1, '2025-02-18 15:38:27', '0:47'], //10x 状态（1等船2等出发），当前时间，显示时间（卡普-贝岛时间）
	[2, '2025-02-18 15:35:03', '1:09'], //1x 状态（1等船2等出发），当前时间，显示时间（卡普-凯安时间）
	[2, '2025-02-18 15:34:42', '2:06'], //2x
	[2, '2025-02-18 15:34:22', '0:53'], //3x
	[2, '2025-02-18 15:34:01', '1:55'], //4x
	[2, '2025-02-18 15:33:45', '4:08'], //5x
	[2, '2025-02-18 15:33:25', '2:42'], //6x
	[2, '2025-02-18 15:33:07', '5:14'], //7x
	[2, '2025-02-18 15:32:45', '1:31'], //8x
	[2, '2025-02-18 15:32:23', '3:44'], //9x
	[2, '2025-02-18 15:31:21', '3:53'], //10x
]

// const ChannelOffset = {
// 	// 'Eavan': [7, -62, -1, -13, 11, 8, -13, -5, 25, 0],
// 	// 'Eavan': [-25, -70, -11, -16, 5, -2, -16, -19, 299, 0],
// 	'Eavan': [-6, -77, -12, -21, 14, -6, -15, -14, 7, 0],
// 	// 'Altam': [31, 43, -100, -121, 254, -117, 239, -215, -133, -116],
// 	'Altam': [-274, -291, -283, 228, 211, 217, 200, 158, 221, 226],
// 	'Pihne': [167, 189, 190, 186, 322, 207, 175],
// }
//
// const BaseTime = {
// 	Iria: {
// 		baseStr: '2022-07-27 18:09:12',
// 		// 卡普港要+60
// 		// base: new Date('2022-06-24 1:55:28'), //到港时间
// 		// base: new Date('2022-07-18 18:07:53'), //到港时间
// 		// base: new Date('2022-07-20 18:08:33'), //到港时间 -1：20
// 		// base: new Date('2022-07-27 18:09:12'), //到港时间 +279 / +4'39"
// 		base: new Date('2022-08-04 01:39:32'), //到港时间 +200 / +3'20"
// 		interval: [5*60*1000, 6*60*1000, 4*60*1000], //等待到港时间，等待开船时间，等待到目的地时间 //Eavan Pihne Altam
// 	},
// 	// Connous: {
// 	// 	base: new Date('2022-07-18 18:07:53'), //到港时间
// 	// 	interval: [5*60*1000, 6*60*1000, 4*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
// 	// },
// 	// Qilla: {
// 	// 	base: new Date('2022-07-18 20:18:23'), //到港时间
// 	// 	interval: [5*60*1000, 6*60*1000, 4*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
// 	// },
// 	Belvast: {
// 		baseStr: '2022-07-27 18:24:42',
// 		// 卡普港要+30
// 		// base: new Date('2022-06-24 2:58:28'), //到港时间
// 		// base: new Date('2022-07-18 d17:00:27'), //到港时间
// 		// base: new Date('2022-07-22 2:22:05'), //到港时间 - 2：20
// 		// base: new Date('2022-07-27 18:24:42'), //到港时间 +37 / +0'37"
// 		base: new Date('2022-08-04 01:36:02'), //到港时间 +20 / +0'20"
// 		// base: new Date('2022-08-04 03:14:19'), //到港时间 +20 / +0'20" Altam 10
// 		// base: new Date('2022-08-04 03:07:35'), //到港时间 +20 / +0'20" Pihne 7
//
// 		interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000], //等待到港时间，等待开船时间，等待到目的地时间
// 	}
// }
//
// const Ferry = [
// 	{
// 		from: 'Port Sella',
// 		to: 'Port Ceann',
// 		baseTime: 'Iria',
// 		timeOffset: 0,
// 	},
// 	{
// 		from: 'Port Connous',
// 		to: 'Port Ceann',
// 		baseTime: 'Iria',
// 		timeOffset: 0,
// 	},
// 	{
// 		from: 'Port Ceann',
// 		to: 'Port Sella',
// 		baseTime: 'Iria',
// 		timeOffset: -60,
// 	},
// 	{
// 		from: 'Port Ceann',
// 		to: 'Port Connous',
// 		baseTime: 'Iria',
// 		timeOffset: -30,
// 	},
// 	{
// 		from: 'Port Cobh',
// 		to: 'Port Qilla',
// 		baseTime: 'Iria',
// 		timeOffset: -60,
// 		checkTicket: true
// 	},
// 	{
// 		from: 'Port Qilla',
// 		to: 'Port Cobh',
// 		baseTime: 'Iria',
// 		timeOffset: -30,
// 	},
// 	{
// 		from: 'Port Cobh',
// 		to: 'Belvast Island',
// 		baseTime: 'Belvast',
// 		timeOffset: -30,
// 		checkTicket: true
// 	},
// 	{
// 		from: 'Belvast Island',
// 		to: 'Port Cobh',
// 		baseTime: 'Belvast',
// 		timeOffset: 0,
// 	}
// ]

const I18N = {
	'cn': {
		'Eavan': '伊文',
		'Irusan': '伊鲁夏',
		'Altam': '亚特',
		'Pihne': '潘妮',
		'Port Sella': '塞拉港口(巨人港)',
		'Port Connous': '肯努斯港口(精灵港)',
		'Port Ceann': '凯安港口',
		'Port Cobh': '卡普港口',
		'Port Qilla': '克拉港口',
		'Belvast Island': '贝尔法斯特',
		'Update Time': '更新时间',
		'Channel Offset': '频道偏移时间',
		'Destination': '目的地',
		'ETD': '预计离港时间',
		'ETA': '预计到达时间',
		'status': '状态',
		'WAIT': '等候',
		'CHECK IN': '检票中',
	},
	'en': {
		'Eavan': 'Eavan',
		'Irusan': 'Irusan',
		'Altam': 'Altam',
		'Pihne': 'Pihne',
		'Port Sella': 'Port Sella',
		'Port Connous': 'Port Connous',
		'Port Ceann': 'Port Ceann',
		'Port Cobh': 'Port Cobh',
		'Port Qilla': 'Port Qilla',
		'Belvast Island': 'Belvast Island',
		'Update Time': 'Update Time',
		'Channel Offset': 'Channel Offset',
		'Destination': 'Destination',
		'ETD': 'ETD',
		'ETA': 'ETA',
		'status': 'status',
		'WAIT': 'WAIT',
		'CHECK IN': 'CHECK IN',
	},
	'jp': {
		'Eavan': 'Eavan',
		'Irusan': 'Irusan',
		'Altam': 'Altam',
		'Pihne': 'Pihne',
		'Port Sella': 'Port Sella',
		'Port Connous': 'Port Connous',
		'Port Ceann': 'Port Ceann',
		'Port Cobh': 'Port Cobh',
		'Port Qilla': 'Port Qilla',
		'Belvast Island': 'Belvast Island',
		'Update Time': 'Update Time',
		'Channel Offset': 'Channel Offset',
		'Destination': 'Destination',
		'ETD': 'ETD',
		'ETA': 'ETA',
		'status': 'status',
		'WAIT': 'WAIT',
		'CHECK IN': 'CHECK IN',
	}
}


let BaseTime = {
	// 'Eavan': {
	// 	base: {
	// 		Iria: {
	// 			// timeStr: '2022-08-04 01:39:32',
	// 			// timeStr: '2022-08-11 01:56:46',
	// 			timeStr: '2022-08-18 01:03:01',
	// 			interval: [5*60*1000, 6*60*1000, 4*60*1000], //等待到港时间，等待开船时间，等待到目的地时间
	// 		},
	// 		Belvast: {
	// 			// timeStr: '2022-08-11 01:56:46',
	// 			timeStr: '2022-08-17 22:34:00',
	// 			interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
	// 		}
	// 	},
	// 	// channelOffset: [-6, -77, -12, -21, 14, -6, -15, -14, 7, 0]
	// 	// channelOffset: [-12, -136, -30, -31, -1, -17, -27, -22, -56, 0]
	// 	channelOffset: [-300, -70, -25, -10, -55, 0, -21, -10, 0, 0]
	// },
	'Altam': {
		base: {
			Iria: {
				timeStr: '2022-08-04 01:43:18',
				interval: [5*60*1000, 6*60*1000, 4*60*1000]
			},
			Belvast: {
				timeStr: '2022-08-04 03:14:19',
				interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000],
			}
		},
		channelOffset: [160, 143, 151, 2, -15, -9, -26, -68, -5, 0]
	},
	// 'Pihne': {
	// 	base: {
	// 		Iria: {
	// 			timeStr: '2022-08-04 01:42:27',
	// 			interval: [5*60*1000, 6*60*1000, 4*60*1000],
	// 		},
	// 		Belvast: {
	// 			timeStr: '2022-08-04 03:07:35',
	// 			interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000]
	// 		}
	// 	},
	// 	channelOffset: [8, 14, 15, 11, 147, 32, 0]
	// },
	'Irusan': {
		base: {
			Iria: {
				timeStr: '2022-08-04 01:42:27',
				interval: [5*60*1000, 6*60*1000, 4*60*1000],
			},
			Belvast: {
				timeStr: '2022-08-04 03:07:35',
				interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000]
			}
		},
		channelOffset: [-300, -70, -25, -10, -55, 0, -21, -10, 0, 0]
	}
}

const createTimeInfo = (type, now, show) => {
	return new Date(now).getTime() + show.split(':').reduce((p, e, i) => p + e * (i ? 60 : 1), 0) * 1000 * Math.pow(-1, type)
}

const init = () => {
	let baseLoopTime = BaseTime.Irusan.base.Iria.interval[0] + BaseTime.Irusan.base.Iria.interval[1]
	let irusanChannelBase = IrusanBaseInfo.slice(1).map(x => createTimeInfo(...x) % baseLoopTime)
	let irusanChannelOffsetBase = irusanChannelBase[irusanChannelBase.length - 1]
	let irusanChannelOffset = irusanChannelBase.map(x => {
		let base = x - irusanChannelOffsetBase
		if(Math.abs(base) < baseLoopTime / 2) {
			return ~~(base / 1000)
		} else {
			if(base < 0) {
				return ~~((base + baseLoopTime) / 1000)
			} else {
				return ~~((base - baseLoopTime) / 1000)
			}
		}
	})
	BaseTime.Irusan.channelOffset = irusanChannelOffset
	BaseTime.Irusan.base.Iria.timeStr = new Date(createTimeInfo(...IrusanBaseInfo[10])).toLocaleString()
	BaseTime.Irusan.base.Belvast.timeStr = new Date(createTimeInfo(...IrusanBaseInfo[0])).toLocaleString()
}

init()

const Ferry = [
	{
		from: 'Port Sella',
		to: 'Port Ceann',
		baseTime: 'Iria',
		timeOffset: 60,
	},
	{
		from: 'Port Connous',
		to: 'Port Ceann',
		baseTime: 'Iria',
		timeOffset: 60,
	},
	{
		from: 'Port Ceann',
		to: 'Port Sella',
		baseTime: 'Iria',
		timeOffset: 0,
	},
	{
		from: 'Port Ceann',
		to: 'Port Connous',
		baseTime: 'Iria',
		timeOffset: 30,
	},
	{
		from: 'Port Cobh',
		to: 'Port Qilla',
		baseTime: 'Iria',
		timeOffset: 0,
		checkTicket: true
	},
	{
		from: 'Port Qilla',
		to: 'Port Cobh',
		baseTime: 'Iria',
		timeOffset: 30,
	},
	{
		from: 'Port Cobh',
		to: 'Belvast Island',
		baseTime: 'Belvast',
		timeOffset: 0,
		checkTicket: true
	},
	{
		from: 'Belvast Island',
		to: 'Port Cobh',
		baseTime: 'Belvast',
		timeOffset: 30,
	}
]

const FindCurrentTimes = (now, baseTimeId, timeOffset, server = 'Eavan', channel = 9, count = 1) => {
	let { timeStr, interval } = BaseTime[server].base[baseTimeId]
	let base = new Date(timeStr)
	let baseTime = base.getTime() - interval[0] + (BaseTime[server].channelOffset[channel] || 0) * 1000
	let waitTime = baseTime + ~~((now - (baseTime + timeOffset * 1000)) / (interval[0] + interval[1])) * (interval[0] + interval[1]) + timeOffset * 1000
	let out = [], tmpTime
	for(let i = 0; i < count; i ++) {
		if(i) {
			out.push([
				tmpTime,
				tmpTime + interval[0],
				tmpTime + interval[0] + interval[1],
				tmpTime + interval[0] + interval[1] + interval[2]
			])
			tmpTime = tmpTime + interval[0] + interval[1]
		} else {
			out.push([
				waitTime,
				waitTime + interval[0],
				waitTime + interval[0] + interval[1],
				waitTime + interval[0] + interval[1] + interval[2]
			])
			tmpTime = waitTime + interval[0] + interval[1]
		}
	}
	return out
}

const AddZero = num => num < 10 ? `0${num}` : num

const RenderTime = ts => {
	let d = new Date(ts)
	return `${d.getHours()}:${AddZero(d.getMinutes())}:${AddZero(d.getSeconds())}`
}

const RenderCountDown = ts => `${~~(ts / 1000 / 60)}:${AddZero(~~(ts / 1000) % 60)}`

const checkStatus = (times, targetTs) => {
	for(let i = 0; i < times.length; i ++) {
		let targetGroup = times[i]
		if(targetTs < targetGroup[1] && targetTs >= targetGroup[0]){
			return {
				group: i,
				target: 0,
				timeOffset: targetGroup[1] - targetTs
			}
		}
		if(targetTs < targetGroup[2] && targetTs >= targetGroup[1]){
			return {
				group: i,
				target: 1,
				timeOffset: targetGroup[2] - targetTs
			}
		}
	}
	return {
		group: -1,
		target: -1,
		timeOffset: 0
	}
}

const fixStrLength = (targetLength, str) => {
	let sl =  str.replace(/[^\u0000-\u00ff]/g, "aa").length
	if (sl < targetLength) {
		return `${str}${new Array(targetLength - sl).fill(' ').join('')}`
	}
	return str
}

const RenderFerryImage = (now, info, ChannelOffset, language, callback) => {
	let output = path.join(IMAGE_DATA, 'mabi_other', `timetable.png`)
	// let output = path.join(`timetable.png`)

	nodeHtmlToImage({
		output,
		html: `
<html>
  <head>
    <title></title>
    <style>
    	/* inject font face */
    	@font-face {
        font-family: 'SANS_SERIF';
        src: url(${SANS_SERIF}) format('truetype');
      }
    	@font-face {
        font-family: 'ALGER';
        src: url(${ALGER}) format('truetype');
      }
    	@font-face {
        font-family: 'AGT_SUPER_BOLD';
        src: url(${AGT_SUPER_BOLD}) format('truetype');
      }
    	@font-face {
        font-family: 'MalbergTrial';
        src: url(${MalbergTrial}) format('truetype');
      }
    	@font-face {
        font-family: 'FPT_BOLD';
        src: url(${FPT_BOLD}) format('opentype');
      }
    	@font-face {
        font-family: 'Corp_Bold';
        src: url(${Corp_Bold}) format('opentype');
      }
    	* {
    		margin: 0;
    		border: 0;
    		padding: 0;
    	}
    	body {
    		width: 680px;
    	}
    	.main-container {
    		padding: 20px;
    		background-color: ${THEMES.BG};
    	}
    	.main-container .info-group{
    		color: ${THEMES.TEXT};
    		margin-bottom: 5px;
    	}
    	.main-container .info-group .label{
    		font-family: AGT_SUPER_BOLD;
    		font-size: 16px;
    	}
    	.main-container .info-group .desc-line{
    		font-size: 16px;
    		margin-top: 3px;
    	}
    	.main-container .info-group .desc-line span{
    		margin-right: 10px;
    	}
    	.main-container .info-group .desc-line .desc-label{
    		font-family: MalbergTrial;
    		margin-right: 15px;
    	}
    	.main-container .info-group .desc-line .offset-status{
    		margin-right: 6px;
    		font-family: MalbergTrial;
    	}
    	.main-container .info-group .desc-line .offset-status.early{
    		color: #34ff34
    	}
    	.main-container .info-group .desc-line .offset-status.late{
    		color: #d80000
    	}
    	.port-group {
    		margin-top: 15px;
    	}
    	.port-group .port-label{
    		font-size: 40px;
    		font-family: ALGER;
    		color: ${THEMES.PORT_LABEL};
    	}
    	.time-table-container {
    		margin-top: 10px;
    		width: 640px;
    		display: flex;
    		flex-direction: column;
    		justify-content: flex-start;
    	}
    	.time-table-container .time-table-header,
    	.time-table-container .time-table-row{
    		font-size: 20px;
    		display: flex;
    		align-items: center;
    		color: ${THEMES.TEXT};
    	}
    	.time-table-container .time-table-header{
    		font-family: FPT_BOLD;
    	}
    	.time-table-container .time-table-row{
    		height: 40px;
    		border-top: 1px solid #fff;
    		background: linear-gradient(to bottom, ${THEMES.ROW_BG_ST}, ${THEMES.ROW_BG_FROM} 45%, ${THEMES.ROW_BG_TO} 55%, ${THEMES.ROW_BG_ED} 100%);
    	}
    	.time-table-container .time-table-col-1{
    		box-sizing: border-box;
    		padding-left: 10px;
    		width: 240px;
    	}
    	.time-table-container .time-table-col-2{
    		width: 130px;
    	}
    	.time-table-container .time-table-col-3{
    		width: 130px;
    	}
    	.time-table-container .time-table-col-4{
    		width: 140px;
    	}
    	.time-table-container .time-table-row{
    	}
    	.time-table-container .time-table-row .time-table-col-1{
    		font-size: 24px;
    		font-family: AGT_SUPER_BOLD;
    	}
    	.time-table-container .time-table-row .time-table-col-2{
    		font-size: 22px;
    		color: ${THEMES.TIME};
    		font-family: Corp_Bold;
    	}
    	.time-table-container .time-table-row .time-table-col-3{
    		font-size: 22px;
    		color: ${THEMES.TIME};
    		font-family: Corp_Bold;
    	}
    	.time-table-container .time-table-row .time-table-col-4{
    		font-family: MalbergTrial;
    		font-size: 20px;
    	}
    	.time-table-container .time-table-row .status{
    	}
    	.time-table-container .time-table-row .status.wait{
    		color: ${THEMES.STATUS_WAIT};
    	}
    	.time-table-container .time-table-row .status.check-in{
    		color: ${THEMES.STATUS_CHECK_IN};
    	}
    </style>
  </head>
  <body>
  	<div class="main-container">
  		${Object.keys(BaseTime).map(server => `
  			<div class="info-group">
					<div class="label">${I18N[language][server]}</div>
					<div class="desc-line">
						<span class="desc-label">${I18N[language]['Update Time']}</span>
						${Object.keys(BaseTime[server].base).map(area => `<span>${area}: ${BaseTime[server].base[area].timeStr}</span>`).join('')}
					</div>
					<div class="desc-line">
						<span class="desc-label">${I18N[language]['Channel Offset']}</span>
						${ChannelOffset[server].map(offset => `
							<span 
								class="offset-status ${(offset == 0 || offset == null) ? '' : offset < 0 ? 'early' : 'late'}"
							>
								${(offset == 0 || offset == null) ? '' : offset < 0 ? '-' : '+'}${offset == null ? '-:--' : RenderCountDown(offset < 0 ? -offset * 1000 : offset * 1000)}
							</span>`).join('')}
					</div>
				</div>
  		`)}
  		${info.map(port => `
				<div class="port-group">
					<div class="port-label">${I18N[language][port.label]}</div>
					<div class="time-table-container">
						<div class="time-table-header">
							<div class="time-table-col time-table-col-1">${I18N[language]['Destination']}</div>
							<div class="time-table-col time-table-col-2">${I18N[language]['ETD']}</div>
							<div class="time-table-col time-table-col-3">${I18N[language]['ETA']}</div>
							<div class="time-table-col time-table-col-4">${I18N[language]['status']}</div>
						</div>
						${port.arrival.map(arrival => arrival.times.map((time, index) => `
							<div class="time-table-row">
								<div class="time-table-col time-table-col-1">${I18N[language][arrival.to]}</div>
								<div class="time-table-col time-table-col-2">${RenderTime(time[2])}</div>
								<div class="time-table-col time-table-col-3">${RenderTime(time[3])}</div>
								<div class="time-table-col time-table-col-4">
									${arrival.status.group == index ? `
										${[
												`<span class="status wait">${I18N[language]['WAIT']}</span>`,
												`<span class="status check-in">${I18N[language]['CHECK IN']}</span>`
											][arrival.status.target]
										}(${RenderCountDown(arrival.status.timeOffset)})
									` : ''}
								</div>
							</div>
						`).join('')).join('')}
					</div>
				</div>
  		`).join('')}
		</div>
  </body>
</html>
`
	})
		.then(() => {
			console.log(`保存timetable.png成功！`)
			let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `timetable.png`)}]`
			callback(imgMsg)
		})

}

const FerryTimetable = (content, qq, groupId, callback) => {
	// if(!(groupId == 577587780 || qq == 799018865)) {
	// 	return
	// }
	let server = 'Irusan', channel = 9, language = 'en'
	content = content.trim()
	switch(content.substring(0, 2).toUpperCase()) {
		case 'CN':
			language = 'cn'
			content = content.substring(2)
			break
		case 'EN':
			language = 'en'
			content = content.substring(2)
			break
		case 'JP':
			language = 'jp'
			content = content.substring(2)
			break
	}
	content = content.trim()
	if(content.toUpperCase().startsWith('YT')){
		server = 'Altam'
		channel = 9
		content = content.substring(2)
	} else if(content.toUpperCase().startsWith('YLX')) {
		server = 'Irusan'
		channel = 9
		content = content.substring(3)
	}
	// switch(content.substring(0, 2).toUpperCase()) {
	// 	// case 'YW':
	// 	// 	server = 'Eavan'
	// 	// 	channel = 9
	// 	// 	break
	// 	case 'YT':
	// 		server = 'Altam'
	// 		channel = 9
	// 		break
	// 	// case 'PN':
	// 	// 	server = 'Pihne'
	// 	// 	channel = 6
	// 	// 	break
	// 	case 'PN':
	// 		server = 'Irusan'
	// 		channel = 6
	// 		break
	// }
	let ct = content.substring(0, 2)
	if(/\d{2}/.test(ct) || ct == 10){
		channel = 9
	} else {
		ct = content.substring(0, 1)
		if(/\d/.test(ct) || ct > 0) {
			channel = ct - 1
		}
	}
	// if(server == 'Pihne' && channel > 6) {
	// 	server = 6
	// }
	let now = Date.now()
	let info = Array.from(new Set(Ferry.map(x => x.from))).map(port => {
		return {
			label: port,
			arrival: Ferry.filter(x => x.from == port).map(routing => {
				let times = FindCurrentTimes(now, routing.baseTime, routing.timeOffset, server, channel, 3)
				return {
					to: routing.to,
					times,
					status: checkStatus(times, now)
				}
			})
		}
	})
	// let out = `now: ${RenderTime(now)}\n`
	// info.forEach(port => {
	// 	out += `================\n`
	// 	out += `${port.label}\n`
	// 	out += `Destination\t${fixStrLength(8, 'ETD')}\t${fixStrLength(8, 'ETA')}\tstatus\n`
	// 	out += port.arrival.map(arrival => arrival.times.map((time, index) => `${arrival.to}\t${RenderTime(time[2])}\t${RenderTime(time[3])}\t${arrival.status.group == index ? `${['WAIT', 'CHECK IN'][arrival.status.target]}(${RenderCountDown(arrival.status.timeOffset)})`: ''}`).join('\n')).join('\n')
	// 	out += '\n'
	// })
	// console.log(out)

	let newChannelOffset = {}, target = BaseTime[server].channelOffset[channel] || 0
	Object.keys(BaseTime).forEach(sn => {
		if(sn == server) {
			newChannelOffset[sn] = BaseTime[sn].channelOffset.map(x => x - target)
		} else {
			newChannelOffset[sn] = BaseTime[sn].channelOffset.map(x => null)
		}
	})

	RenderFerryImage(now, info, newChannelOffset, language, callback)
	// drawTxtImage('', out, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

// FerryTimetable('yt5', 799018865, 1, d=>{console.log(d)})
module.exports = {
	FerryTimetable
}
