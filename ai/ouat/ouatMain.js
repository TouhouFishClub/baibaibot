var storyCards = "abcdefghijklmn".split('');
var mainCards = shuffle(storyCards);
var signup = [];
var playerList = [];
var gamestart = false;
var mutex = {};
var active = ""
var nowstep = 0;
var st6cnt = {};
var st8vote = {};
var elect = "";
var electcard = "";
function start(playerList){

}

function init(){
  mainCards = shuffle(storyCards);
  signup = [];
  playerList = [];
  gamestart = false;
  mutex = {};
  active = "";
  nowstep = 0;
  st6cnt = 0;
  elect = "";
  electcard = "";
}

function actionGroup(content,userUin,groupId,groupMemberList,qq){
  if(content==""){
    var res = "o1:重新开始游戏\no2:报名参加当前场次游戏\no3:报名结束，游戏开始\n私聊输入h可查看自己的手牌\n"
    qq.sendGroupMsg(groupId," "+res);
  }
  var first = content.substring(0,1);
  if(first == 1){
    init();
    var res = "已重新开始游戏";
    qq.sendGroupMsg(groupId," "+res);
  }else if(first==2){
    if(!gamestart){
      for(let i=0;i<groupMemberList.length;i++){
        if(userUin==groupMemberList[i].uin){
          var user = groupMemberList[i];
          console.log(mutex,userUin);
          if(mutex[userUin]){
            res = user.nick+'已经报名了，当前报名人数为'+playerList.length+'人';
            qq.sendGroupMsg(groupId," "+res);
          }else{
            playerList.push(user);
            mutex[userUin]=1;
            res = user.nick+'报名参加了游戏，当前报名人数为'+playerList.length+'人';
            qq.sendGroupMsg(groupId," "+res);
          }
          break;
        }
      }
    }else{
      res = '游戏已开始，请等待下一场游戏';
      qq.sendGroupMsg(groupId," "+res);
    }
  }else if(first==3){
    var res = "游戏开始";
    gamestart=true;
    qq.sendGroupMsg(groupId," "+res);
    shuffleCards(qq,groupId);
  }else if(first==4){
    var res = "当前报名人数为"+playerList.length+"人\n";
    for(var i=0;i<playerList.length;i++){
      res = res + playerList[i].nick+":\n";
      res = res + playerList[i].hand+"\n";
    }
    qq.sendGroupMsg(groupId," "+res.trim());
  }else if(first==5){
    if(nowstep==5){
      var x = content.indexOf('&');
      if(x>0){
        var card = content.substring(1,x);
        var story = content.substring(x+1);
        handleStory(qq,userUin,groupId,card,story)
      }
    }else{
      var res = "当前不在讲故事阶段\n";
      qq.sendGroupMsg(groupId," "+res);
    }
  }else if(first==6){
    if(nowstep==6){
      var card = content.substring(1);
      handleInterrupt(qq,userUin,groupId,card);
    }else{
      var res = "当前不在打断阶段";
      qq.sendGroupMsg(groupId," "+res);
    }
  }else if(first==7){
    if(nowstep==6) {
      user =  getUserByUin(userUin);

      if(user){
        var res = user.nick + "不打断\n";
        st6cnt[userUin] = 1;
        if (Object.keys(st6cnt).length == playerList.length) {
          res = res + "所有人均不打断，演员继续讲故事";
          nowstep=5;
        }
        qq.sendGroupMsg(groupId, " " + res);
      }
    }else{
      var res = "当前不在打断阶段";
      qq.sendGroupMsg(groupId," "+res);
    }
  }else if(first ==8){
    if(nowstep==8){
      user =  getUserByUin(userUin);
      if(user){
        var next = content.substring(1,2);
        var votestr = "";
        if(next==1){
          votestr = "赞成";
        }else if(next==2){
          votestr = "反对";
        }else if(next==3){
          votestr = "弃权";
        }else{
          qq.sendGroupMsg(groupId," "+"指令错误，请重新投票");
          return;
        }
        st8vote[user.nick]=votestr;
        var res = user.nick + "投" + votestr + "票\n"
        if(Object.keys(st8vote).length==playerList.length){
          res = res + "投票结束，结果发表如下：\n";
          var voteresult = {};
          for(var p in st8vote){
            if(!voteresult[st8vote[p]]){
              voteresult[st8vote[p]] = [p];
            }else{
              voteresult[st8vote[p]].push(p);
            }
          }
          for(var p in voteresult){
            res = res + p + ":" + voteresult[p]+"共+"+voteresult[p].length+"票\n";
          }
          var agree = voteresult["赞成"]?voteresult["赞成"].length:0;
          var disagree = voteresult["反对"]?voteresult["反对"].length:0;
          intteruptUser = getUserByUin(elect);
          if(agree>=disagree){
            res = res + "赞成票居多,"+intteruptUser.nick+"打断成功\n";
            var n = playerList.length;
            for(var i=0;i<n;i++){
              if(elect==playerList[i].uin){
                playerList[i].active=1;
                delete(playerList[i].hand[electcard]);
                res = res + intteruptUser.nick+"剩余手牌数量："+Object.keys(playerList[i].hand).length+"\n";
                if(Object.keys(playerList[i].hand).length==0){
                  res = res + intteruptUser.nick+"剩余手牌数量为0，取得游戏胜利\n";
                  break;
                }
              }else{
                if(playerList[i].active){
                  delete(playerList[i].active);
                  var card = mainCards.pop();
                  playerList[i].hand[card]=1;
                  res = res + playerList[i].nick+"抽一张卡，剩余手牌数量："+Object.keys(playerList[i].hand).length+"\n";
                  var privatemsg = "您抽到了"+card+",您的手牌为："+Object.keys(playerList[i].hand);
                  qq.sendBuddyMsg(userUin,privatemsg);
                }
              }
            }
            res = res + "由"+intteruptUser.nick+"上台发言\n";
          }else{
            res = res + "反对票居多,"+intteruptUser.nick+"打断失败\n原主播继续发言\n";
          }
          nowstep = 5;
        }
        qq.sendGroupMsg(groupId," "+res.trim());
      }
    }else{
      var res = "当前不在投票阶段";
      qq.sendGroupMsg(groupId," "+res);
    }
  }
}

