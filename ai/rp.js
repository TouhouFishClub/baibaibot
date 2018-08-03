const md5 = require("md5")
module.exports = function(qq, callback){
  let str = `${qq}${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`
  let rp = parseInt(md5(str).substring(0, 15), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  if(rp > 100)
    rp = 100
  callback(`[CQ:at,qq=${qq}] 今天的运势指数是 ${rp}% ！\n${new Array(rp).fill('|').join('')}`)
}