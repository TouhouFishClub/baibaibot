const https = require('https')
const { renderCalendar } = require('../calendar/index')
let tmp = {}

const schedule = (server = 'cn', callback) => {
  if(tmp.updateData && new Date(tmp.updateData).getDate() == new Date().getDate() && tmp[server]) {
    let now = new Date()
    renderCalendar(now.getFullYear(), now.getMonth() + 1, callback, JSON.parse(tmp[server]), '_pcr')
  } else {
    https.get({
      host: 'tools.yobot.win',
      port: 443,
      path: `/calender/${server}.json`,
      method: 'GET',
      headers: {
        'Accept':'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
      },
    }, res => {
      let chunk = ''
      res.on('data', data => {
        chunk += data
      })
      res.on('end', () => {
        tmp.updateData = Date.now()
        tmp[server] = chunk
        let now = new Date()
        renderCalendar(now.getFullYear(), now.getMonth() + 1, callback, JSON.parse(chunk), '_pcr')
      })
    }).on('error', (e) => {
      console.log('ERROR==============================================================================')
      console.error(e);
    })
  }
}

module.exports = {
  schedule
}