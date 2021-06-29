// const ak = require('./arkNightsRecruit')
// const akc = require('./arkNightsCalc')
// const aks = require('./arkNightsCharacter')
// const akk = require('./arkNightsSkill')
// const akl = require('./arkNightsRecruitLimit')
const {baiduocr} = require('../image/baiduocr');
// const {numberOcr} = require('../image/baiduNumOcr');
// const akb = require('./arkNightsBuildingTheme')
// const akc = require('./arkNightChallenge')
// const akcc = require('./arkNightsCharacterCompare')
// const { calendar } = require('./arkNightsCalendar')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

let str = [
	'https://gchat.qpic.cn/gchatpic_new/799018865/4188919449-2224573346-91BE2AE2146336DD99470CCB0997CA6C/0?term=3',
	'https://gchat.qpic.cn/gchatpic_new/1936049750/4188919449-2727410335-BCB4045FB92196E65E911F476196F05A/0?term=3',
	'https://gchat.qpic.cn/gchatpic_new/993164709/4188919449-3179366049-38938239A0C02C8A2D91D29FFCDDDABA/0?term=3',
	'https://gchat.qpic.cn/gchatpic_new/993164709/4188919449-3086194633-4FBD20E083C833C0C82439589CE00B19/0?term=3'
]

baiduocr(str[3], d => {
	console.log('=========')
	console.log(d.split('\n').map(x => x.match(/[\u4e00-\u9fa5]+\+\d+(\.\d+)?%?/)).filter(x => x).map(x => x[0]))
	console.log('=========')
})

// numberOcr('https://gchat.qpic.cn/gchatpic_new/799018865/2195700800-2610016468-C0E1FEE88BFB514CE5E7A7953F2FBCAB/0?term=3', d => {
// 	console.log(d)
// })

// calendar(c)
// akc('213', c)
// akb('111', '陈的办公室', c)
// akcc('111', '1551-蛇屠箱', c)
// akcc('111', '\\S+', c)
// console.log(akk('skchr_plosis_2', '3'))
// akc('123456', '5 1-1 1-80   ', c)
// aks('123456', '初雪', c)
// aks('111', '阿米娅/升变', c, true)
// aks('123456', '安洁 8', c)
// aks('123456', '空爆 8', c)
// aks('123456', '黑角 8', c)
// aks('123456', '-2 8', c)
// aks('123456', '艾雅法拉 8', c)
// aks('123456', '夜莺 8', c)
// console.log(Date.now())
// aks('123456', '\\S+', c)
// aks('123456', '空$', c)
// aks('123456', '推进 9', c)
// aks('123456', '\\S+', c)
// akl()
// ak(123,'[CQ:image,file=D92B8C3ECBA963C3563701F900F72FF1.jpg,url=https://gchat.qpic.cn/gchatpic_new/799018865/577587780-2346967126-D92B8C3ECBA963C3563701F900F72FF1/0?vuin=2375373419&term=2]', c)
// console.log(Date.now())
// ak(123132, '术士 先锋 近战 削弱 输出', c)
// ak(123132, '远程 治疗 女性 群攻', c)
// ak(123132, '高级资深处男', c)
// ak('[CQ:image,file=9A38768CEBF470A313C6A4B7441B9242.png,url=https://gchat.qpic.cn/gchatpic_new/912008974/549823679-3005667254-9A38768CEBF470A313C6A4B7441B9242/0?vuin=2375373419&term=2]', c)
// ak('[CQ:image,file=200EB4D8FBB1A7B34FA47E4240C895BA.png,url=https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2][CQ:image,file=200EB4D8FBB1A7B34FA47E4240C895BA.png,url=https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2]', c)

const wait = async time => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

// (async () => {
//
// // console.log(typeof actp)
//
// // tpa('92 102-122 92', '10000', 1, c)
// // tpa('109 152-134 127-142', '10000', 1, c)
//   await wait(1000)
//
//   numberOcr('https://gchat.qpic.cn/gchatpic_new/799018865/2195700800-3126896560-AEBC24C464C58FA1360E418F43A13065/0?term=2', d => {
//     console.log(d)
//   })
//   await wait(1000)
//   numberOcr('https://gchat.qpic.cn/gchatpic_new/799018865/2195700800-2483394515-E798C264919D57F6B6F48716D759D182/0?term=2', d => {
//     console.log(d)
//   })
//   await wait(1000)
//   numberOcr('https://gchat.qpic.cn/gchatpic_new/705886109/2195700800-3007063783-1FFD4B07E386B580FB112EE5A7645F1E/0?term=2', d => {
//     console.log(d)
//   })
//   await wait(1000)
//   numberOcr('https://gchat.qpic.cn/gchatpic_new/799018865/2195700800-2290885552-1A3D25D8E37885A6F0588BAB7253AF04/0?term=2', d => {
//     console.log(d)
//   })
// })()

