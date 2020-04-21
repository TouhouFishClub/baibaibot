// const { analyze_possibilities } = require('./core/predictions')
// console.log(analyze_possibilities([114,114,111,112], false, 1)[0])

const c = m => {
  console.log('===== output =====')
  console.log(m)
}

const tpa = require('./TurnipProphet')

console.log(typeof tpa)

// tpa('92 102-122 92', '10000', 1, c)
// tpa('109 152-134 127-142', '10000', 1, c)
tpa('', '10000', '10000', 1, c)
