var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

let rouletteTimer
let rouletteObj = {
  gameStart: false,
  gameAction: false,
  gamers: {},
  gameActionCount: 0,
  gamersArr: [],
  callback:function(){},
  magazineArr: []
}
let death={};
let skip = {};
let plus = false;
let skiprate = {};
let namecache = {};
const {banUserInGroup} = require('../cq/cache');
module.exports = function(nickname, content, callback,qq,groupid){
  // console.log('=== in game ===')
  /* roulette system */
  if(content === '俄罗斯轮盘' || content === '俄羅斯輪盤'||content === '俄罗斯轮盘改' || content === '俄羅斯輪盤改'){
    if(content === '俄罗斯轮盘' || content === '俄羅斯輪盤'){
      plus = false;
    }else{
      plus = true;
    }
    if(!rouletteObj.gameStart){
      skip = {};
      skiprate = {};
      namecache = {};
      rouletteObj.gameStart = true
      rouletteObj.gamers = []
      rouletteTimer = setTimeout(() => {checkRouletteGammers()}, 60000)
      rouletteObj.callback=callback
      callback('生死有命，富贵在天！\n俄罗斯轮盘将在 60 秒后开始。\n参加：加入/参加/join\n退出：退出/quit/escape/逃跑\n开枪：开枪/开火/fire\n跳过：跳过/skip/pass\n击杀下一人：kill/作弊/犯规')
    }else{
      callback('请稍后再试');
      return;
    }
  }
  if(rouletteObj.gameStart && !rouletteObj.gameAction ){
    switch(content){
      case '加入':
      case '加入':
      case 'join':
      case '參加':
      case '参加':
        var can=true
         if(death[nickname]) {
           var now = new Date().getTime();
           var then = death[nickname];
           if (now < then) {
             can = false;
             callback(`【${nickname}】已经死亡,无法坐上赌桌,复活时间：【${new Date(then).toLocaleString()}】`)
             return;
           }
         }
        if(can){
          if (rouletteObj.gamers[nickname]) {
            rouletteObj.callback(`【${nickname}】已经坐上赌桌`)
          } else {
            namecache[nickname] = {qq:qq,gid:groupid};
            rouletteObj.callback(`【${nickname}】坐上了赌桌`)
            rouletteObj.gamers[nickname] = 1
            if (Object.keys(rouletteObj.gamers).length === 6) {
              clearTimeout(rouletteTimer)
              rouletteGameAction()
            }
          }
        }
        break;
      case '退出':
      case '退出':
      case 'quit':
      case 'escape':
      case '逃跑':
      case '逃跑':
        if (rouletteObj.gamers[nickname]){
          delete rouletteObj.gamers[nickname]
          rouletteObj.callback(`lowb【${nickname}】逃跑了`)
        } else {
          rouletteObj.callback(`lowb【${nickname}】没坐上赌桌还要凑个热闹`)
        }
        break;
    }
  }

  checkRouletteGammers = () => {
    if(Object.keys(rouletteObj.gamers).length < 2){
      rouletteObj.callback('参加人数不足')
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
      rouletteObj.callback('游戏结束')
    }, 500)
  }

  rouletteGameAction = () => {
    rouletteObj.gameAction = true
    for(let i = 0; i < 6; i++){
      rouletteObj.magazineArr.push(Math.random() < 0.5? 0: 1)
      rouletteObj.gamersArr = Object.keys(rouletteObj.gamers).sort(() => Math.random() < 0.5 ? -1: 1)
    }
    rouletteObj.callback(`赌局开始！\n弹匣为空，重新上膛`)
    checkAliveGamer()
  }

  if(rouletteObj.gameStart && rouletteObj.gameAction &&
    (content === '开枪' || content === '开火' || content === 'fire' || content === '開火' || content === '開槍'
    || content === '跳过' || content === 'skip' || content === 'pass'
    || content === 'kill' || content === '作弊' || content === '作弊' || content === '犯規' || content === '犯规')
    && rouletteObj.now === nickname){
    clearTimeout(rouletteTimer)
    switch(content){
      case '开枪' :
      case '开火' :
      case 'fire' :
      case '開火' :
      case '開槍' :
        fireAction()
        break
      case '跳过' :
      case 'skip' :
      case 'pass' :
        skipGamer()
        break
      case 'kill' :
      case '作弊' :
      case '作弊' :
      case '犯規' :
      case '犯规' :
        killOtherGamer()
        break
    }
    // if(content === '跳过' || content == 'skip' || content === 'pass'){
    // }
    // if(content === 'kill' || content === '作弊' || content === '作弊' || content === '犯規' || content === '犯规'){
    // }
  }

  killOtherGamer = () => {
    if(Math.random() < 0.5) {
      /* 准备动作成功 */
      if(rouletteObj.magazineArr[rouletteObj.gameActionCount]){
        /* 击杀下一个人成功 */
        saveDeath(rouletteObj.next, 1, function(ret) {
          banUser(rouletteObj.next);
          rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，砰的一声，【${rouletteObj.next}】倒在了血泊中。\n${ret}`)
          rouletteObj.gamersArr.shift()
          rouletteObj.gamersArr.push(rouletteObj.now)
        })
      } else {
        if(rouletteObj.gameActionCount < 5){
          /* 未到最后，可以反杀 */
          if(rouletteObj.magazineArr[rouletteObj.gameActionCount + 1]){
            /* 反杀成功 */
            saveDeath(rouletteObj.now, 1, function(ret) {
              banUser(rouletteObj.now);
              rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，可是并没发出子弹，【${rouletteObj.next}】抢过枪来对着【${rouletteObj.now}】就是一枪，砰的一声，【${rouletteObj.now}】吃到了应得的子弹。\n${ret}`)
              let next = rouletteObj.gamersArr.shift()
              rouletteObj.gamersArr.push(next)
              rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
            })
          } else {
            /* 反杀失败 */
            rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，可是并没发出子弹，【${rouletteObj.next}】抢过枪来对着【${rouletteObj.now}】就是一枪，也没有发出子弹，两人大眼瞪小眼，只听吃瓜群众说，tm你们还玩不玩了。`)
            let next = rouletteObj.gamersArr.shift()
            rouletteObj.gamersArr.push(rouletteObj.now)
            rouletteObj.gamersArr.push(next)
            rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
          }
        } else {
          /* 已到最后，反杀失败 */
          rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，可是并没发出子弹，【${rouletteObj.next}】抢过枪来想要对着【${rouletteObj.now}】开抢，可是枪里已经没有子弹了。`)
          rouletteObj.gamersArr.push(rouletteObj.now)
          rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
        }
      }
      rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      checkAliveGamer()
    } else {
      /* 准备动作失败 */
      if(Math.random() < 0.5){
        /* 下一个人掏出自己的枪 */
        banUser(rouletteObj.now);
        saveDeath(rouletteObj.now, 1, function(ret) {

          rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，可是手速没【${rouletteObj.next}】快，【${rouletteObj.next}】掏出自己的枪崩了【${rouletteObj.now}】说：破坏规则的人就是这个下场！\n${ret}`)
        })
      } else {
        /* 抢枪 */
        if(rouletteObj.magazineArr[rouletteObj.gameActionCount]){
          /* 反杀成功 */
          banUser(rouletteObj.now);
          saveDeath(rouletteObj.now, 1, function(ret) {

            rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，但是被【${rouletteObj.next}】抢了过来，【${rouletteObj.next}】对着【${rouletteObj.now}】就是一枪，砰的一声，【${rouletteObj.now}】倒在了血泊中。\n${ret}`)
            let next = rouletteObj.gamersArr.shift()
            rouletteObj.gamersArr.push(next)
          })
        } else {
          /* 反杀失败 */
          rouletteObj.callback(`【${rouletteObj.now}】把枪瞄向了【${rouletteObj.next}】，但是被【${rouletteObj.next}】抢了过来，【${rouletteObj.next}】对着【${rouletteObj.now}】就是一枪，但是没有发出子弹，只听吃瓜群众说，lowb运气真差都不能反杀。`)
          rouletteObj.gamersArr.push(rouletteObj.now)
        }
      }
      rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      checkAliveGamer()
    }
  }

  skipGamer = () => {
    if(skip[nickname]){
      rouletteObj.callback(`【${rouletteObj.now}】还想在逃避，被吃瓜群众摁回了赌桌上。`)
      fireAction()
    }else if(Math.random()>(skiprate[nickname]?skiprate[nickname]:0.5)){
      rouletteObj.callback(`【${rouletteObj.now}】想偷偷把枪传给下个人，不料被吃瓜群众怒瞪了回去，只好生无可恋的扣动扳机`)
      fireAction()
    }else{
      skip[nickname]=1;
      rouletteObj.callback(`【${rouletteObj.now}】机智的把枪传递给下个人`);
      rouletteObj.gamersArr.push(rouletteObj.now)
      //rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      checkAliveGamer()
    }
  }

  fireAction = () => {
    if(rouletteObj.magazineArr[rouletteObj.gameActionCount]){
      rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      killGamer(2)
    } else {
      if(skiprate[nickname]){
        skiprate[nickname] = 1;
      }else{
        skiprate[nickname] = 0.85;
      }
      rouletteObj.callback(`【${rouletteObj.now}】${['毫不犹豫', '生无可恋', '毫无茫然'][~~(3 * Math.random())]}地把扣动扳机，然而什么都没有发生。`)
      rouletteObj.gamersArr.push(rouletteObj.now)
      rouletteObj.gameActionCount = rouletteObj.gameActionCount + 1
      checkAliveGamer()
    }
  }

  getNextGamer = () => {
    rouletteObj.now = rouletteObj.gamersArr.shift()
    rouletteObj.next = rouletteObj.gamersArr[0]
    rouletteObj.callback(`下一个【${rouletteObj.now}】`)
    rouletteTimer = setTimeout(() => {killGamer(1)}, 15000)
  }

  killGamer = type => {
    saveDeath(rouletteObj.now,1,function(ret) {
      switch (type) {
        case 1:
          banUser(rouletteObj.now);
          death[rouletteObj.now] = new Date(new Date().getTime() + 1000000).getTime();
          rouletteObj.callback(`【${rouletteObj.now}】犹豫不决，吃瓜群众一枪崩了他的狗命。\n${ret}`)
          break
        case 2:
          banUser(rouletteObj.now);
          death[rouletteObj.now] = new Date(new Date().getTime() + 1000000).getTime();
          switch (Math.ceil(3 * Math.random())) {
            case 1:
              rouletteObj.callback(`砰！一声枪声响起，【${rouletteObj.now}】倒在了赌桌上。\n${ret}`)
              break
            case 2:
              rouletteObj.callback(`砰！一声枪声响起，【${rouletteObj.now}】倒在了吃瓜群众的怀中。\n${ret}`)
              break
            case 3:
              rouletteObj.callback(`砰的一声，【${rouletteObj.now}】倒在了血泊中。\n${ret}`)
              break
          }
          break
      }
      checkAliveGamer();
    });
  }

  checkAliveGamer = () => {
    setTimeout(() => {
      if(rouletteObj.gamersArr.length > 1 && rouletteObj.gameActionCount < 6){
        getNextGamer()
      } else {
        rouletteObj.gamersArr.forEach(function(name){
          saveDeath(name,0,function(ret){

          });
        });
        rouletteObj.callback(`赌局结束！幸存者：【${rouletteObj.gamersArr.join('】、【')}】,枪内子弹(${rouletteObj.magazineArr.reduce((p, c) => p + c)}/6)`)
        rouletteGameOver()
      }
    }, 500)
  }
}


function banUser(userName){
  var qq = namecache[userName].qq;
  var group = namecache[userName].gid;
  var time=Math.floor(Math.random()*3600);
  banUserInGroup(qq,group,time);
  setTimeout(function(){
    banUserInGroup(qq,group,0);
  },time+1000);
}

function saveDeath(userName,IsDeath,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var query = {'_id':userName};
    var cl_roulette_game = db.collection('cl_roulette_game');
    cl_roulette_game.findOne(query, function(err, data) {
      if(data){
        data.d=data.d+1;
        data.death=data.death+IsDeath;
      }else{
        data = {'_id':userName,d:1,death:IsDeath}
      }
      cl_roulette_game.save(data);
      callback(data.death+"/"+data.d);
    });
  });
}

