const { drawTxtImage } = require('../../cq/drawImageBytxt')

const BaseTime = {
	Iria: {
		base: new Date('2022-06-24 1:55:28'),
		interval: [6*60*1000, 5*60*1000, 4*60*1000]
	},
	Belvast: {
		base: new Date('2022-06-24 2:58:28'),
		interval: [(3*60+30)*1000, (2*60+30)*1000, 2*60*1000]
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

const FindCurrentTimes = (now, baseTimeId, timeOffset) => {
	let { base, interval } = BaseTime[baseTimeId]
	let st = base.getTime() + ~~((now - (base.getTime() + timeOffset * 1000)) / (interval[0] + interval[1])) * (interval[0] + interval[1]) + timeOffset * 1000
	return [st, st + interval[0], st + interval[0] + interval[2]]
}

const RenderTime = ts => {
	let d = new Date(ts)
	return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
}

const FerryTimetable = callback => {
	let out = '', now = Date.now()
	Ferry.forEach(routing => {
		out += ''
		out += `================\n`
		out += `${routing.from} -> ${routing.to}\n`
		out += `${FindCurrentTimes(now, routing.baseTime, routing.timeOffset).map(ts => RenderTime(ts))}\n`
	})
	console.log(out)
}

FerryTimetable()
// module.exports = {
// 	FerryTimetable
// }