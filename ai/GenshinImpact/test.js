// const {search} = require('./fetchData');
// const {analysisHtml} = require('./analysis');
// (async () => {
//   let a = await search('钟离')
//   // console.log(a)
//   analysisHtml(a)
//   console.log('=== GET END ===')
// })()

const {createRange, uniAnalysis, Reliquary} = require('./Reliquary')
// const { F } = require('./compair')
// let ts = Date.now()
// let area = new F(10, 20, 30, 40).execute().getResult()
// console.log(area)
// // console.log(area.totalArr.map(x => Array.from(new Set(x))).reduce((p, e) => p.concat(e), []))
// console.log(`Done : ${Date.now() - ts}`)

// ts = Date.now()
// let area2 = createRange([10, 20, 30, 40])
// // console.log(area2)
// console.log(`Done : ${Date.now() - ts}`)



// console.log(uniAnalysis(719, [209,239,269,299], 1))
// console.log(uniAnalysis(14.0, [5.4, 6.2, 7.0, 7.8], 10))
// console.log(uniAnalysis(15.8, [4.1, 4.7, 5.3, 5.8], 10))
// console.log(uniAnalysis(19, [14,16,18,19], 1))
// console.log(uniAnalysis(5.2, [4.5,5.2,5.8,6.5], 10))
// area.forEach(x => {
// 	console.log(x.index)
// })

Reliquary('[CQ:image,file=48dbccb2dec745cebb842ec0f865063d.image,url=https://gchat.qpic.cn/gchatpic_new/799018865/577587780-2698655802-7EEBD1E6C3C81F6E4DDED44378192E1F/0?term=3,subType=0]', 122, 111, d=> {
	console.log(d)
}, 'baiduAip')
