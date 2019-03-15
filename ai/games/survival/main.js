var gm = require('gm')
var request = require("request");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../../cq/sendImage');



var running = false;
var players = {};
var order = [];
var map = [];
var gun = [];

const maplen = 4;

function handleGun(content,qq,username,groupid,callback){
  content=content.toLowerCase().trim();
  content=content.replace('/上/g',"u").replace('/下/g',"d").replace('/左/g',"l").replace('/右/g',"r");
  content=content.replace('/开火/g',"开枪").replace('/fire/g',"开枪");
  content=content.replace('/move/g',"移动");
  console.log("xxx:"+running)
  if(content=="俄罗斯轮盘"&&running==false){
    ret = "俄罗斯轮盘改将于1分钟后开启\n";
    ret = ret + "加入：加入/参加/join\n";
    ret = ret + "开枪：【开枪/开火/fire】+ 【上/下/左/右】\n";
    ret = ret + "移动：【移动/move】+ 【上/下/左/右】";
    players={};
    map=[];
    gun=[];
    order=[];
    running=true;
    setTimeout(function(){
      init(callback);
    },60000);
  }else if(content.indexOf("开枪")>=-1){
    if(content.startsWith("开枪")&&content.length==3){
      go(content,qq,callback);
    }else if(content.startsWith("向")&&content.endsWith("开枪")&&content.length==4){
      var direct = content.substring(1,2);
      go("开枪"+direct,qq,callback);
    }
  }else if(content.indexOf("移动")>=-1){
    if(content.startsWith("移动")&&content.length==3){
      go(content,qq,callback);
    }else if(content.startsWith("向")&&content.endsWith("移动")&&content.length==4){
      var direct = content.substring(1,2);
      go("移动"+direct,qq,callback);
    }
  }else if(content=="加入"||content=="参加"||content=="join"){
    addplayer(qq,username,groupid,callback);
  }
}



function addplayer(qq,username,groupid,callback){
  if(running==true){
    var now = new Date();
    var code = Object.keys(players).length;
    var obj = {qq:qq,name:username,code:code,ts:now};
    players[qq]=obj;
    callback("【"+username+"】进入了战场");
  }
}

function init(callback) {
  map = [];
  for (var i = 0; i < maplen; i++) {
    map[i] = [];
    for (var j = 0; j < maplen; j++) {
      map[i][j] = 0;
    }
  }
  var keys = Object.keys(players);
  for(var i=0;i<keys.length;i++){
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
  var max = maplen*2;
  var guncount=0;
  for(var i=0;i<maplen*maplen;i++){
    if(Math.random()<max/12){
      gun.push(1);
      guncount++;
      max--;
    }else{
      gun.push(0);
    }
  }
  if(keys.length<2){
    callback("参加人数不足,游戏结束");
    running=false;
  }else{
    order.sort(function(a,b){return Math.random()-0.5});
    gonext(order,"游戏开始,枪内子弹【"+guncount+"/"+maplen*maplen+"】\n",callback);
    generateImage(callback);
  }
}
function gonext(left,text,callback){
  var next = order.shift();
  order.push(next);
  var will=false;
  for(var i=0;i<left.length;i++){
    if(next.qq==left[i].qq){
      will=true;
    }
  }
  if(will){
    callback(text+"下一个【"+next.name+"】");
    timeoutmap={};
    timeoutmap[next.qq]=1;
    nowrunning=next.qq;
    setTimeout(function(){
      usertimeout(next,callback);
    },15000)
  }else{
    gonext(left,text,callback)
  }
}


var timeoutmap = {};
var nowrunning;

function usertimeout(user,callback){
  if(timeoutmap[user.qq]){
    for(var i=0;i<maplen;i++){
      for(var j=0;j<maplen;j++){
        if(map[i][j]!=0){
          if(map[i][j].qq==user.qq){
            var text = "【"+user.name+"】犹豫不决，吃瓜群众一枪爆了他的狗头\n";
            generateImage(callback);
            map[i][j]=0;
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




function start(){
  addplayer(111,"aaa",123);
  addplayer(222,"bbb",123);
  addplayer(333,"ccc",123);
  addplayer(444,"ddd",123);
  running = true;

  var callback = function(r){console.log("xxx:"+r)};
  init(callback);
  go("移动d",111,callback);
  go("移动r",222,callback);
  go("移动d",333,callback);
  go("移动u",444,callback);

  go("开枪l",111,callback);
  go("开枪r",222,callback);
  go("开枪d",333,callback);
  go("开枪u",444,callback);
}

function go(content,qq,callback) {
  if(running==false){
    return;
  }
  if(nowrunning!=qq){
    return
  }
  delete(timeoutmap[qq]);
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
    if (content.startsWith("开枪")) {
      var direction = content.substring(2);
      var ele = gun.shift();
      if (ele == 1) {
        var starty = pos[0];
        var startx = pos[1];
        var goalx;
        var goaly;
        var cndir=""
        if(direction=="u"){
          goalx=startx;
          goaly=0;
          cndir="上";
        }else if(direction=="d"){
          goalx=startx;
          goaly=maplen-1;
          cndir="下";
        }else if(direction=="l"){
          goalx=0;
          goaly=starty;
          cndir="左";
        }else if(direction=="r"){
          goalx=maplen-1;
          goaly=starty;
          cndir="右";
        }
        ret = ret + "【"+user.name + "】向"+cndir +"扣动了扳机\n"

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
            ret = ret + user.name + "一枪暴毙了" + target.name + "\n";
            var pos = [target.pos[0],target.pos[1]];
            map[pos[0]][pos[1]]=0;
            if(Math.random()>1/(i+2)){
              break;
            }else{
              ret = ret + "子弹竟然穿越了【"+user.name+"】的尸体继续前进\n"
            }
          }
        }else{
          ret = ret + "【"+user.name+"】" + "一发子弹打到了墙上，墙上出现了个❤型裂痕\n"
        }
      } else {
        ret = ret + "【"+user.name+"】" + "扣动了扳机，然而什么事也没有发生\n"
      }
    }else if(content.startsWith("移动")){
      var direction = content.substring(2);
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
          if(Math.random()<0.5){
            ret = ret + "【"+user.name+"】一拳锤死了【"+posuser.name+"】\n";
            map[targetpos[0]][targetpos[1]]=user;
          }else{
            ret = ret + "【"+posuser.name+"】一拳锤死了【"+user.name+"】\n";
            map[targetpos[0]][targetpos[1]]=posuser;
          }
        }

      }else{
        ret = ret + "【"+user.name+"】向"+cndir+"迈了一步,然而一头撞到了墙上倒下了\n";
        map[pos[0]][pos[1]]=0;
      }
    }
  }

  generateImage(callback);
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
    callback(text+ret);
  }
  return(uret);
}


function generateImage(callback){
  var img1 = new imageMagick("static/block.png");
  img1.autoOrient()
    .fontSize(25)
    .fill('blue')
    .font('./static/dfgw.ttf')

  for(var i=0;i<maplen;i++){
    for(var j=0;j<maplen;j++){
      if(map[i][j]!=0){
        var ele = map[i][j];
        var name = ele.name;
        var shortname = name.substring(0,4);
        img1.drawText(j*140+25,i*140+55,shortname,'NorthWest')
      }
    }
  }
  sendGmImage(img1,"",callback);
}


module.exports={
  handleGun
}