function getUserByUin(uin){
  var n = playerList.length;
  for(var i=0;i<n;i++){
    if(uin==playerList[i].uin){
      return playerList[i];
    }
  }
  return null;
}

function actionBuddy(content,userUin,qq){
  if(content==""){
    var user = getUserByUin(userUin);
    if(user){
      var userCards = user.hand;
      var res = "您的手牌为："+Object.keys(userCards);
      qq.sendBuddyMsg(userUin,res);
    }
  }
}



function shuffleCards(qq,groupId){
  var n = playerList.length;
  for(var i=0;i<n;i++){
    playerList[i].hand = {};
  }

  var m = n;
  console.log('start1111111111111111111111');
  for(var i=0;i<m;i++){
    for(var j=0;j<n;j++){
      var card = mainCards.pop();
      playerList[j].hand[card]=1;
    }
  }

  for(var i=0;i<n;i++){
    var user = playerList[i];
    var userUin = user.uin;
    var userCards = user.hand;
    var res = "您的手牌为："+Object.keys(userCards);
    qq.sendBuddyMsg(userUin,res);
  }
  var nextUserNo = Math.floor(Math.random()*n);
  var nextUser = playerList[nextUserNo];
  nextUser.active = 1;
  var res = "发牌完毕，第一位选手为:"+nextUser.nick+"\n";
  res = res + "发言格式：o5+[卡片]+&+[故事]";
  nowstep = 5;
  qq.sendGroupMsg(groupId," "+res.trim());
}

function handleStory(qq,userUin,groupId,card,story){
  for(var i=0;i<playerList.length;i++){
    var user = playerList[i];
    if(user.uin==userUin){
      if(user.active){
        console.log(card);
        console.log(user.hand);
        if(user.hand[card]){
          delete(user.hand[card]);
          var res = user.nick+"使用了手牌"+card+",剩余手牌数量："+Object.keys(user.hand).length+"\n";
          if(Object.keys(user.hand).length==0){
            res = res + user.nick+"剩余手牌数量为0，取得游戏胜利\n";
            qq.sendGroupMsg(groupId," "+res.trim());
            return;
          }
          res = res + "打断格式:o6+[卡片],不打断请输入o7";
          nowstep = 6;
          st6cnt = {};
          qq.sendGroupMsg(groupId," "+res.trim());
        }else{
          var res = user.nick+"没有手牌"+card+",请重新发言";
          qq.sendGroupMsg(groupId," "+res.trim());
        }
      }else{
        var res = "您不在台上，不能发言\n";
        qq.sendGroupMsg(groupId," "+res.trim());
      }
      break;
    }
  }
}


function handleInterrupt(qq,userUin,groupId,card){
  for(var i=0;i<playerList.length;i++){
    var user = playerList[i];
    if(user.uin==userUin){
      if(user.active){
        var res = "您在台上，不能打断\n";
        qq.sendGroupMsg(groupId," "+res.trim());
      }else{
        if(user.hand[card]){
          var res = user.nick+"使用了手牌"+card+",进行打断,请投票\n";
          res = res + "赞成请输入o81，反对请输入o82，弃权输入o83";
          nowstep = 8;
          st8vote = {};
          elect = userUin;
          qq.sendGroupMsg(groupId," "+res.trim());
        }else{
          var res = user.nick+"没有手牌"+card+",请重新发言";
          qq.sendGroupMsg(groupId," "+res.trim());
        }
      }
      break;
    }
  }
}








function shuffle(aArr){
  var iLength = aArr.length,
    i = iLength,
    mTemp,
    iRandom;

  while(i--){
    if(i !== (iRandom = Math.floor(Math.random() * iLength))){
      mTemp = aArr[i];
      aArr[i] = aArr[iRandom];
      aArr[iRandom] = mTemp;
    }
  }

  return aArr;
}

wait = () => new Promise(res => setTimeout(res(), 1000))
module.exports={
  actionGroup,
  actionBuddy
}




