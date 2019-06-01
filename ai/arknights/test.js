const ak = require('./arkNightsRecruit')
const akc = require('./arkNightsCalc')
const aks = require('./arkNightsCharacter')
const akk = require('./arkNightsSkill')
const akl = require('./arkNightsRecruitLimit')
const {baiduocr} = require('../image/baiduocr');
const c = m => {
  console.log('===== output =====')
  console.log(m)
}
// console.log(akk('skchr_plosis_2', '3'))
// akc('123456', '5 1-1 1-80   ', c)
// aks('123456', '白面鸮 adfa', c)
// aks('123456', '艾雅法拉 8', c)
aks('123456', '天火 9', c)
// aks('123456', '月见夜 10', c)
// akl()
// ak(123,'[CQ:image,file=D92B8C3ECBA963C3563701F900F72FF1.jpg,url=https://gchat.qpic.cn/gchatpic_new/799018865/577587780-2346967126-D92B8C3ECBA963C3563701F900F72FF1/0?vuin=2375373419&term=2]', c)
// ak(123132, '重装 重装 先锋干员 群攻 位移', c)
// ak('[CQ:image,file=9A38768CEBF470A313C6A4B7441B9242.png,url=https://gchat.qpic.cn/gchatpic_new/912008974/549823679-3005667254-9A38768CEBF470A313C6A4B7441B9242/0?vuin=2375373419&term=2]', c)
// ak('[CQ:image,file=200EB4D8FBB1A7B34FA47E4240C895BA.png,url=https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2][CQ:image,file=200EB4D8FBB1A7B34FA47E4240C895BA.png,url=https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2]', c)
// baiduocr('https://gchat.qpic.cn/gchatpic_new/540540678/577587780-3031794996-46C9FF58020E58EDDAABE149F058591C/0?vuin=2375373419&term=2', d => {
//   console.log(d.split('\n'))
// })

