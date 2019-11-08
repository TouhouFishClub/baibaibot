const { PerfectCactpot } = require('./cactpot')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

PerfectCactpot(
`a
8xx
49x
7xx`, c)