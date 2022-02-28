var gm = require('gm')
var request = require("request");
var fs = require("fs");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../../cq/sendImage');
const {banUserInGroup} = require('../../../cq/cache');

var running = false;
var runninggroup = 0;
var players = {};
var order = [];
var map = [];
var gun = [];
var gunstr="";
const maplen = 4;

function handleGun(content,qq,username,groupid,callback){
  content=content.toLowerCase().trim();
  content=content.replace(/上/g,"u").replace(/下/g,"d").replace(/左/g,"l").replace(/右/g,"r");
  content=content.replace(/开火/g,"开枪").replace(/fire/g,"开枪");
  content=content.replace(/move/g,"移动");
  console.log("xxx:"+running)
  if(content=="俄罗斯轮盘"&&running==false){
    ret = "俄罗斯魔法轮盘将于1分钟后开启\n";
    ret = ret + "加入：加入/join\n";
    ret = ret + "开枪：【开枪/开火/fire】+ 【上/下/左/右】\n";
    ret = ret + "移动：【移动/move】+ 【上/下/左/右】";
    players={};
    map=[];
    gun=[];
    order=[];
    gunstr="";
    running=true;
    runninggroup=groupid;

    callback(ret);
    setTimeout(function(){
      init(callback);
    },60000);
  }else if(runninggroup==groupid){
    if(content.indexOf("开枪")>-1){
      if(content.startsWith("开枪")){
        content="开枪"+content.substring(2).trim();
      }
      if(content.startsWith("开枪")&&content.length==3){
        go(content,qq,callback);
      }else if(content.startsWith("向")&&content.endsWith("开枪")&&content.length==4){
        var direct = content.substring(1,2);
        go("开枪"+direct,qq,callback);
      }else if(content=="开枪"){
        go("开枪"+"x",qq,callback);
      }
    }else if(content.indexOf("移动")>-1){
      if(content.startsWith("移动")){
        content="移动"+content.substring(2).trim();
      }
      if(content.startsWith("移动")&&content.length==3){
        go(content,qq,callback);
      }else if(content.startsWith("向")&&content.endsWith("移动")&&content.length==4){
        var direct = content.substring(1,2);
        go("移动"+direct,qq,callback);
      }else if(content=="移动"){
        go("移动"+"x",qq,callback);
      }
    }else if(content=="l移"||content=="r移"||content=="u移"||content=="d移"){
      var direct = content.substring(0,1);
      go("移动"+direct,qq,callback);
    }else if(content=="l射"||content=="r射"||content=="u射"||content=="d射"){
      var direct = content.substring(0,1);
      go("开枪"+direct,qq,callback);
    }else if(content=="加入"||content=="参加"||content=="join"){
      addplayer(qq,username,groupid,callback);
    }
  }else{

  }
}

var jobstr=["战士","骑士","龙骑","武僧","诗人","黑魔","召唤","白魔","学者"];


function addplayer(qq,username,groupid,callback){
  running = true;
  if(running==true&&players[qq]==undefined){
    var now = new Date();
    var code = Object.keys(players).length;
    if(code<9){
      if(death[groupid+"_"+qq]){
        // if(death[groupid+"_"+qq]>new Date().getTime()){
        //   callback("【"+username+"】已经死亡，无法加入游戏\n复活时间："+new Date(death[groupid+"_"+qq]).toLocaleString());
        //   return;
        // }
      }
      var job
      while(true){
        job = Math.floor(Math.random()*jobstr.length);
        var canjob = true;
        for(var p in players){
          if(players[p].job==job){
            canjob = false;
          }
        }
        if(canjob){
          break;
        }
      }
      var obj = {qq:qq,name:username,code:code,hp:4,job:job,skill:1,ts:now};
      players[qq]=obj;
      callback("【"+username+"】加入了游戏");
    }else{
      callback("【"+username+"】加入游戏失败，被扔到了吃瓜群众席位")
    }
  }

}


var downgua = {};

function init(callback) {
  map = [];
  for (var i = 0; i < maplen; i++) {
    map[i] = [];
    for (var j = 0; j < maplen; j++) {
      map[i][j] = 0;
    }
  }
  var keys = Object.keys(players);
  for(var i=0;i<Math.min(keys.length,9);i++){
    var insert = 0;
    order.push(players[keys[i]]);
    while(insert==0){
      var rd = Math.floor(Math.random()*maplen*maplen);
      var hd = Math.floor(rd/maplen);
      var wd = rd%maplen;
      if(map[hd][wd]==0){
        map[hd][wd]=players[keys[i]];
        insert = 1;
      }
    }
  }
  if(keys.length<2){
    callback("参加人数不足,游戏结束");
    running=false;
  }else{
    order.sort(function(a,b){return Math.random()-0.5});
    // next2("游戏开始,枪内子弹【"+guncount+"/"+maplen*maplen+"】\n",callback);
  }
  // console.log('map:');
  // console.log(map);
  // generateImage(callback,'111');
}

