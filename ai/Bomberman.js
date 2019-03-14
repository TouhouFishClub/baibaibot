const MAP_MAX_WIDTH = 5 // 最大13
const MAP_MAX_HEIGHT = 5
const MAX_USER = 4
const MIN_USER = 2
const WAIT_GAME_START = 6000
const WAIT_USER_ACTION = 2000
const POWER = [100, 100, 80, 60, 40, 20]
const MAX_CHANGE_ACTION = 1
let BmAdminObj = {}

module.exports = function(content, qq, nickname, groupid, callback){

  init = () => {
    callback('爆炸人将在 60 秒后开始。\n加入：参加游戏\n游戏中指令：\n放置：放置炸弹并随机斜方向移动一格\n待机：什么都不做\n移动：随机向周围8个方向移动一格\n每回合可更改' + MAX_CHANGE_ACTION + '次指令')
    BmAdminObj[groupid] = {
      gameStart: false,
      gameAction: false,
      gamerActionList: [],
      bombs: [],
      gamers: {},
      timer: 0
    }
    BmAdminObj[groupid].timer = setTimeout(() => {
      if(Object.keys(BmAdminObj[groupid].gamers).length < MIN_USER){
        destory('参加人数不足, ')
      } else {
        gameStart()
      }
    }, WAIT_GAME_START)
  }

  gameStart = () => {
    Object.keys(BmAdminObj[groupid].gamers).forEach((gamer, index) => {
      BmAdminObj[groupid].gamers[gamer] = (Object.assign({index: index + 1}, BmAdminObj[groupid].gamers[gamer]))
    })
    BmAdminObj[groupid].gamerActionList = Object.keys(BmAdminObj[groupid].gamers)
    BmAdminObj[groupid].gameStart = true
    callback(`游戏开始, 当前的地图为: \n${renderMap()}`)
    nextLeg()
  }

  nextLeg = () => {
    BmAdminObj[groupid].gameAction = true
    setTimeout(() => {
      totalLeg()
    }, WAIT_USER_ACTION)
  }

  totalLeg = () => {
    BmAdminObj[groupid].gameAction = false
    // 决定行动顺序
    BmAdminObj[groupid].gamerActionList.sort(() => Math.random() - 0.5)
    // 行动
    BmAdminObj[groupid].gamerActionList.forEach(gamer => {
      // 恢复重置点
      BmAdminObj[groupid].gamers[gamer].change = MAX_CHANGE_ACTION
      let moveSet, x, y
      switch(BmAdminObj[groupid].gamers[gamer].nextAction){
        case 0:
          BmAdminObj[groupid].bombs.push({
            x: BmAdminObj[groupid].gamers[gamer].pos.x,
            y: BmAdminObj[groupid].gamers[gamer].pos.y
          })
          break
        case 1:
          BmAdminObj[groupid].bombs.push({
            x: BmAdminObj[groupid].gamers[gamer].pos.x,
            y: BmAdminObj[groupid].gamers[gamer].pos.y
          })
          // 排除不能移动的位置（人除外）
          moveSet = new Set([1, 7, 3, 9])
          if(BmAdminObj[groupid].gamers[gamer].pos.x == 0){
            moveSet.delete(1)
            moveSet.delete(7)
          }
          if(BmAdminObj[groupid].gamers[gamer].pos.x == MAP_MAX_WIDTH - 1){
            moveSet.delete(3)
            moveSet.delete(9)
          }
          if(BmAdminObj[groupid].gamers[gamer].pos.y == 0){
            moveSet.delete(9)
            moveSet.delete(7)
          }
          if(BmAdminObj[groupid].gamers[gamer].pos.y == MAP_MAX_HEIGHT - 1){
            moveSet.delete(1)
            moveSet.delete(3)
          }
          [x, y] = checkPoint(BmAdminObj[groupid].gamers[gamer].pos.x, BmAdminObj[groupid].gamers[gamer].pos.y, Array.from(moveSet))
          BmAdminObj[groupid].gamers[gamer].pos.x = x
          BmAdminObj[groupid].gamers[gamer].pos.y = y
          break
        case 2:
          // 排除不能移动的位置（人除外）
          moveSet = new Set([1, 2, 3, 4, 6, 7, 8, 9])
          if(BmAdminObj[groupid].gamers[gamer].pos.x == 0){
            moveSet.delete(1)
            moveSet.delete(4)
            moveSet.delete(7)
          }
          if(BmAdminObj[groupid].gamers[gamer].pos.x == MAP_MAX_WIDTH - 1){
            moveSet.delete(3)
            moveSet.delete(6)
            moveSet.delete(9)
          }
          if(BmAdminObj[groupid].gamers[gamer].pos.y == 0){
            moveSet.delete(9)
            moveSet.delete(8)
            moveSet.delete(7)
          }
          if(BmAdminObj[groupid].gamers[gamer].pos.y == MAP_MAX_HEIGHT - 1){
            moveSet.delete(1)
            moveSet.delete(2)
            moveSet.delete(3)
          }
          [x, y] = checkPoint(BmAdminObj[groupid].gamers[gamer].pos.x, BmAdminObj[groupid].gamers[gamer].pos.y, Array.from(moveSet))
          BmAdminObj[groupid].gamers[gamer].pos.x = x
          BmAdminObj[groupid].gamers[gamer].pos.y = y
          break
      }
    })
    bombAction()
  }

  bombAction = () => {
    let map = new Array(MAP_MAX_HEIGHT).fill(0).map(() => new Array(MAP_MAX_WIDTH).fill(0))
    BmAdminObj[groupid].bombs.forEach(bomb => {
      map[bomb.y][bomb.x] = map[bomb.y][bomb.x] + POWER[0]
      for(let i = 1; i < MAP_MAX_HEIGHT; i ++){
        if(bomb.y + i < MAP_MAX_HEIGHT) {
          map[bomb.y + i][bomb.x] += POWER[i]
        }
        if(bomb.y - i >= 0) {
          map[bomb.y - i][bomb.x] += POWER[i]
        }
      }
      for(let i = 1; i < MAP_MAX_WIDTH; i ++){
        if(bomb.x + i < MAP_MAX_WIDTH) {
          map[bomb.y][bomb.x + i] += POWER[i]
        }
        if(bomb.x - i >= 0) {
          map[bomb.y][bomb.x - i] += POWER[i]
        }
      }
    })
    // console.log(map.map(x => x.join(' ')).join('\n'))
    // 制裁
    let msg = []
    BmAdminObj[groupid].gamerActionList.forEach(gamer => {
      if(BmAdminObj[groupid].gamers[gamer].hp > 0){
        let damage = map[BmAdminObj[groupid].gamers[gamer].pos.y][BmAdminObj[groupid].gamers[gamer].pos.x]
        if(damage > 0) {
          msg.push(`${atMsg(gamer)}受到了${damage}点伤害`)
          BmAdminObj[groupid].gamers[gamer].hp -= damage
        }
      }
    })
    callback(msg.join('\n'))

  }

  checkPoint = (...point) => {
    switch(point.length){
      case 0:
        let ty = ~~(Math.random() * MAP_MAX_HEIGHT), tx = ~~(Math.random() * MAP_MAX_WIDTH), tf = true
        Object.values(BmAdminObj[groupid].gamers).forEach(gamer => {
          if(gamer.pos.x == tx && gamer.pos.y == ty){
            tf = false
          }
        })
        if(tf){
          return [tx, ty]
        } else {
          return checkPoint()
        }
      case 3:
        let [mx, my] = userMove(point[0], point[1], point[2][~~(Math.random() * point[2].length)]), mf = true
        Object.values(BmAdminObj[groupid].gamers).forEach(gamer => {
          if(gamer.pos.x == mx && gamer.pos.y == my){
            mf = false
          }
        })
        if(mf){
          return [mx, my]
        } else {
          return checkPoint(...point)
        }
    }
  }

  renderMap = () => {
    let map = new Array(MAP_MAX_HEIGHT).fill(0).map(() => new Array(MAP_MAX_WIDTH).fill(0))
    Object.values(BmAdminObj[groupid].gamers).forEach(gamer => {
      if(gamer.hp > 0){
        map[gamer.pos.y][gamer.pos.x] = gamer.index
      }
    })
    return map.map(x => x.join(' ')).join('\n')
  }

  userJoin = () => {
    if(!BmAdminObj[groupid].gamers[qq]) {
      let [x, y] = checkPoint()
      BmAdminObj[groupid].gamers[qq] = {
        pos: {
          x: x,
          y: y
        },
        hp: 100,
        change: MAX_CHANGE_ACTION,
        bomb: 1000,
        nextAction: 0,
        gamer: qq,
        nickname: nickname,
        damageCount: 0
      }
      callback(`${atMsg(qq)}加入了游戏`)
    } else {
      callback(`${atMsg(qq)}已在游戏中`)
    }
    if(Object.keys(BmAdminObj[groupid].gamers).length == MAX_USER){
      clearTimeout(BmAdminObj[groupid].timer)
      gameStart()
    }
  }

  userMove = (x, y, moveType) => {
    switch(moveType){
      case 1:
        return [x - 1, y + 1]
      case 2:
        return [x, y + 1]
      case 3:
        return [x + 1, y + 1]
      case 4:
        return [x - 1, y]
      case 6:
        return [x + 1, y]
      case 7:
        return [x - 1, y - 1]
      case 8:
        return [x, y - 1]
      case 9:
        return [x + 1, y - 1]
    }

  }

  atMsg = qqNum => {
    return `[CQ:at,qq=${qqNum}]`
  }

  gameOver = () => {

  }

  destory = otherMsg => {
    callback(`${otherMsg}游戏结束`)
    delete(BmAdminObj[groupid])
  }

  switch(content){
    case '炸弹人':
    case '炸彈人':
      if(BmAdminObj[groupid]){
        callback('正在游戏中')
      } else {
        init()
      }
      break
    case '加入':
      if(BmAdminObj[groupid] && !BmAdminObj[groupid].gameStart){
        userJoin()
      }
      break
    case '放置':
      if(BmAdminObj[groupid] && BmAdminObj[groupid].gameStart && BmAdminObj[groupid].gamers[qq].change > 0){
        BmAdminObj[groupid].gamers[qq].change --
        BmAdminObj[groupid].gamers[qq].nextAction = 1
      }
      break
    case '移动':
      if(BmAdminObj[groupid] && BmAdminObj[groupid].gameStart && BmAdminObj[groupid].gamers[qq].change > 0){
        BmAdminObj[groupid].gamers[qq].change --
        BmAdminObj[groupid].gamers[qq].nextAction = 2
      }
      break
    case '待机':
      if(BmAdminObj[groupid] && BmAdminObj[groupid].gameStart && BmAdminObj[groupid].gamers[qq].change > 0){
        BmAdminObj[groupid].gamers[qq].change --
        BmAdminObj[groupid].gamers[qq].nextAction = 3
      }
      break
  }
}