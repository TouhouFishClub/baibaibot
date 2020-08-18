// const akc = require('./CoV2020')
// const {cov} = require('./CoV2019ByTianApi')
const mc = require('./MorseCode')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// chp(c)
setTimeout(() => {
  mc('adfadfasd/.-./.-./-.-/.-/.../--./.-/--./.-', false, c)
}, 1)
