// const akc = require('./CoV2020')
const {cov} = require('./CoV2019ByTianApi')
// const chp = require('./chp')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// chp(c)
setTimeout(() => {
  cov('外国', c)
}, 1)
