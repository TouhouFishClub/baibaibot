const r = require('./source')
const HTMLParser = require('node-html-parser');

let res = r.getItems()

// test id = 51391

// console.log(HTMLParser.parse(res.ItemIdToItemDetail.get(51391).html))
console.log(JSON.parse(HTMLParser.parse(res.ItemIdToItemDetail.get(50221).html)))
