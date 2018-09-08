const rd = require('./ai/randomDice')

const callback = msg => {
  console.log(msg)
}

rd('100x4',899, callback)
