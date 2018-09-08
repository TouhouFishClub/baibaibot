const rd = require('./ai/randomDice')

const callback = msg => {
  console.log(msg)
}

rd('d100xx4', callback)
