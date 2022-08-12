var fs=require('fs');
var request = require('request');
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require('../../../baibaiConfigs.js')


var nowrunning = 0;
var gamestart = 0;
var initdice=6;
var maplen=120;
var map = [];
var usermap={};
var nextuser = 0;
var nowvoting = 0;
var votingmap = {}
var votingtimer = null;
var Ncallback = null;
var gotimer = null;
var gameport=0;
var rt = [
  "从任意玩家手里夺取一个骰子",
  "送给任意玩家一个骰子",
  "夺取或送给任意玩家一个骰子",
  "一定概率获得内鬼提示"
]
var odarr = '①②③④⑤⑥⑦⑧⑨⑩'.split('');
function addplayer(qq,name){
  if(usermap[qq]){
    return 1;
  }else{
    var userlen = Object.keys(usermap).length;
    if(userlen>8){
      return -1;
    }else{
      var user={qq:qq,name:name,id:userlen+1,dice:initdice,role:0,lastmap:0};
      //user.name=odarr[user.id+1]+user.name
      user.name='{'+user.id+'}'+user.name
      usermap[qq]=user;
      return 0;
    }

  }
}

function generateMap(){
  for(var i=1;i<maplen;i++){
    var rd = Math.floor(4*Math.random());
    map[i]={idx:i,d:rd};
  }
  map[0]={idx:0,d:-1};
  map[maplen] = {d:-1,goal:1};
}
function getTraitorNum(){
  var traitornum = 1;
  var users = Object.keys(usermap)
  var userlen = users.length;
  if(userlen==3||userlen==4){
    traitornum=1;
  }else if(userlen==5||userlen==6){
    traitornum=2;
  }else if(userlen==7||userlen==8||userlen==9){
    traitornum=3;
  }
  return traitornum
}

function inituser(){
  var users = Object.keys(usermap)
  var userlen = users.length;
  var traitornum = getTraitorNum();
  var nt = 0;
  while(nt<traitornum){
    var rd = Math.floor(userlen*Math.random());
    var qq = users[rd];
    var user = usermap[qq];
    if(user.role==0){
      user.role=1;
      nt++;
    }
  }
  for(var qq in usermap){
    var rd = Math.floor(Math.random()*maplen)
    rd=0
    map[rd][qq]=usermap[qq];
  }
}

function init(){
   nowrunning = 0;
   gamestart = 0;
   initdice=6;
   map = [];
   usermap={};
   nextuser = 0;
  nowvoting = 0;
  votingmap = {}
  votingtimer = null;
  Ncallback = null;
  gotimer = null;
  gameport = 0;
  generateMap();
}
function handleVoteReply(content,groupid,qq,name,callback){
  content = content.trim();
  vote(qq,content,callback);
}

function handleDSReply(content,groupid,qq,name,callback,port){
  content=content.trim();
  if(content=='捉内鬼'){
    if(nowrunning==0){
      init();
      gameport=port;
      nowrunning = groupid;
      addplayer(qq,name);
      var rule = '';
      rule = rule + '捉内鬼游戏\n';
      rule = rule + '三人或以上可以进行捉内鬼游戏\n';
      rule = rule + '游戏开始时会私聊告诉内鬼以及内鬼的同伴\n';
      rule = rule + '游戏棋盘为'+maplen+'格\n';
      rule = rule + '游戏开始时每个人在初始第0格，每个人拥有6个骰子\n';
      rule = rule + '轮到自己行动时，可以先行使当前所在格子的权益\n并且掷出上限为自己拥有数量的骰子，然后前进所有骰子总和的步数\n'
      rule = rule + '每次行动后失去一个骰子，30秒超时的话会放弃权益并投掷随机数量的骰子\n';
      rule = rule + '每个人行动完毕后，有1分钟的讨论+投票内鬼时间，可以弃权\n';
      rule = rule + '本轮得票最多且大于等于2票的人会失去2个骰子(同票则随机选择)，随机分配给其他人\n';
      rule = rule + '拥有骰子数为0时死亡\n';
      rule = rule + '获胜条件\n';
      rule = rule + '平民胜利：任意一平民到达终点\n';
      rule = rule + '平民大胜利：任意一平民到达终点，且没有任何人死亡\n';
      rule = rule + '内鬼胜利：任意一内鬼到达终点\n';
      rule = rule + '内鬼大胜利：所有人死亡,无人到达终点\n';
      rule = rule + '行动指令：\n';
      rule = rule + 'ZNG【使用权益目标】【空格】【使用骰子数】示例：【ZNG 2 6】：\n';

      setTimeout(function(){
        gamestart = 1;
        inituser();
        gonext('捉内鬼游戏开始\n内鬼人数'+getTraitorNum(),callback);
        Ncallback = callback;
      },60000);
      callback(rule+'\n捉内鬼游戏1分钟后开始\n加入游戏：【捉内鬼】\n')
    }else if(nowrunning==groupid&&gamestart==0){
      var addret = addplayer(qq,name);
      if(addret==-1){
        callback(name+'加入捉内鬼游戏失败');
      }else{
        callback(name+'加入了捉内鬼游戏，当前游戏人数：'+Object.keys(usermap).length);
      }

    }else{

    }
  }else if(nowrunning==groupid&&gamestart==1){
    var ca = content.split(' ');
    if(ca.length==2){
      var nextmatch = false;
      for(var oqq in usermap){
        if(usermap[oqq].id==nextuser){
          if(qq==oqq){
            nextmatch = true;
            break;
          }
        }
      }
      if(nextmatch){
        go(qq,parseInt(ca[0]),parseInt(ca[1]),callback);
      }
    }
  }else{
    console.log(nowrunning+'sss'+gamestart)
  }
}


