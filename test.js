const rd = require('./ai/zodiac')

const callback = msg => {
  console.log(msg)
}

rd('天平座运势', callback)
