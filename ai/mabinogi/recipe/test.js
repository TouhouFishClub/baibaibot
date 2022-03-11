const r = require('./source')

let res = r.getItems()

// test id = 51391

console.log(res.ItemIdToItemDetail.get(51391))
