const http = require('http')

module.exports = function(content, callback){
  /* default search */
  let searchList = ["s_sh000001", "s_sz399001", "s_sz399300", "int_hangseng", "int_dji", "int_nasdaq", "int_sp500", "int_nikkei" ]
  if(content){
    searchList = content.split(',')
  }
  /* init */
  let searchOptions = []
  searchList.forEach(str => {
    let opt = {}
    opt.key = str
    opt.isDownRed = str.split('_')[0] === 'int'
    searchOptions.push(opt)
  })
  /* get api */
  http.get('http://weather.erinn.biz/smuggler.php', res => {
    res.setEncoding('utf8')
    let rawData = ''
    res.on('data', chunk => {
      rawData += chunk
    });
    res.on('end', () => {

    })
    res.on('error', e => {
      console.log(e.message)
    })
  })


}