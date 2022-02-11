const ergo = (qq, content, callback) => {
  let sp = content.split('突破')
  let level = sp[0].substr(2), tryCount = sp[1].substr(0, sp[1].length - 1), rare = 1, flag = false
  if(tryCount > 2000){
    callback('你没那么多材料.jpg')
    return
  }
  switch (level){
    case '5':
      rare = .9
      break
    case '10':
      rare = .6
      break
    case '15':
      rare = .3
      break
    case '20':
      rare = .15
      break
    case '25':
      rare = .05
      break
    case '30':
      rare = .02
      break
    case '35':
      rare = .01
      break
    case '40':
      rare = .007
      break
    case '45':
      rare = .003
      break
    default:
      callback(`${level}不是突破等级`)
      return
  }
  for(let i = 0; i < tryCount; i ++) {
    if(Math.random() < rare) {
      flag = true
      callback(`[CQ:at,qq=${qq}] 你第${i + 1}手突破${level}级`)
      break
    }
  }
  if(!flag) {
    callback(`[CQ:at,qq=${qq}] 你尔格${level}突破${tryCount}手没成功${tryCount >= 300 ? '，真非' : ''}`)
  }
}

module.exports = {
  ergo
}