function gonext(left,text,callback){
  next2(text,callback);
}

function next2(text,callback){
  var check = checkwin(callback,text);
  if(check==true){
    running=false;
  }else{
    var next = order.shift();
    order.push(next);
    var will=false;
    for(var i=0;i<check.length;i++){
      if(next.qq==check[i].qq){
        will=true;
      }
    }
    if(will){
      var utext = text+"下一个【"+next.name+"】";
      timeoutmap={};
      var rd = new Date().getTime();
      timeoutmap[next.qq+rd]=1;
      nowrunning=next.qq;
      generateImage(callback,utext);
      setTimeout(function(){
        usertimeout(next,callback,rd);
      },20000)
    }else{
      next2(text,callback)
    }
  }
}



var timeoutmap = {};
var nowrunning;

function usertimeout(user,callback,rd){
  if(timeoutmap[user.qq+rd]){
    for(var i=0;i<maplen;i++){
      for(var j=0;j<maplen;j++){
        if(map[i][j]!=0){
          if(map[i][j].qq==user.qq){
            var text = "【"+user.name+"】犹豫不决，吃瓜群众一枪爆了他的狗头\n";

            map[i][j]=0;
            userDeath(user.qq,runninggroup);
            var check = checkwin(callback,text);
            if(check==true){
              running=false;
            }else{
              gonext(check,text,callback);
            }
            break;
          }
        }
      }
    }
  }
}


var winrate = {};
function go(content,qq,callback) {
  if(running==false){
    return;
  }
  if(nowrunning!=qq){
    return
  }
  timeoutmap={};
  var ret="";
  var pos = [-1, -1];
  var user;
  for (var i = 0; i < maplen; i++) {
    for (var j = 0; j < maplen; j++) {
      var ele = map[i][j];
      if (ele != 0 && ele.qq == qq) {
        pos = [i,j];
        user = ele;
      }
    }
  }
  if (pos[0] > -1) {
    if (content.startsWith("攻击")) {
      var direction = content.substring(2).trim();
      if (true) {
        var starty = pos[0];
        var startx = pos[1];
        var goalx;
        var goaly;
        var cndir=""

        var range=1;
        if(user.job<=3){
          range=1;
        }else{
          range=2;
        }
        if(direction=="u"){
          goalx=startx;
          goaly=Math.max(0,starty-range);
          cndir="上";
        }else if(direction=="d"){
          goalx=startx;
          goaly=Math.min(maplen-1,starty+range);
          cndir="下";
        }else if(direction=="l"){
          goalx=Math.max(0,startx-range);
          goaly=starty;
          cndir="左";
        }else if(direction=="r"){
          goalx=Math.min(maplen-1,startx+range);
          goaly=starty;
          cndir="右";
        }
        ret = ret + "【"+user.name + "】向"+cndir +"攻击\n"

        var targetlist = [];




        while(goalx!=startx||goaly!=starty){
          var next = [-1,-1];
          if(startx==goalx){
            next = [startx,goaly>starty?(++starty):(--starty)]
          }else if(starty==goaly){
            next = [goalx>startx?(++startx):(--startx),starty];
          }
          var target = map[next[1]][next[0]];
          if(target!=0){
            target.pos=[next[1],next[0]];
            targetlist.push(target);
          }
        }
        if(targetlist.length>0){
          for(var i=0;i<targetlist.length;i++){
            var target = targetlist[i];
            ret = ret + user.name + "攻击了【" + target.name + "】\n";
            var pos = [target.pos[0],target.pos[1]];
            map[pos[0]][pos[1]].hp--;
            if(map[pos[0]][pos[1]].hp==0){
              userDeath(target.qq,runninggroup);
            }
          }
        }else{
          ret = ret + "【"+user.name+"】" + "攻击了空气\n"
        }
      } else {
        ret = ret + "【"+user.name+"】" + "扣动了扳机，然而弹夹里并没有装填上子弹\n"
      }
    }else if(content.startsWith("移动")){
      var direction = content.substring(2).trim();
      var targetpos = [-1,-1];

      if(direction=="u"){
        targetpos = [pos[0]-1,pos[1]];
        cndir="上";
      }else if(direction=="d"){
        targetpos = [pos[0]+1,pos[1]];
        cndir="下";
      }else if(direction=="l"){
        targetpos = [pos[0],pos[1]-1];
        cndir="左";
      }else if(direction=="r"){
        targetpos = [pos[0],pos[1]+1];
        cndir="右";
      }
      if(targetpos[0]>=0&&targetpos[0]<maplen&&targetpos[1]>=0&&targetpos[1]<maplen){
        map[pos[0]][pos[1]]=0;
        if(map[targetpos[0]][targetpos[1]]==0){
          map[targetpos[0]][targetpos[1]]=user;
          ret = ret + "【"+user.name+"】向"+cndir+"移动了一步\n";
        }else{
          var posuser = map[targetpos[0]][targetpos[1]];
          ret = ret + "【"+user.name+"】向"+cndir+"移动了一步,然后和【"+posuser.name+"】撞个正着\n";
          var rate = user.hp/(user.hp+posuser.hp)
          if(Math.random()<rate){
            ret = ret + "【"+user.name+"】一拳锤死了【"+posuser.name+"】\n";
            map[targetpos[0]][targetpos[1]]=user;
            userDeath(posuser.qq,runninggroup);
          }else{
            ret = ret + "【"+posuser.name+"】一拳锤死了【"+user.name+"】\n";
            map[targetpos[0]][targetpos[1]]=posuser;
            userDeath(user.qq,runninggroup);
          }
        }
      }else{
        ret = ret + "【"+user.name+"】向"+cndir+"迈了一步,然而一头撞到了墙上倒下了\n";
        map[pos[0]][pos[1]]=0;
        userDeath(user.qq,runninggroup);
      }
    }else if(content.startsWith("技能")){
      var job = user.job;
      var direction = content.substring(2).trim();
      if(direction=="u"){
        targetpos = [pos[0]-1,pos[1]];
        cndir="上";
      }else if(direction=="d"){
        targetpos = [pos[0]+1,pos[1]];
        cndir="下";
      }else if(direction=="l"){
        targetpos = [pos[0],pos[1]-1];
        cndir="左";
      }else if(direction=="r"){
        targetpos = [pos[0],pos[1]+1];
        cndir="右";
      }
      if(job==0){
        if(targetpos[0]>=0&&targetpos[0]<maplen&&targetpos[1]>=0&&targetpos[1]<maplen){
          var posuser = map[targetpos[0]][targetpos[1]];
          if(posuser==0){
            ret = ret + "【"+user.name+"】对"+cndir+"方使用了死斗,然而这里只有空气\n";
            user.skill=0;
          }else{
            posuser.hp = posuser.hp-2;
            if(posuser.hp<=0){
              userDeath(posuser.qq,runninggroup);
            }else{
              
            }

          }
        }
      }


    }
  }
  var check=checkwin(callback,ret);
  if(check==true){
    running=false;
  }else{
    gonext(check,ret,callback);
  }
}

