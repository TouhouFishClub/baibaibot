// const {search} = require('./fetchData');
// const {analysisHtml} = require('./analysis');
// (async () => {
//   let a = await search('钟离')
//   // console.log(a)
//   analysisHtml(a)
//   console.log('=== GET END ===')
// })()

const {createRange, uniAnalysis, Reliquary} = require('./Reliquary')
// let area = createRange([1,2,3,4])
// console.log(area)
// console.log(uniAnalysis(719, [209,239,269,299], 1))
// console.log(uniAnalysis(14.0, [5.4, 6.2, 7.0, 7.8], 10))
// console.log(uniAnalysis(15.8, [4.1, 4.7, 5.3, 5.8], 10))
// console.log(uniAnalysis(19, [14,16,18,19], 1))
console.log(uniAnalysis(5.2, [4.5,5.2,5.8,6.5], 10))
// area.forEach(x => {
// 	console.log(x.index)
// })

// Reliquary('[CQ:image,file=0c6599d921adad1571ed44a79c9796c2.image,url=https://gchat.qpic.cn/gchatpic_new/799018865/4188919449-2224573346-91BE2AE2146336DD99470CCB0997CA6C/0?term=3]', d=> {
// 	console.log(d)
// })