function vote(qq,userid,callback){
  if(nowvoting==1){
    for(var oqq in usermap){
      if(oqq==qq){
        votingmap[qq]=userid;
        //console.log('sssssssssssssss',Object.keys(votingmap).length,Object.keys(usermap).length)
        if(Object.keys(votingmap).length==Object.keys(usermap).length){
          clearTimeout(votingtimer)
          votingtimer = null;
          votefinish(function(r){
            callback('【'+usermap[oqq].name+'】把内鬼投给了玩家'+userid+'\n'+r.trim())
          });
        }else{
          callback('【'+usermap[oqq].name+'】把内鬼投给了玩家'+userid);
        }
      }
    }

  }

}
function votefinish(callback){
  console.log('vote finish');
  votingtimer = null;
  nowvoting=0;
  var votcount = {}
  for(var qq in votingmap){
    if(votcount[votingmap[qq]]){
      votcount[votingmap[qq]]++
    }else{
      votcount[votingmap[qq]]=1
    }
  }
  var keys = Object.keys(votcount);
  keys.sort(function(a,b){return votcount[b]-votcount[a]})
  var ret = '投票结束\n';
  for(var i=0;i<keys.length;i++){
    var userid = keys[i];
    for(var qq in usermap){
      if(usermap[qq].id==userid){
        ret = ret + '【'+usermap[qq].name+'】得票数:'+votcount[userid]+'\n'
      }
    }
  }
  var votedid = keys[0];
  if(votcount[votedid]>1){
    for(var qq in usermap){
      if(usermap[qq].id==votedid){
        var voteduser = usermap[qq];
        var m = 2;
        var userqqlist = Object.keys(usermap)
        while(m>0&&voteduser.dice>0){
          uqq = userqqlist[Math.floor(Math.random()*userqqlist.length)];
          if(usermap[uqq].dice>0&&usermap[uqq].id!=votedid){
            voteduser.dice--;
            usermap[uqq].dice++;
            m--;
            ret = ret + '【'+voteduser.name+'】失去一枚骰子，被【'+usermap[uqq].name+'】得到了\n';
          }
        }
      }
    }
  }
  nextuser = 0;
  gonext(ret,callback);
}

function gonext(lastret,callback){
  var wa = checkwin();
  if(wa[0]==0){
    gonext1(lastret,callback);
  }else{
    generateImage(lastret.trim()+'\n'+wa[1],callback);
  }
}

