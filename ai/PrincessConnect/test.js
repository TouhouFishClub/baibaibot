// const { analyze_possibilities } = require('./core/predictions')
// console.log(analyze_possibilities([114,114,111,112], false, 1)[0])
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// const { discord } = require('./discord')
const { cherugo } = require('./cherugo')
// const { schedule } = require('./schedule')
// const { guildRankSearch } = require('./guildRank')


// schedule('cn', d =>{
// 	console.log(d)
// }, true)

// const wait = async time => {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve()
//     }, time)
//   })
// }
// let con = 'bcs 圣米卡艾尔学院 -- drawImage', from = 799018865, groupid=111;
// (async () => {
//   await wait(1000)
//
//   let grs = con.substring(3).trim(), sp = grs.split(' -- '), option = {}
//   if(sp.length == 2) {
//     grs = sp[0]
//     if(from == 799018865) {
//       let params = sp[1]
//       params.split('&').forEach(p => {
//         let s = p.split('=')
//         if(s.length == 2) {
//           option[s[0]] = s[1]
//         } else {
//           option[s[0]] = true
//         }
//       })
//     }
//   }
//   console.log('search: ', grs)
//   guildRankSearch(grs, from, groupid, c, option)
//   // guildRankSearch('会长#幻天', 111, 111111, c)
// })()
// cherugo('', true, c)
//
// cherugo('啊打发打发的', true, c)
//
cherugo('切噜～♪切啵啪哔啰哔啰切啰咧啰://切啰啰啰啰啰啰.切叮啪嘭啪巴啪嘭啪叮啪嘭啪巴啪嘭啪.切咧啪铃啪拉啪/切啪啰嘭啪哔啪唎啪铃啪/切叮哔啪唎卟咧啰哔噜哔哔咧卟咧卟咧啵啰啰咧啵啪啰咧?切啪啪叮啰铃啪拉啪=切咧啰唎啪卟啪叮啰咧啪啵啪&切咧啰唎啪嘭啪哔啪=切卟咧哔咧咧咧叮咧切咧啰咧卟咧嘭咧卟咧啵咧叮咧哔咧啰咧咧咧叮咧嘭咧嘭咧切咧咧咧叮咧', false, c)

// (async () => {
//
// // console.log(typeof actp)
//
// // tpa('92 102-122 92', '10000', 1, c)
// // tpa('109 152-134 127-142', '10000', 1, c)
//   await wait(1000)
//   discord('recov 1000 2000 3000', '1234', '10000', c)
// //   await wait(1000)
// //   discord('queue', '1234', '10000', c)
//   await wait(1000)
//   discord('attack 500', '1234', '10000', c)
//   await wait(1000)
//   discord('queue', '1234', '10000', c)
//   await wait(1000)
//   discord('queue', '4321', '10000', c)
//   await wait(1000)
//   discord('attack 500', '1234', '10000', c)
//   await wait(1000)
//   discord('attack 500', '4321', '10000', c)
//   await wait(1000)
//   discord('queue', '4321', '10000', c)
//   await wait(1000)
//   discord('attack 500', '4321', '10000', c)
//   await wait(1000)
//   discord('queue', '4321', '10000', c)
//   await wait(1000)
//   discord('tree', '4321', '10000', c)
//   await wait(1000)
//   discord('where', '4321', '10000', c)
//   await wait(1000)
//   discord('queue', '1234', '10000', c)
//   await wait(1000)
//   discord('attack 500', '1234', '10000', c)
//   await wait(1000)
//   discord('queue', '1234', '10000', c)
//   await wait(1000)
//   discord('where', '4321', '10000', c)
//   await wait(1000)
//   discord('queue', '5555', '10000', c)
//   await wait(1000)
//   discord('attack 2000', '5555', '10000', c)
//   await wait(1000)
//   discord('queue', '5555', '10000', c)
//   await wait(1000)
//   discord('attack 2000', '5555', '10000', c)
//   await wait(1000)
//   discord('where', '4321', '10000', c)
//   await wait(1000)
// })()
