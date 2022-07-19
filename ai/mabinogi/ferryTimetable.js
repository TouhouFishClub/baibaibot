const fs = require('fs')
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', 'baibaiConfigs.js'))
const { drawTxtImage } = require('../../cq/drawImageBytxt')

const BaseTime = {
	Iria: {
		// base: new Date('2022-06-24 1:55:28'), //到港时间
		base: new Date('2022-07-18 18:07:53'), //到港时间
		interval: [5*60*1000, 6*60*1000, 4*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
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
		// base: new Date('2022-06-24 2:58:28'), //到港时间
		base: new Date('2022-07-18 17:00:27'), //到港时间
		interval: [(2*60+30)*1000, (3*60+30)*1000, 2*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
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
	// let output = path.join(IMAGE_DATA, 'mabi_recipe', `${name}.png`)
	let output = path.join(`timetable.png`)

	nodeHtmlToImage({
		output,
		html: `
<html>
  <head>
    <title></title>
    <style>
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
    		background-color: rgba(1,34,115,1);
    	}
    	.port-group {
    		margin-bottom: 20px;
    	}
    	.port-group .port-label{
    		font-size: 40px;
    		color: #fff;
    	}
    	.time-table-container {
    		margin-top: 20px;
    		width: 600px;
    	}
    	.time-table-container .time-table-header,
    	.time-table-container .time-table-row{
    		font-size: 16px;
    		display: flex;
    		color: #fff;
    	}
    	.time-table-container .time-table-row{
    		background-color: #ff0;	
    	}
    	.time-table-container .time-table-col-1{
    		width: 150px;
    	}
    	.time-table-container .time-table-col-2{
    		width: 150px;
    	}
    	.time-table-container .time-table-col-3{
    		width: 150px;
    	}
    	.time-table-container .time-table-col-4{
    		width: 150px;
    	}
    </style>
  </head>
  <body>
  	<div class="main-container">
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
								<div class="time-table-col time-table-col-4">${arrival.status.group == index ? `${['WAIT', 'CHECK IN'][arrival.status.target]}(${RenderCountDown(arrival.status.timeOffset)})`: ''}</div>
							</div>
						`)).join('')}
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
			// let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_recipe', `${name}.png`)}]`
			// callback(imgMsg)
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
	
	let out = `now: ${RenderTime(now)}\n`
	info.forEach(port => {
		out += `================\n`
		out += `${port.label}\n`
		out += `Destination\t${fixStrLength(8, 'ETD')}\t${fixStrLength(8, 'ETA')}\tstatus\n`
		out += port.arrival.map(arrival => arrival.times.map((time, index) => `${arrival.to}\t${RenderTime(time[2])}\t${RenderTime(time[3])}\t${arrival.status.group == index ? `${['WAIT', 'CHECK IN'][arrival.status.target]}(${RenderCountDown(arrival.status.timeOffset)})`: ''}`).join('\n')).join('\n')
		out += '\n'
	})
	console.log(out)
	RenderFerryImage(now, info, callback)
	// drawTxtImage('', out, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

// FerryTimetable(799018865, 1)
module.exports = {
	FerryTimetable
}
