let rouletteTimer
let rouletteObj = {
  gameStart: false,
  gameAction: false,
  gamers: {},
  gameActionCount: 0,
  gamersArr: [],
  magazineArr: []
}
const {banUserbyName} = require('./banuser');
module.exports = function(nickname, content, callback, nickname2){
  // console.log('=== in game ===')
  /* roulette system */
  if(content === '俄罗斯轮盘' || content === '俄羅斯輪盤'){
    if(!rouletteObj.gameStart){
      rouletteObj.gameStart = true
      rouletteObj.gamers = []
      rouletteTimer = setTimeout(() => {checkRouletteGammers()}, 60000)
      callback('生死有命，富贵在天！\n俄罗斯轮盘将在 60 秒后开始。\n参加：加入/参加/join\n开枪：开枪/开火/fire')
    }
  }
  if(rouletteObj.gameStart && !rouletteObj.gameAction &&
    (content === '加入' || content === '加入' || content === 'join' || content === '參加' || content === '参加')
  ){
    if(rouletteObj.gamers[nickname]){
      callback(`【${nickname}】已经坐上赌桌`)
    } else {
      callback(`【${nickname}】坐上了赌桌`)
      rouletteObj.gamers[nickname] = 1
      if(Object.keys(rouletteObj.gamers).length === 6){
        clearTimeout(rouletteTimer)
        rouletteGameAction()
      }
    }
  }

  checkRouletteGammers = () => {
    if(Object.keys(rouletteObj.gamers).length < 2){
      callback('参加人数不足')
      rouletteGameOver()
    } else {
      rouletteGameAction()
    }
  }

  rouletteGameOver = () => {
    rouletteObj.gameStart = false
    rouletteObj.gameAction = false
    rouletteObj.gamers = {}
    rouletteObj.gameActionCount = 0
    rouletteObj.gamersArr = []
    rouletteObj.magazineArr = []
    setTimeout(() => {
      callback('游戏结束')
    }, 500)
  }

  rouletteGameAction = () => {
    rouletteObj.gameAction = true
    for(let i = 0; i < 6; i++){
      rouletteObj.magazineArr.push(Math.random() < 0.5? 0: 1)
      rouletteObj.gamersArr = Object.keys(rouletteObj.gamers).sort(() => Math.random() < 0.5 ? -1: 1)
    }
    callback(`赌局开始！\n弹匣为空，重新上膛(${rouletteObj.magazineArr.reduce((p, c) => p + c)}/6)`)
    checkAliveGamer()
  }

  if(rouletteObj.gameStart && rouletteObj.gameAction &&
    (content === '开枪' || content === '开火' || content === 'fire' || content === '開火' || content === '開槍' )
    && rouletteObj.now === nickname){
    clearTimeout(rouletteTimer)
    if(rouletteObj.magazineArr[rouletteObj.gameActionCount]){
      rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      killGamer(2)
    } else {
      callback(`【${rouletteObj.now}】生无可恋地把扣动扳机，然而什么都没有发生。`)
      rouletteObj.gamersArr.push(rouletteObj.now)
      rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      checkAliveGamer()
    }
  }

  getNextGamer = () => {
    rouletteObj.now = rouletteObj.gamersArr.shift()
    callback(`下一个【${rouletteObj.now}】`)
    rouletteTimer = setTimeout(() => {killGamer(1)}, 15000)
  }

  killGamer = type => {
    switch(type){
      case 1:
        banUserbyName(rouletteObj.now,300);
        callback(`【${rouletteObj.now}】犹豫不决，吃瓜群众一枪崩了他的狗命。`)
        break
      case 2:
        banUserbyName(rouletteObj.now,300);
        callback(`砰！一声枪声响起，【${rouletteObj.now}】倒在了赌桌上。`)
        break
    }
    checkAliveGamer()
  }

  checkAliveGamer = () => {
    setTimeout(() => {
      if(rouletteObj.gamersArr.length > 1 && rouletteObj.gameActionCount < 6){
        getNextGamer()
      } else {
        callback(`赌局结束！幸存者：【${rouletteObj.gamersArr.join('、')}】`)
        rouletteGameOver()
      }
    }, 500)
  }

}