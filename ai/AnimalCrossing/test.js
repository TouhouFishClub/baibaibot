// const { analyze_possibilities } = require('./core/predictions')
// console.log(analyze_possibilities([114,114,111,112], false, 1)[0])

const c = m => {
  console.log('===== output =====')
  console.log(m)
}

const { actp } = require('./TurnipProphet')

// console.log(typeof actp)

// tpa('92 102-122 92', '10000', 1, c)
// tpa('109 152-134 127-142', '10000', 1, c)
actp('99 84', '10000', '10000', 2, c)
