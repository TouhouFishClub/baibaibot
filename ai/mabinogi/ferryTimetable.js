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

const RenderTime = ts => {
	let d = new Date(ts)
	return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
}

const FerryTimetable = callback => {
	let out = '', now = Date.now()
	out += `now: ${RenderTime(now)}\n`
	Ferry.forEach(routing => {
		out += ''
		out += `================\n`
		out += `${routing.from} -> ${routing.to}\n`
		let times = FindCurrentTimes(now, routing.baseTime, routing.timeOffset, 3)
		// out += `${FindCurrentTimes(now, routing.baseTime, routing.timeOffset).map(ts => RenderTime(ts))}\n`
		out += `${times.map(gt => gt.map(ts => RenderTime(ts))).join('\n')}\n`
	})
	// console.log(out)
	drawTxtImage('', out, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

// FerryTimetable()
module.exports = {
	FerryTimetable
}
