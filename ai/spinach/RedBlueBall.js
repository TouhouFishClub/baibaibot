const raffle = (content, qq, group, callback, time = 1) => {
	let r = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33]
	let b = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
	let s = ''
	for(let i = 0; i < time; i ++) {
		s += `红球：${r.sort((a, b) => Math.random() < 0.5 ? 1 : -1).slice(-6).sort((a, b) => a - b).join(', ')}\n蓝球：${b[~~(Math.random() * b.length)]}\n`
	}
	callback(`请拿好你的财富密码：\n${s}`)
}

module.exports = {
	raffle
}