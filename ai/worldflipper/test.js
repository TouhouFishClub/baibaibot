const bbp = require('./BossBattlePushing')

const c = m => {
  console.log('===== output =====')
  console.log(m)
}
setTimeout(() => {
  bbp('强制重启', 799018865, c)
}, 1000)