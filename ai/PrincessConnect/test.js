// const { analyze_possibilities } = require('./core/predictions')
// console.log(analyze_possibilities([114,114,111,112], false, 1)[0])
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// const { discord } = require('./discord')
const { cherugo } = require('./cherugo')

const wait = async time => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

cherugo('', true, c)

cherugo('啊打发打发的', true, c)

cherugo('切噜～♪切切噼卟噜哔噼叮铃啰噼叮噜哔噼叮铃啰噼叮噜唎噼哔巴', false, c)

// (async () => {
//
// // console.log(typeof actp)
//
// // tpa('92 102-122 92', '10000', 1, c)
// // tpa('109 152-134 127-142', '10000', 1, c)
//   await wait(1000)
//   discord('recov 1000 2000 3000', '1234', '10000', c)
//   await wait(1000)
//   discord('queue', '1234', '10000', c)
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
