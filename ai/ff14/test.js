const { PerfectCactpot } = require('./cactpot')
const { fflogs2Reply } = require('./fflogs2')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// PerfectCactpot(
// `a
// 8xx
// 49x
// 7xx`, c)
fflogs2Reply('肥宅 黑魔', '111', c, 1)