function checkwin(callback,text){
  var left = [];
  for(var i=0;i<maplen;i++){
    for(var j=0;j<maplen;j++){
      var u = map[i][j];
      if(u!=0){
        left.push(u);
      }
    }
  }
  var ret;
  var uret;
  if(left.length==1){
    ret = "游戏结束,幸存者【"+left[0].name+"】";
    uret= true;
  }else if(left.length==0){
    ret = "游戏结束,没有幸存者，吃瓜群众获得了胜利";
    uret= true;
  }else if(gun.length==0){
    ret = "游戏结束，幸存者";
    for(var i=0;i<left.length;i++){
      ret = ret + "【"+left[i].name+"】";
    }
    uret= true;
  }else{
    uret= left;
  }
  if(uret==true){
    generateImage(callback,text+ret);
  }
  return(uret);
}


var indexStr = '①①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'.split('');
function generateImage(callback,utext){
  var img1 = new imageMagick("static/block.png");
  img1.autoOrient()
    .fontSize(20)
    .fill('blue')
    .font('./static/dfgw.ttf')

  for(var i=0;i<maplen;i++){
    for(var j=0;j<maplen;j++){
      if(map[i][j]!=0){
        var ele = map[i][j];
        var name = ele.name;
        var job = ele.job;
        var skill = ele.skill;
        var hp = ele.hp;
        var shortname = name.substring(0,4);
        var hpstr = ""
        for(var m=0;m<hp;m++){
          hpstr=hpstr+"❤";
        }

        var mpstr = skill?"☆":""
        img1.fill('blue').drawText(j*140+25,i*140+35,shortname,'NorthWest')
        img1.fill('blue').drawText(j*140+25,i*140+60, "【"+jobstr[job]+"】"+mpstr,'NorthWest')
        img1.fill('red').drawText(j*140+25,i*140+85,hpstr,'NorthWest')

      }
    }
  }

  sendGmImage(img1,utext,callback,1);
}


var death={};
function userDeath(qq,groupid){
  banUser(qq,groupid);
  death[groupid+"_"+qq]=new Date().getTime()+60000*5
}




function banUser(qq,group){
  var time=Math.floor(Math.random()*250);
  banUserInGroup(qq,group,time);
  setTimeout(function(){
    banUserInGroup(qq,group,0);
  },Math.floor(time*500*Math.random())+1000);
}



module.exports={
  handleGun,
  addplayer,
  init,
  generateImage
}