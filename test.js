const rd = require('./ai/kanColleEquip')

const callback = msg => {
  console.log(msg)
}

setTimeout(() => {
  rd(8, '隼', callback)
}, 10000)
