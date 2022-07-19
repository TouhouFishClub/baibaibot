const { drawTxtImage } = require('../../cq/drawImageBytxt')

const BaseTime = {
	Iria: {
		base: new Date('2022-06-24 1:55:28'), //到港时间
		interval: [5*60*1000, 6*60*1000, 4*60*1000] //等待到港时间，等待开船时间，等待到目的地时间
	},
	Belvast: {
		base: new Date('2022-06-24 2:58:28'), //到港时间
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
	// drawTxtImage('', out, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

FerryTimetable()
// module.exports = {
// 	FerryTimetable
// }