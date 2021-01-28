const fs = require('fs-extra')
const path = require('path-extra')
let rangeInfo = false
let rangeMap = {}

const AllRangeData = () => {
  if(!rangeInfo) {
    rangeMap = fs.readJsonSync(path.join(__dirname, 'data', 'range_table.json'))
  }
  return rangeMap
}

module.exports = {
  AllRangeData,



}