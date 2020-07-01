// const { analyze_possibilities } = require('./core/predictions')
// console.log(analyze_possibilities([114,114,111,112], false, 1)[0])
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// const { discord } = require('./discord')
// const { cherugo } = require('./cherugo')
// const { schedule } = require('./schedule')
const { guildRankSearch } = require('./guildRank')

const wait = async time => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}
let con = 'brs 会长#幻天 -- forceApi', from = 799018865, groupid=111;
(async () => {
  await wait(1000)

  let grs = con.substring(3).trim(), sp = grs.split(' -- '), option = {}
  if(sp.length == 2) {
    grs = sp[0]
    if(from == 799018865) {
      let params = sp[1]
      params.split('&').forEach(p => {
        let s = p.split('=')
        if(s.length == 2) {
          option[s[0]] = s[1]
        } else {
          option[s[0]] = true
        }
      })
    }
  }
  console.log('search: ', grs)
  guildRankSearch(grs, from, groupid, c, option)
  // guildRankSearch('会长#幻天', 111, 111111, c)
})()
// cherugo('', true, c)
//
// cherugo('啊打发打发的', true, c)
//
// cherugo('切噜～♪切切噼卟噜哔噼叮铃啰噼叮噜哔噼叮铃啰噼叮噜唎噼哔巴', false, c)

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
