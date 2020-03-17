// const akc = require('./CoV2020')
const {cov} = require('./CoV2019ByTianApi')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

cov('武汉', c)
setTimeout(() => {
  cov('日本', c)
}, 20000)
