const MAP_MAX_WIDTH = 5 // 最大13
const MAP_MAX_HEIGHT = 5
const MAX_USER = 4
const MIN_USER = 2
const WAIT_GAME_START = 60000
const WAIT_USER_ACTION = 20000
const NEXT_LEG_ACTION = 3000
const POWER = [100, 100, 80, 60, 40, 20, 20, 20, 0, 0, 0, 0, 0]
const WAIT_RECOVERED = 20
const WAIT_LIMIT = 3
const MOVE_RECOVERED = 10
const MOVE_LIMIT = 3
const MAX_CHANGE_ACTION = 1
let BmAdminObj = {}

module.exports = function(content, qq, nickname, groupid, callback){

  init = () => {
    callback(
      '爆炸人将在 ' + WAIT_GAME_START/1000 + ' 秒后开始。\n' +
      '参加：参加游戏\n' +
      '游戏中指令：\n' +
      '放置：放置炸弹并随机斜方向移动一格\n' +
      '移动：随机向周围8个方向移动一格，回复' + MOVE_RECOVERED + '血量，最多执行'+ MOVE_LIMIT +'次\n' +
      '待机：什么都不做，回复' + WAIT_RECOVERED + '血量，最多执行'+ WAIT_LIMIT +'次\n' +
      '每回合可更改' + MAX_CHANGE_ACTION + '次指令')
    BmAdminObj[groupid] = {
      gameStart: false,
      gameAction: false,
      gamerActionList: [],
      bombs: [],
      gamers: {},
      timer: 0,
      leg: 0
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
    //TODO: 测试极限状况
    // Object.keys(BmAdminObj[groupid].gamers).forEach((gamer, index) => {
    //   switch(index){
    //     case 0:
    //       BmAdminObj[groupid].gamers[gamer].pos.x = 0
    //       BmAdminObj[groupid].gamers[gamer].pos.y = 0
    //       break
    //     case 1:
    //       BmAdminObj[groupid].gamers[gamer].pos.x = 1
    //       BmAdminObj[groupid].gamers[gamer].pos.y = 0
    //       break
    //     case 2:
    //       BmAdminObj[groupid].gamers[gamer].pos.x = 0
    //       BmAdminObj[groupid].gamers[gamer].pos.y = 1
    //       break
    //     case 3:
    //       BmAdminObj[groupid].gamers[gamer].pos.x = 1
    //       BmAdminObj[groupid].gamers[gamer].pos.y = 1
    //       break
    //   }
    // })
    let userInfo = []
    Object.keys(BmAdminObj[groupid].gamers).forEach(gamer => {
      userInfo.push(`玩家${BmAdminObj[groupid].gamers[gamer].index}: ${atMsg(gamer)}`)
    })
    callback(`游戏开始`)
    setTimeout(() => {
      nextLeg()
    }, 1000)
  }

  nextLeg = () => {
    BmAdminObj[groupid].gameAction = true
    BmAdminObj[groupid].leg ++
    BmAdminObj[groupid].bombs = []
    callback(`第${BmAdminObj[groupid].leg}回合, 请在${WAIT_USER_ACTION/1000}秒内决定行动\n当前地图\n${renderMap()}\n${renderGamer()}`)
    setTimeout(() => {
      totalLeg()
    }, WAIT_USER_ACTION)
  }

  totalLeg = () => {
    BmAdminObj[groupid].gameAction = false
    // 决定行动顺序
    BmAdminObj[groupid].gamerActionList.sort(() => Math.random() - 0.5)
    let actionMsg = []
    // 行动
    BmAdminObj[groupid].gamerActionList.forEach(gamer => {
      if(BmAdminObj[groupid].gamers[gamer].hp > 0){
        // 恢复重置点
        BmAdminObj[groupid].gamers[gamer].change = MAX_CHANGE_ACTION
        let moveSet, x, y
        switch(BmAdminObj[groupid].gamers[gamer].nextAction){
          case 0:
            BmAdminObj[groupid].bombs.push({
              x: BmAdminObj[groupid].gamers[gamer].pos.x,
              y: BmAdminObj[groupid].gamers[gamer].pos.y
            })
            actionMsg.push(`玩家${BmAdminObj[groupid].gamers[gamer].index}${atMsg(gamer)}把炸弹吃下了肚子`)
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
            [x, y] = checkPoint(BmAdminObj[groupid].gamers[gamer].pos.x, BmAdminObj[groupid].gamers[gamer].pos.y, moveSet)
            BmAdminObj[groupid].gamers[gamer].pos.x = x
            BmAdminObj[groupid].gamers[gamer].pos.y = y
            BmAdminObj[groupid].gamers[gamer].bomb --
            actionMsg.push(`玩家${BmAdminObj[groupid].gamers[gamer].index}${atMsg(gamer)}在自己的位置丢了颗炸弹瞬间跑开了`)
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
            [x, y] = checkPoint(BmAdminObj[groupid].gamers[gamer].pos.x, BmAdminObj[groupid].gamers[gamer].pos.y, moveSet)
            BmAdminObj[groupid].gamers[gamer].pos.x = x
            BmAdminObj[groupid].gamers[gamer].pos.y = y
            BmAdminObj[groupid].gamers[gamer].hp =
              (BmAdminObj[groupid].gamers[gamer].hp + MOVE_RECOVERED) > BmAdminObj[groupid].gamers[gamer].maxHp?
                BmAdminObj[groupid].gamers[gamer].maxHp :
                (BmAdminObj[groupid].gamers[gamer].hp + MOVE_RECOVERED)
            BmAdminObj[groupid].gamers[gamer].moveCount --
            actionMsg.push(`玩家${BmAdminObj[groupid].gamers[gamer].index}${atMsg(gamer)}吃着西瓜路过,并回复了${MOVE_RECOVERED}点体力（${ BmAdminObj[groupid].gamers[gamer].hp}）`)
            break
          case 3:
            BmAdminObj[groupid].gamers[gamer].hp =
              (BmAdminObj[groupid].gamers[gamer].hp + WAIT_RECOVERED) > BmAdminObj[groupid].gamers[gamer].maxHp?
                BmAdminObj[groupid].gamers[gamer].maxHp :
                (BmAdminObj[groupid].gamers[gamer].hp + WAIT_RECOVERED)
            BmAdminObj[groupid].gamers[gamer].waitCount --
            actionMsg.push(`玩家${BmAdminObj[groupid].gamers[gamer].index}${atMsg(gamer)}并不知道发生了什么,但回复了${WAIT_RECOVERED}点体力（${ BmAdminObj[groupid].gamers[gamer].hp}）`)
        }
      }
    })
    callback(`${actionMsg.join('\n')}\n当前地图\n${renderMap()}`)
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
          msg.push(`玩家${BmAdminObj[groupid].gamers[gamer].index}${atMsg(gamer)}受到了${damage}点伤害（${BmAdminObj[groupid].gamers[gamer].hp - damage}）`)
          BmAdminObj[groupid].gamers[gamer].hp -= damage
        }
      }
    })
    setTimeout(() => {
      callback(msg.length ? msg.join('\n'): '没有发生任何事')
      checkUser()
    }, 1000)
  }

  checkUser = () => {
    let userCount = 0, aliveGamer = []
    BmAdminObj[groupid].gamerActionList.forEach(gamer => {
      BmAdminObj[groupid].gamers[gamer].nextAction = 0
      if(BmAdminObj[groupid].gamers[gamer].hp > 0){
        userCount ++
        aliveGamer.push(gamer)
      }
    })
    setTimeout(() => {
      if(userCount <= 1){
        gameOver(aliveGamer)
      } else {
        nextLeg()
      }
    }, NEXT_LEG_ACTION)
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
        if(Array.from(point[2]).length == 0){
          return([point[0], point[1]])
        }
        let aset = Array.from(point[2]),
          getRdmMove = aset[~~(Math.random() * aset.length)]
        let [mx, my] = userMove(point[0], point[1], getRdmMove), mf = true
        Object.values(BmAdminObj[groupid].gamers).forEach(gamer => {
          if(gamer.pos.x == mx && gamer.pos.y == my){
            mf = false
          }
        })
        if(mf){
          return [mx, my]
        } else {
          let tmpSet = new Set(point[2])
          tmpSet.delete(getRdmMove)
          return checkPoint(point[0], point[1], tmpSet)
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
    BmAdminObj[groupid].bombs.forEach(bomb => {
      map[bomb.y][bomb.x] = 'X'
    })
    return map.map(x => x.join(' ')).join('\n')
  }

  renderGamer = () => {
    let gamerMsg = []
    Object.values(BmAdminObj[groupid].gamers).forEach(gamer => {
      gamerMsg.push(`玩家${gamer.index}: ${atMsg(gamer.gamer)}(${gamer.hp > 0 ? gamer.hp : '死亡'})`)
    })
    return gamerMsg.join('\n')
  }

  userJoin = () => {
    if(!BmAdminObj[groupid].gamers[qq]) {
      let [x, y] = checkPoint()
      BmAdminObj[groupid].gamers[qq] = {
        pos: {
          x: x,
          y: y
        },
        maxHp: 100,
        hp: 100,
        change: MAX_CHANGE_ACTION,
        bomb: 1000,
        nextAction: 0,
        gamer: qq,
        nickname: nickname,
        damageCount: 0,
        moveCount: MOVE_LIMIT,
        waitCount: WAIT_LIMIT
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

  gameOver = aliveGamer => {
    destory(aliveGamer.length ? `${aliveGamer.map(gamer => atMsg(gamer)).join('、')}活了下来\n` : '没有人活下来\n')
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
    case '参加':
      if(BmAdminObj[groupid] && !BmAdminObj[groupid].gameStart){
        userJoin()
      }
      break
    case '放置':
      if(BmAdminObj[groupid] && BmAdminObj[groupid].gameStart && BmAdminObj[groupid].gameAction && BmAdminObj[groupid].gamers[qq] && BmAdminObj[groupid].gamers[qq].hp > 0){
        if(BmAdminObj[groupid].gamers[qq].nextAction != 1){
          if(BmAdminObj[groupid].gamers[qq].change >= 0) {
            if(BmAdminObj[groupid].gamers[qq].bomb > 0){
              BmAdminObj[groupid].gamers[qq].change --
              BmAdminObj[groupid].gamers[qq].nextAction = 1
              callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}选择了放置`)
            } else {
              callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}已经没有炸弹`)
            }
          } else {
            callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}已不能命令`)
          }
        }
      }
      break
    case '移动':
      if(BmAdminObj[groupid] && BmAdminObj[groupid].gameStart && BmAdminObj[groupid].gameAction && BmAdminObj[groupid].gamers[qq] && BmAdminObj[groupid].gamers[qq].hp > 0){
        if(BmAdminObj[groupid].gamers[qq].nextAction != 2){
          if(BmAdminObj[groupid].gamers[qq].change >= 0) {
            if(BmAdminObj[groupid].gamers[qq].moveCount > 0) {
              BmAdminObj[groupid].gamers[qq].change --
              BmAdminObj[groupid].gamers[qq].nextAction = 2
              callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}选择了移动`)
            } else {
              callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}已不能直接移动`)
            }
          } else {
            callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}已不能命令`)
          }
        }
      }
      break
    case '待机':
      if(BmAdminObj[groupid] && BmAdminObj[groupid].gameStart && BmAdminObj[groupid].gameAction && BmAdminObj[groupid].gamers[qq] && BmAdminObj[groupid].gamers[qq].hp > 0){
        if(BmAdminObj[groupid].gamers[qq].nextAction != 3){
          if(BmAdminObj[groupid].gamers[qq].change >= 0) {
            if(BmAdminObj[groupid].gamers[qq].moveCount > 0) {
              BmAdminObj[groupid].gamers[qq].change --
              BmAdminObj[groupid].gamers[qq].nextAction = 3
              callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}选择了待机`)
            } else {
              callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}已不能待机`)
            }
          } else {
            callback(`玩家${BmAdminObj[groupid].gamers[qq].index}${atMsg(qq)}已不能命令`)
          }
        }
      }
      break
  }
}