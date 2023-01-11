const {LOCALE_IP} = require("../../baibaiConfigs")
const http = require("http")
const { pinyin, PINYIN_STYLE } = require('@napi-rs/pinyin')

const BanUserRandom = (qq, groupId, port, callback, critical = false) => {
	let dur = ((~~(Math.random() * 5) + 1) * 60) * (critical ? 2 : 1)
	const options = {
		host: LOCALE_IP,
		port: port,
		path: `/set_group_ban?group_id=${groupId}&user_id=${qq}&duration=${dur}`,
		method: 'GET',
		headers: {}
	}
	const req = http.request(options, res => {
		res.setEncoding('utf8')
		var resdata = ''
		res.on('data', chunk => {
			resdata = resdata + chunk;
		})
		res.on('end', () => {
			if(critical) {
				callback(`[CQ:at,qq=${qq}] 哎呦，你很勇哦`)
			}
		})
		res.on('error', () => {

		})
	})
	req.on('error',(err) => {
		console.log('req err:')
		console.log(err)
	})
	req.end()
}

const BanUser = (content, qq, groupId, port, callback) => {
	if(analysisPinYin(content)) {
		BanUserRandom(qq, groupId, port, callback, Math.random() < 0.1)
	}
}

const analysisPinYin = content => {
	let py = pinyin(content, {
		style: PINYIN_STYLE.Plain
	}).join('').toLowerCase()
	if(py.match('sb')) {
		return true
	}
	if(py.match('sabi')) {
		return true
	}
	if(py.match('shabi')) {
		return true
	}
	if(py.match('shapi')) {
		return true
	}
	if(py.match('sapi')) {
		return true
	}
	if(py.match('shadiao')) {
		return true
	}
	return false
}

module.exports = {
	BanUser
}