function gonext1(lastret,callback){
  gotimer = null;
  var userlen = Object.keys(usermap).length;
  nextuser = nextuser+1;
  var ret = '';
  if(nextuser==userlen+1){
    var alive = 0;
    for(var oqq in usermap){
      if(usermap[oqq].dice>0){
        alive++;
      }
    }
    if(alive>2){
      ret = ret + '投票环节：\n';
      ret = ret + '请互相讨论，并在40秒内投票(可弃权)\n';
      ret = ret + '投票格式：TNG+【玩家编号】\n';
      nowvoting = 1;
      votingmap = {}
      votingtimer = setTimeout(function(){
        votefinish(callback);
      },40000);
      generateImage(lastret.trim()+"\n"+ret,callback);
      return ;
    }else{
      ret = ret + '存活玩家<3,跳过投票环节\n';
      nextuser = 0;
      gonext(lastret.trim()+"\n"+ret,callback);
    }
  }else{
    for(var oqq in usermap){
      if(usermap[oqq].id==nextuser){
        if(usermap[oqq].dice>0){
          ret = ret + '下一个【'+usermap[oqq].name+'】,';
          var mapd = map[usermap[oqq].lastmap].d;
          if(mapd>=0){
            ret = ret + '您的权益是【'+rt[mapd]+'】\n'
            if(mapd==0){
              ret = ret + '行动指令 ZNG【抢夺玩家编号，放弃为0】【空格】【掷出的骰子数】\n'
            }else if(mapd==1){
              ret = ret + '行动指令 ZNG【赠送玩家编号，放弃为0】【空格】【掷出的骰子数】\n'
            }else if(mapd==2){
              ret = ret + '行动指令 ZNG【正数为抢夺玩家编号，负数为赠送玩家编号，放弃为0】【空格】【掷出的骰子数】\n'
            }else if(mapd==3){
              ret = ret + '行动指令 ZNG【0】【空格】【掷出的骰子数】\n行动后你会得到一条提示\n'
            }
          }
          gotimer = setTimeout(function(){
            go(oqq,0,100,function(r){Ncallback('【'+usermap[oqq].name+'】行动超时\n'+r.trim())});
          },30000)
          generateImage(lastret.trim()+'\n'+ret,callback);
        }else{
          gonext(lastret.trim()+'\n'+'【'+usermap[oqq].name+'】死亡跳过\n',callback);
        }
        break;
      }
    }
  }
}

function go(qq,rightnum,dicenum,callback){
  clearTimeout(gotimer);
  var ret = '';
  for(var i=0;i<maplen;i++){
    if(map[i][qq]){
      var user = map[i][qq];
      var userlen = Object.keys(usermap).length;
      var myid = user.id;

      if(map[user.lastmap].d==0){//夺取
        if(rightnum!=myid&&rightnum<=userlen&&rightnum>0){
          for(var oqq in usermap){
            if(usermap[oqq].id==rightnum){
              if(usermap[oqq].dice>0){
                usermap[oqq].dice=usermap[oqq].dice-1;
                user.dice=user.dice+1;
                ret = '【'+user.name+'】夺取了【'+usermap[oqq].name+'】的一个骰子\n'
              }else{
                ret = '【'+user.name+'】想夺取【'+usermap[oqq].name+'】的一个骰子，但空手而归\n'
              }
            }
          }
        }else{
          ret = '【'+user.name+'】选择了放弃权益\n'
        }
      }else
      if(map[user.lastmap].d==1){//送给
        if(rightnum!=myid&&rightnum<=userlen&&rightnum>0){
          for(var oqq in usermap){
            if(usermap[oqq].id==rightnum){
              if(user.dice>1&&usermap[oqq].dice>0){
                usermap[oqq].dice=usermap[oqq].dice+1;
                user.dice=user.dice-1;
                ret = '【'+user.name+'】送给了【'+usermap[oqq].name+'】的一个骰子\n'
              }else{
                ret = '【'+user.name+'】想送给【'+usermap[oqq].name+'】一个骰子，但失败了\n'
              }
            }
          }
        }else{
          ret = '【'+user.name+'】选择了放弃权益\n'
        }
      }else
      if(map[user.lastmap].d==2){//送给或夺取
        if(rightnum>0){
          for(var oqq in usermap){
            if(usermap[oqq].id==rightnum){
              if(usermap[oqq].dice>0){
                usermap[oqq].dice=usermap[oqq].dice-1;
                user.dice=user.dice+1;
                ret = '【'+user.name+'】夺取了【'+usermap[oqq].name+'】的一个骰子\n'
              }else{
                ret = '【'+user.name+'】想夺取【'+usermap[oqq].name+'】的一个骰子，但空手而归\n'
              }
            }
          }
        }else if(rightnum<0){
          rightnum = - rightnum;
          if(rightnum!=myid&&rightnum<=userlen) {
            for (var oqq in usermap) {
              if (usermap[oqq].id == rightnum) {
                if (user.dice > 1 && usermap[oqq].dice > 0) {
                  usermap[oqq].dice = usermap[oqq].dice + 1;
                  user.dice = user.dice - 1;
                  ret = '【' + user.name + '】送给了【' + usermap[oqq].name + '】的一个骰子\n'
                } else {
                  ret = '【' + user.name + '】想送给【' + usermap[oqq].name + '】一个骰子，但失败了\n'
                }
              }
            }
          }
        }else{
          ret = '【'+user.name+'】选择了放弃权益\n'
        }
      }else if(map[user.lastmap].d==3){
          //内鬼
      }else{
        console.log('start in:')
        ret = 'start\n'
      }
      var hasdice = user.dice;
      if(dicenum==100){
        dicenum = 1+Math.floor(Math.random()*hasdice);
        ret = ret + '随机使用了'+dicenum+'个骰子\n';
      }else if(dicenum>hasdice||dicenum<1){
        ret = ret + '【'+user.name+'】的骰子数('+hasdice+')不足';
        dicenum = 1+Math.floor(Math.random()*hasdice);
        ret = ret + '将使用'+dicenum+'个骰子\n';
      }
      var dicestr = '';
      var dicesum = 0;
      for(var k=0;k<dicenum;k++){
        var rd = Math.floor(Math.random()*6+1);
        dicestr = dicestr + ',' + rd;
        dicesum = dicesum + rd;
      }
      var alldicestr = '【'+dicestr.substring(1)+'】'
      var target = dicesum + i;
      user.dice = user.dice -1;
      if(map[target]){
        user.lastmap=target;
        map[target][qq]=user;
      }else{
        user.lastmap=maplen;
        map[maplen][qq]=user;
      }
      delete(map[i][qq]);
        ret = ret +'【'+user.name+'】掷出了'+dicenum+'个骰子'+alldicestr+'前进了'+dicesum+'步\n';
      if(map[target]){
        ret = ret + '获得权益【'+rt[map[target].d]+'】';
      }


      break;
    }
  }
  gonext(ret,callback)
}

