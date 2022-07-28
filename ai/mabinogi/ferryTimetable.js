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
// const SANS_SERIF = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'Microsoft Sans Serif.ttf'))
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

const BaseTime = {
	Iria: {
		baseStr: '2022-07-27 18:09:12',
		// base: new Date('2022-06-24 1:55:28'), //到港时间
		// base: new Date('2022-07-18 18:07:53'), //到港时间
		// base: new Date('2022-07-20 18:08:33'), //到港时间 -1：20
		base: new Date('2022-07-27 18:09:12'), //到港时间 +279 / +4'39"
		interval: [5*60*1000, 6*60*1000, 4*60*1000], //等待到港时间，等待开船时间，等待到目的地时间
		offset: [7, -62, -1, -13, 11, 8, -13, -5, 25, 0] //Eavan Pihne Altam
	},
	// Connous: {
	// 	base: new Date('2022-07-18 18:07:53'), //到港时间
	// 	interval: [5*60*1000, 6*60*1000, 4*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
	// },
	// Qilla: {
	// 	base: new Date('2022-07-18 20:18:23'), //到港时间
	// 	interval: [5*60*1000, 6*60*1000, 4*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
	// },
	Belvast: {
		baseStr: '2022-07-27 18:24:42',
		// base: new Date('2022-06-24 2:58:28'), //到港时间
		// base: new Date('2022-07-18 d17:00:27'), //到港时间
		// base: new Date('2022-07-22 2:22:05'), //到港时间 - 2：20
		base: new Date('2022-07-27 18:24:42'), //到港时间 +37 / +0'37"
		interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000], //等待到港时间，等待开船时间，等待到目的地时间
		offset: [7, -61, 0, -10, 13, 8, -11, -4, 24, 0]
	}
}

const Ferry = [
	{
		from: 'Port Sella',
		to: 'Port Ceann',
		baseTime: 'Iria',
		timeOffset: 0,
	},
	{
		from: 'Port Connous',
		to: 'Port Ceann',
		baseTime: 'Iria',
		timeOffset: 0,
	},
	{
		from: 'Port Ceann',
		to: 'Port Sella',
		baseTime: 'Iria',
		timeOffset: -60,
	},
	{
		from: 'Port Ceann',
		to: 'Port Connous',
		baseTime: 'Iria',
		timeOffset: -30,
	},
	{
		from: 'Port Cobh',
		to: 'Port Qilla',
		baseTime: 'Iria',
		timeOffset: -60,
		checkTicket: true
	},
	{
		from: 'Port Qilla',
		to: 'Port Cobh',
		baseTime: 'Iria',
		timeOffset: -30,
	},
	{
		from: 'Port Cobh',
		to: 'Belvast Island',
		baseTime: 'Belvast',
		timeOffset: -30,
		checkTicket: true
	},
	{
		from: 'Belvast Island',
		to: 'Port Cobh',
		baseTime: 'Belvast',
		timeOffset: 0,
	}
]

const FindCurrentTimes = (now, baseTimeId, timeOffset, count = 1) => {
	let { base, interval } = BaseTime[baseTimeId]
	let baseTime = base.getTime() - interval[0]
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

const RenderFerryImage = (now, info, callback) => {
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
    		width: 640px;
    	}
    	.main-container {
    		padding: 20px;
    		background-color: ${THEMES.BG};
    	}
    	.main-container .info-group{
    		color: ${THEMES.TEXT};
    		margin-bottom: 15px;
    	}
    	.main-container .info-group .label{
    		font-size: 16px;
    	}
    	.main-container .info-group .desc{
    		font-size: 16px;
    		margin-top: 5px;
    	}
    	.main-container .info-group .desc span{
    		margin-right: 10px;
    	}
    	.port-group {
    		margin-bottom: 20px;
    	}
    	.port-group .port-label{
    		font-size: 40px;
    		font-family: ALGER;
    		color: ${THEMES.PORT_LABEL};
    	}
    	.time-table-container {
    		margin-top: 10px;
    		width: 600px;
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
    		width: 220px;
    	}
    	.time-table-container .time-table-col-2{
    		width: 120px;
    	}
    	.time-table-container .time-table-col-3{
    		width: 120px;
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
  		<div class="info-group">
  			<div class="label">Update Time</div>
  			<div class="desc">${Object.keys(BaseTime).map(area => `<span>${area}: ${BaseTime[area].baseStr}</span>`)}</div>
			</div>
  		${info.map(port => `
				<div class="port-group">
					<div class="port-label">${port.label}</div>
					<div class="time-table-container">
						<div class="time-table-header">
							<div class="time-table-col time-table-col-1">Destination</div>
							<div class="time-table-col time-table-col-2">ETD</div>
							<div class="time-table-col time-table-col-3">ETA</div>
							<div class="time-table-col time-table-col-4">status</div>
						</div>
						${port.arrival.map(arrival => arrival.times.map((time, index) => `
							<div class="time-table-row">
								<div class="time-table-col time-table-col-1">${arrival.to}</div>
								<div class="time-table-col time-table-col-2">${RenderTime(time[2])}</div>
								<div class="time-table-col time-table-col-3">${RenderTime(time[3])}</div>
								<div class="time-table-col time-table-col-4">
									${arrival.status.group == index ? `
										${[
											'<span class="status wait">WAIT</span>',
											'<span class="status check-in">CHECK IN</span>'
											][arrival.status.target]}(${RenderCountDown(arrival.status.timeOffset)})
									`: ''}
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

const FerryTimetable = (qq, groupId, callback) => {
	if(!(groupId == 577587780 || qq == 799018865)) {
		return
	}
	let now = Date.now()
	let info = Array.from(new Set(Ferry.map(x => x.from))).map(port => {
		return {
			label: port,
			arrival: Ferry.filter(x => x.from == port).map(routing => {
				let times = FindCurrentTimes(now, routing.baseTime, routing.timeOffset, 3)
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
	RenderFerryImage(now, info, callback)
	// drawTxtImage('', out, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

// FerryTimetable(799018865, 1)
module.exports = {
	FerryTimetable
}
