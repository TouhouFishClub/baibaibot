const ak = require('./arkNightsRecruit')
const {baiduocr} = require('../image/baiduocr');
const c = m => {console.log(m)}
// ak('近卫干员 特种干员 女性干员 快速复活 召唤', c)
ak('狙击 辅助 先锋 男性 费用回复', c)
// ak('[CQ:image,file=9A38768CEBF470A313C6A4B7441B9242.png,url=https://gchat.qpic.cn/gchatpic_new/912008974/549823679-3005667254-9A38768CEBF470A313C6A4B7441B9242/0?vuin=2375373419&term=2]', c)
// ak('[CQ:image,file=200EB4D8FBB1A7B34FA47E4240C895BA.png,url=https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2][CQ:image,file=200EB4D8FBB1A7B34FA47E4240C895BA.png,url=https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2]', c)
// baiduocr('https://gchat.qpic.cn/gchatpic_new/771210053/549823679-2274281053-200EB4D8FBB1A7B34FA47E4240C895BA/0?vuin=2375373419&term=2', d => {
//   console.log(d.split('\n'))
// })

