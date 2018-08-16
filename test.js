const {G21Boss} = require('./ai/mabinogi/G21Boss');
G21Boss(text => {
  console.log(text)
}, true)
const callback = text => {
  console.log(text)
}