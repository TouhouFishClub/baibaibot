const https = require('https')
const { renderCalendar } = require('../calendar/index')
let tmp = {}

const BA_Schedule = async (server, callback, getData = false) => {
	let NOW_DATE = new Date()
  if(!(tmp.updateData && new Date(tmp.updateData).getDate() == new Date().getDate())) {
		let { now, next} = createNowAndNextMonthTs()
		let res = await Promise.all([now, next].map(x => fetchData(x)))
		let merge = mergeAllData(res)
		tmp.updateData = Date.now()
		tmp.data = merge
  }
	let out = formatData(tmp.data, server)
	if(getData) {
		callback(out)
		return
	}
	renderCalendar(NOW_DATE.getFullYear(), NOW_DATE.getMonth() + 1, callback, out, `_ba_${server}`)
}

const formatData = (data, server) => {
	let out = data.map(x => {
		let name = x.title
		name = name.replace(new RegExp(`【${server}.*?】`, 'g'), '')
		let start_time = parseInt(`${x.begin_at}000`)
		let end_time = parseInt(`${x.end_at}000`)
		return Object.assign(x, {
			name,
			start_time,
			end_time
		})
	})
	out = out.filter(x => x.pub_area == server && !x.importance)
	return out
}

const mergeAllData = monthData => {
	let out = [], idSet = new Set([])
	monthData.forEach(month => {
		if(month != 'ERROR' && month && month.data){
			month.data.forEach(data => {
				if(!idSet.has(data.id)) {
					out.push(data)
					idSet.add(data.id)
				}
			})
		}
	})
	return out
}

const createNowAndNextMonthTs = () => {
	let now = new Date()
	return {
		now: `${new Date(`${now.getFullYear()}-${now.getMonth()+1}-1 0:0:0`).getTime()}`.substring(0, 10),
		next: `${new Date(`${now.getMonth() == 11 ? now.getFullYear() + 1 : now.getFullYear()}-${now.getMonth() == 11 ? '1' : now.getMonth()+2}-1 0:0:0`).getTime()}`.substring(0, 10)
	}
}

const fetchData = startTs => new Promise(resolve => {
// https://ba.gamekee.com/v1/activity/query?active_at=1693497600
	https.get({
		host: 'ba.gamekee.com',
		port: 443,
		path: `/v1/activity/query?active_at=${startTs}`,
		method: 'GET',
		rejectUnauthorized: false,
		headers: {
			'Accept':'application/json',
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
			'Game-Alias': 'ba',
			'Game-Id': 0
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

// BA_Schedule('国服', d => {
// 	console.log(d)
// }, true)

module.exports = {
	BA_Schedule
}
