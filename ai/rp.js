const md5 = require("md5")
module.exports = function(qq, callback){
  let str = `${qq}${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`
  let md = md5(str)
  let rp = parseInt(md.substring(0, 15), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  let rpFixType = parseInt(md.substring(15, 16), 16) % 3
  let rpFix = parseInt(md.substring(16, 20), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  switch (rpFixType){
    case 0:
      rp += rpFix
      break
    case 1:
      rp -= rpFix
      break
  }
  if(rp < 0){
    rp = Math.abs(rp)
  }
  if(rp > 100){
    if(rp > 105){
      rp = 100 - (rp - 105)
    }
    else {
      rp = 100
    }
  }
  // callback(rp)
  callback(`[CQ:at,qq=${qq}] 今天的运势指数是 ${rp}% ！\n${new Array(rp).fill('|').join('')}`)
}