const fs = require('fs')
const path = require('path')

let optionsetInfo = fs.readFileSync(path.join(__dirname, '../optionset_R291'), 'utf-8')
let optionsetInfoNew = fs.readFileSync(path.join(__dirname, 'optionset_R294'), 'utf-8')

console.log('=== different lines ===')
optionsetInfoNew.split('\n').forEach((line, index) => {
  if(line !== optionsetInfo.split('\n')[index])
    console.log(line)
})