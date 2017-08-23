const fs = require('fs-extra')
const path = require('path-extra')
const _ = require('lodash')

module.exports = function (userId, content, callback) {
  let response
  //TODO: each data
  Data.map(item => {

  })
  switch(content){
    case '':
      response = `\n【说明文字】`
      break;
    default:

  }
  callback(response)
}

const Data = fs.readJsonSync(path.join(__dirname, 'assets', 'data.json'))

const improveData = _.sortBy(Data, ['icon', 'id'])

const getJSTDayofWeek = () => {
  const date = new Date()
  let day = date.getUTCDay()
  if (date.getUTCHours() >= 15) {
    day = (day + 1) % 7
  }
  return day
}