const fs = require('fs-extra')
const path = require('path-extra')
let handbooksInit = false
let handbooksMap = {}

module.exports = function(cid) {
  if(!handbooksInit) {
    handbooksMap = fs.readJsonSync(path.join(__dirname, 'data', 'handbook_info_table.json'))
  }
  return handbooksMap.handbookDict[cid]
}