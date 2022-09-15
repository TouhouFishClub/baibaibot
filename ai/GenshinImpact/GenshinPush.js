const emojiSet = new Set([
	'🏆',
	'✔',
	'✖',
	'🔅',
	'🌈',
	'👀',
	'💠',
	'🌕',
])

const analyzerMessage = msg => {
	let out = {}, users = [], userInfo = {}, analyzerUser = false
	msg.split('\n').forEach(line => {
		if(analyzerUser) {
			if(line.trim().startsWith('🔅')) {
				// 🔅{nickname} {level} {region_name}
				let [nickname, level, region_name] = line.split('🔅')[1].trim().split(' ').filter(x => x)
				userInfo = Object.assign(userInfo, {
					nickname,
					level,
					region_name
				})
				return
			}
			if(line.trim().startsWith('Today')) {
				// Today's reward: {reward_name} × {reward_cnt}
				let [reward_name, reward_cnt] = line.split(':')[1].trim().split('×').filter(x => x).map(x => x.trim())
				userInfo = Object.assign(userInfo, {
					reward_name,
					reward_cnt
				})
				return
			}
			if(line.trim().startsWith('Total')) {
				// Total monthly check-ins: {total_sign_day} days
				userInfo.total_sign_day = line.split(':')[1].split('days')[0].trim()
				return
			}
			if(line.trim().startsWith('Status')) {
				// Status: {status}
				userInfo.status = line.split(':')[1].trim()
				return
			}
			if(line.trim().startsWith('💠')) {
				// 💠primogems: {current_primogems}
				userInfo.current_primogems = line.split(':')[1].trim()
				return
			}
			if(line.trim().startsWith('🌕')) {
				// 🌕mora: {current_mora}
				userInfo.current_mora = line.split(':')[1].trim()
				return
			}
			if(line.trim().startsWith('###')) {
				users.push(userInfo)
				userInfo = {}
			}
		} else {
			if(line.trim().startsWith('#')) {
				analyzerUser = true
				return
			}
			if(line.indexOf('✔') > -1) {
				let s = line.split('·')
				out.successCount = s[0].split('✔')[1].trim()
				out.failCount = s[1].split('✖')[1].trim()
			}
		}
	})
	out.users = users
	console.log(out)
}

module.exports = {
	analyzerMessage
}