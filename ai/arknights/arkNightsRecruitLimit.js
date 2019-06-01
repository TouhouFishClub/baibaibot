const fs = require('fs-extra')
const path = require('path-extra')
let recruitLimit = []

module.exports = function() {
  if(!recruitLimit.length) {
    let str = fs.readJsonSync(path.join(__dirname, 'data', 'gacha_table.json')).recruitDetail
    str = str.substr(str.indexOf('★\\n'))
    str = str.replace(/★/g, '')
    str = str.replace(/\\n/g, '')
    str = str.replace(/\r\n/g, '')
    str = str.replace(/\-{20}/g, ' / ')
    str = str.replace(new RegExp('<@rc.eml>', 'g'), '')
    str = str.replace(new RegExp('</>', 'g'), '')
    recruitLimit = str.split('/').map(x => x.trim())
  }
  return recruitLimit
}