function checkwin(){
  var ret = '';
  var alive = 0;
  var winrank = -1;
  for(var qq in usermap){
    if(usermap[qq].dice>0){
      alive++;
    }
    if(map[maplen][qq]){
      var winuser = map[maplen][qq];
      var role = winuser.role;
      ret = ret + '游戏结束，【'+winuser.name+'】到达了终点,'
      winrank = role;
      if(role==0){
        ret = ret + '平民获胜\n';
      }else if(role==1){
        ret = ret + '内鬼获胜\n';
      }
    }

  }
  ret =ret + '存活人数：'+alive+',';
  if(winrank==0){
    if(alive==Object.keys(usermap).length){
      ret = ret + '所有人存活，平民大胜利\n'
      return [2,ret];
    }else{
      return [1,ret]
    }
  }
  if(alive==0){
    ret = ret + '无人存活，内鬼大胜利\n'
    return [4,ret];
  }
  if(winrank==1){
    return [3,ret]
  }
  return [0,''];
}

var myip = "192.168.17.236";
var mdha = [
 '<img width="20" src="http://'+myip+':10086/png/00.png" />',
  '<img width="20" src="http://'+myip+':10086/png/01.png" />',
  '<img width="20" src="http://'+myip+':10086/png/02.png" />',
  '<img width="20" src="http://'+myip+':10086/png/03.png" />'
];

