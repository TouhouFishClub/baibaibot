// const akc = require('./CoV2020')
// const {cov} = require('./CoV2019ByTianApi')
const chp = require('./chp')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

chp(c)
// setTimeout(() => {
//   cov('日本', c)
// }, 20000)
