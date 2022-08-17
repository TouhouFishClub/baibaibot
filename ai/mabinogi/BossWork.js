const { drawTxtImage } = require('../../cq/drawImageBytxt')
const BossList = {
	BlackDragon: {
		genMinute: 57,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16],
			[17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16],
			[17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
		],
		cnName: '黑龙',
		name: 'Black Dragon'
	},
	WhiteDragon: {
		genMinute: 57,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16],
			[17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16],
			[10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '白龙',
		name: 'White Dragon'
	},
	PrairieDragon: {
		genMinute: 12,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '平原龙',
		name: 'Prairie Dragon'
	},
	DesertDragon: {
		genMinute: 12,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23]
		],
		cnName: '沙漠龙',
		name: 'Desert Dragon'
	},
	RedDragon: {
		genMinute: 12,
		hourOfWeek: [
			[18,19,20,21,22,23],
			[0,1,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17]
		],
		cnName: '红龙',
		name: 'Red Dragon'
	},
	Mokkurkalfi: {
		genMinute: 27,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '莫库尔卡皮',
		name: 'Mokkurkalfi'
	},
	SylvanDragon: {
		genMinute: 27,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17],
			[10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '希尔斑龙',
		name: 'Sylvan Dragon'
	},
	Mammoth: {
		genMinute: 32,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '猛犸象',
		name: 'Mammoth'
	},
	Ifrit: {
		genMinute: 32,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23]
		],
		cnName: '火神',
		name: 'Ifrit'
	},
	Yeti: {
		genMinute: 32,
		hourOfWeek: [
			[18,19,20,21,22,23],
			[0,1,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17]
		],
		cnName: '雪人',
		name: 'Yeti'
	},
	GiantLion: {
		genMinute: 45,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
		],
		cnName: '巨大狮子',
		name: 'Giant Lion'
	},
	GiantSandworm: {
		genMinute: 45,
		hourOfWeek: [
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14],
			[10,11,12,13,14,15,16,17],
			[18,19,20,21,22,23]
		],
		cnName: '巨大沙虫怪',
		name: 'Giant Sandworm'
	},
	GiantAlligator: {
		genMinute: 45,
		hourOfWeek: [
			[18,19,20,21,22,23],
			[0,1,20,21,22,23],
			[0,1,10,11,12,13,14],
			[15,16,17,18,19],
			[20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
			[0,1,10,11,12,13,14,15,16,17]
		],
		cnName: '巨大鳄鱼',
		name: 'Giant Alligator'
	},
}

const checkWorkState = (genMinute, workTimes, yesterdayWorkTimes) => {
	let now = new Date(), cHour = now.getHours(), cMinute = now.getMinutes()
	if(cHour < 1 && workTimes[0] == 0 && cMinute < genMinute && yesterdayWorkTimes[yesterdayWorkTimes.length - 1] == 23) {
		return true
	}
	if(cMinute < genMinute) {
		return new Set(workTimes).has(cHour - 1)
	} else {
		return new Set(workTimes).has(cHour)
	}
}

const checkCurrentTime = (genMinute, workTimes) => {
	let now = new Date(), cHour = now.getHours(), cMinute = now.getMinutes(), tHour = cHour - (cMinute < genMinute ? 1 : 0)
	return {
		count: workTimes.filter(x => x > tHour).length,
		current: new Set(workTimes).has(tHour) ? `${tHour}:${genMinute}` : '无'
	}
}
const checkNextTime = (genMinute, workTimes, tomorrowWorkTimes) => {
	let now = new Date(), cHour = now.getHours(), cMinute = now.getMinutes(), tHour = cHour + (cMinute < genMinute ? 0 : 1)
	let targetHour = workTimes.concat(tomorrowWorkTimes.map(x => x + 24)).filter(x => x >= tHour)[0]
	return targetHour > 23 ? `[明日]${targetHour % 24}:${genMinute}`: `${targetHour}:${genMinute}`
}

const BossWork = (qq, group, callback) => {
	let now = new Date(), cWeek = now.getDay()
	let str = Object.values(BossList).map(bossInfo => {
		let state = checkWorkState(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek], bossInfo.hourOfWeek[(cWeek + 6) % 7])
		let currentInfo = checkCurrentTime(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek])
		let nextInfo = checkNextTime(bossInfo.genMinute, bossInfo.hourOfWeek[cWeek], bossInfo.hourOfWeek[(cWeek + 1) % 7])
		return `[${ state ? '上班中': '未上班'}] ${bossInfo.cnName}\n本次出现时间：${currentInfo.current}\n下次出现时间：${nextInfo}\n今日剩余${currentInfo.count}次\n`
	}).join('\n')
	drawTxtImage('', str, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

module.exports = {
	BossWork
}