function generateImage(txt,callback){
  var h = '<table border="1">';
  var perwd = 14;
  var wd = perwd-1;
  var hd = 2*Math.floor(maplen/perwd)+1;
  var maxus=0;
  for(var i=0;i<hd;i++){
    h = h + '<tr>';
    var us = 0
    for(var k=0;k<wd;k++){
      h = h + '<td>';

      var idx = -1;
      if(i%4==0){
         idx = (Math.floor(i/4)*perwd*2 + k)
      }
      if(i%4==1&&k==wd-1){
        idx = (Math.floor(i/4)*perwd*2 + perwd-1)
      }
      if(i%4==2){
          idx = (Math.floor((i+2)/4)*perwd*2 -2-k)
      }
      if(i%4==3&&k==0){
        idx = (Math.floor(i/4)*perwd*2 + perwd*2-1)
      }
      if(idx>=0&&idx<=maplen){
        var mapd = map[idx];
        var md = mapd.d;
        var mdh = ''
        if(md==0){
          mdh = mdha[md];
        }else if(md==1){
          mdh = mdha[md];
        }else if(md==2){
          mdh = mdha[md];
        }else if(md==3){
          mdh = mdha[md];
        }

        var h1 = '<table><tr><td>'+idx+'</td></tr><tr><td>'+mdh+'</td></tr></table>'
        var h3 = '<table border="1"><tr>'
        for(var pdd in mapd){
          if(pdd=='d'||pdd=='idx'||pdd=='goal'){

          }else{
            us++;
            var user = mapd[pdd];
            h3 = h3 + '<td>' + user.name.substring(0,3)+'<br>'+user.name.substring(3,7)+'<br>' + '<img src="http://'+myip+':10086/png/dice0.png" >'+user.dice+'</td>'
          }
        }
        h3 = h3 + '</tr></table>';
        var h2 = h3;
        h = h + '<table><tr><td>'+h1+'</td><td>'+h2+'</td></tr></table>';
      }
      h = h + '</td>';
    }
    h = h + '</tr>'
    if(us>maxus){
      maxus=us;
    }
  }
  h = h + '</table>';
  var bodywidth = 750+maxus*40;
  var html=`
<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8">
    </head>
    <body style="width:${bodywidth}px">
    <div>${h}</div>
    <div>
      <div>${mdha[0]}:${rt[0]}</div>
      <div>${mdha[1]}:${rt[1]}</div>
      <div>${mdha[2]}:${rt[2]}</div>
      <div>${mdha[3]}:${rt[3]}</div>
    </div>
    </body>

    </html>
    `;
  var output = '3.png';
  var nowts = new Date().getTime();
  output = path.join(IMAGE_DATA, 'zng', `${nowts}.png`)
  nodeHtmlToImage({
    output,
    html
  }).then(() => {
    let imgMsg = `[CQ:image,file=${path.join('send', 'zng', `${nowts}.png`)}]`
    callback(imgMsg+'\n'+txt.trim())
  })
}


module.exports={
  handleDSReply,
  handleVoteReply
}


function test(){
  init();
  handleDSReply('捉内鬼' ,'gid1','qq1','给过我是',function(r){console.log('111:'+r)})
  handleDSReply('捉内鬼' ,'gid1','qq2','刨根问底分',function(r){console.log('222:'+r)})
  handleDSReply('捉内鬼' ,'gid1','qq3','剽掠开了',function(r){console.log('333:'+r)})
  handleDSReply('捉内鬼' ,'gid1','qq4','颇尔坑么',function(r){console.log('333:'+r)})
  handleDSReply('捉内鬼' ,'gid1','qq5','咖啡店是',function(r){console.log('333:'+r)})
  handleDSReply('捉内鬼' ,'gid1','qq6','破青岛市',function(r){console.log('333:'+r)})
  setTimeout(function(){
    console.log(usermap);
    handleDSReply('0 6' ,'gid1','qq1','name1',function(r){console.log('444:'+r)})
    handleDSReply('0 6' ,'gid1','qq2','name2',function(r){console.log('555:'+r)})
    handleDSReply('0 6' ,'gid1','qq3','name3',function(r){console.log('666:'+r)})
    handleVoteReply('3','gid1','qq1','name1',function(r){console.log('777:'+r)})
    handleVoteReply('3','gid1','qq2','name2',function(r){console.log('777:'+r)})
    handleVoteReply('1','gid1','qq3','name3',function(r){console.log('777:'+r)})
    handleDSReply('2 6' ,'gid1','qq1','name1',function(r){console.log('666:'+r)})
    handleDSReply('-3 4' ,'gid1','qq2','name2',function(r){console.log('666:'+r)})
    generateImage('')
    //handleDSReply('2 8' ,'gid1','qq3','name3',function(r){console.log('666:'+r)})
    console.log(map)
  },1500)
}

//test()

function test2(){
  handleVoteReply('3','gid1','qq1','name1',function(r){console.log('777:'+r)})
  handleVoteReply('3','gid1','qq2','name2',function(r){console.log('777:'+r)})
  handleVoteReply('1','gid1','qq3','name3',function(r){console.log('777:'+r)})

}