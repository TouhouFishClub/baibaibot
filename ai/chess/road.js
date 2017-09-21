var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_maze';

var maze = [];
var width = 100;
var height = 100;
var userMap = {};
var strHead = "`m";

function initMaze(){
  for(var i=0;i<width;i++){
    maze[i]=[];
  }
  for(var i=0;i<width;i++){
    for(var j=0;j<height;j++){
      var rd = Math.random();
      var type;
      var hp;
      if(rd<0.4){
        type=1;
        hp=10;
      }else{
        type=0;
        hp=0;
      }
      var m = {type:type,hp:hp};
      maze[i][j]=m;
    }
  }
}

/*
  type:
  0 : road
  1 : wall
  2 : monster
  3 : boss
  4 : player

 */

function insertMonsters(n){
  while(n>0){
    var x = Math.floor(Math.random()*width);
    var y = Math.floor(Math.random()*height);
    if(maze[x][y].type==0){
      n--;
      var monster = {type:2,_id:"m"+n,hp: 50, mp: 50, tp: 100, gold: 50,lv: 1,exp:50,sight:0,
        str: 9, int: 9, agi: 9, atk:9, def:0, mag:9,luck:9,status:0,x:x,y:y};
      maze[x][y]=monster;
    }
  }
}

function insertBoss(n){
  while(n>0){
    var x = Math.floor(Math.random()*width);
    var y = Math.floor(Math.random()*height);
    if(maze[x][y].type==0){
      n--;
      var boss = {type:3,_id:"B"+n,hp: 200, mp: 200, tp: 100, gold: 200,lv: 1,exp:200,sight:0,
        str: 19, int: 9, agi: 9, atk:9, def:9, mag:9,luck:9,status:0,x:x,y:y};
      maze[x][y]=boss;
    }
  }
}

function init(){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_maze = db.collection('cl_maze');
    var query = {"_id":"maze"};
    cl_maze.findOne(query, function (err, data) {
      if (data) {
        maze = JSON.parse(data.d);
        userMap = JSON.parse(data.m);
      } else {
        initMaze();
        insertMonsters(2*Math.floor(Math.sqrt(width*height)));
        insertBoss(3);
        cl_maze.save({"_id":"maze",d:JSON.stringify(maze),m:JSON.stringify(userMap)});
      }
    });
  });
}

init();
var lock=0;

function handleUserOperation(fromuin,content,members,Ncallback){
  var callback = function(ret){
    lock=0;
    MongoClient.connect(mongourl, function(err, db) {
      var cl_maze = db.collection('cl_maze');
      cl_maze.save({"_id":"maze",d:JSON.stringify(maze),m:JSON.stringify(userMap)});
      Ncallback(ret);
    });
  }
  lock=1;
  if(content == ""){
    var ret = strHead+"0:查看自己状态\n";
    ret = ret + strHead+"1:移动\n";
    ret = ret + strHead+"2:攻击\n";
    ret = ret + strHead+"3:升级\n";
    callback(ret);
  }else{
    var first = content.substring(0,1);
    if(first == 0){
      getMazeUserInfo(fromuin,content.substring(1),members,callback)
    }else if(first == 1){
      content = content.substring(1);
      if(content==""){
        var ret = "每次移动消耗1MP,回复1HP\n";
        ret = ret + strHead+"1U:向上走一格\n";
        ret = ret + strHead+"1D:向下走一格\n";
        ret = ret + strHead+"1L:向左走一格\n";
        ret = ret + strHead+"1R:向右走一格\n";
        callback(ret);
      }else{
        var userName = getUserNameByUin(fromuin,members);
        var uxy = userMap[userName];
        var user = maze[uxy[0]][uxy[1]];
        if(!user){
          user = initUser(userName);
        }
        if(user.mp>=1){
          user.mp=user.mp-1;
          if(user.hp<300){
            user.hp=user.hp+1;
          }
          content=content.toUpperCase();
          if(content=="U"||content=="D"||content=="L"||content=="R"){
            move(content,user,callback);
          }
        }else{
          callback(user._id+"MP不足,不能移动");
        }
      }
    }else if(first==2){
      content = content.substring(1);
      if(content==""){
        var ret = "每次攻击消耗2MP\n";
        ret = ret + strHead+"2U:攻击上方\n";
        ret = ret + strHead+"2D:攻击下方\n";
        ret = ret + strHead+"2L:攻击左方\n";
        ret = ret + strHead+"2R:攻击右方\n";
        callback(ret);
      }else{
        var userName = getUserNameByUin(fromuin,members);
        var uxy = userMap[userName];
        var user = maze[uxy[0]][uxy[1]];
        if(!user){
          user = initUser(userName);
        }
        if(user.mp>=2){
          user.mp=user.mp-2;
          content=content.toUpperCase();
          if(content=="U"||content=="D"||content=="L"||content=="R"){
            attack(content,user,callback);
          }
        }else{
          callback(user._id+"MP不足,不能攻击");
        }
      }
    }else if(first==3){
      var userName = getUserNameByUin(fromuin,members);
      var next = content.substring(1);
      if(next==""){
        var ret = "请选择：\n";
        ret = ret +  strHead+"31:攻击力+1,其他能力一定概率+1\n";
        ret = ret +  strHead+"32:防御力+1,其他能力一定概率+1\n";
        ret = ret +  strHead+"33:幸运+1,其他能力一定概率+1\n";
        ret = ret +  strHead+"34:速度+1,其他能力一定概率+1\n";
        callback(ret);
      }else{
        var uxy = userMap[userName];
        var user = maze[uxy[0]][uxy[1]];
        if(!user){
          user = initUser(userName);
        }
        var data=user;
        if(data.exp>=data.lv*100-50){
          if(data.lv<25){
            data.exp=data.exp-data.lv*100+50;
            data.lv=data.lv+1;
            var ret = "";
            if(next==1){
              data.atk=data.atk+1;
              ret = ret + ",atk+1"
            }else if(next==2){
              data.def=data.def+1;
              ret = ret + ",def+1";
            }else if(next==3){
              data.luck=data.luck+1;
              ret = ret + ",luck+1";
            }else if(next==4){
              data.agi=data.agi+1;
              ret = ret + ",agi+1";
            }else{

            }
            if(next!=1&&Math.random()<0.45){
              data.atk=data.atk+1;
              ret = ret + ",atk+1"
            }
            if(next!=2&&Math.random()<0.45){
              data.def=data.def+1;
              ret = ret + ",def+1";
            }
            if(next!=3&&Math.random()<0.45){
              data.luck=data.luck+1;
              ret = ret + ",luck+1";
            }
            if(next!=4&&Math.random()<0.45){
              data.agi=data.agi+1;
              ret = ret + ",agi+1";
            }
            callback(userName+'升级到'+data.lv+'级,'+ret.substring(1))
          }else{
            callback(userName+'不能在升级了,请转生后在升级');
          }
        }else{
          callback(userName+'经验不足,不能升级');
        }
      }
    }
  }
}

function attack(direction,user,callback){
  var x = parseInt(user.x);
  var y = parseInt(user.y);
  var userName = user._id;
  var nx = x;
  var ny = y;
  if(direction=="U"){
    ny = ny + 1;
  }else if(direction=="D"){
    ny = ny - 1;
  }else if(direction=="L"){
    nx = nx - 1;
  }else if(direction=="R"){
    nx = nx + 1;
  }
  if(nx<0||nx>width||ny<0||ny>height){
    callback('前面是空气!');
    return;
  }
  if(maze[nx][ny].type==0){
    callback('前面是空气!');
    return;
  }
  var enemy = maze[nx][ny];
  if(enemy.type==1){
    var damage = Math.floor(user.atk*(Math.random()+0.5));
    enemy.hp=enemy.hp-damage;
    if(enemy.hp<0){
      user.exp=user.exp+1;
      maze[x][y]=user;
      maze[nx][ny]={type:0,hp:0};
      callback(user._id+"消除了"+direction+"方的墙壁,经验值+1");
    }else{
      callback(user._id+"攻击"+direction+"方的墙壁,墙壁剩余HP："+enemy.hp);
    }
  }else if(enemy.type==2||enemy.type==3){
    var ret = battle(user,enemy);
    callback(ret);
  }
}

function move(direction,user,callback){
  var x = parseInt(user.x);
  var y = parseInt(user.y);
  var userName = user._id;
  var nx = x;
  var ny = y;
  if(direction=="U"){
    ny = ny + 1;
  }else if(direction=="D"){
    ny = ny - 1;
  }else if(direction=="L"){
    nx = nx - 1;
  }else if(direction=="R"){
    nx = nx + 1;
  }
  if(nx<0||nx>width||ny<0||ny>height){
    callback('在走就出界啦!');
    return;
  }
  if(maze[nx][ny].type!=0){
    callback('前面没有路,不能往前走啦!');
    return;
  }
  user.x=nx;
  user.y=ny;
  maze[nx][ny]=user;
  maze[x][y].type=0;
  userMap[userName]=[nx,ny];
  var ret = userName+"向"+direction+"走了一步\n";
  ret = ret + getMapInfo(nx,ny,user.sight);
  callback(ret);
}


function getUserNameByUin(fromuin,members){
  for (let i = 0; i < members.length; i++) {
    if (fromuin == members[i].uin) {
      from = members[i].nick;
      return from;
    }
  }
}

function getMazeUserInfo(fromuin,content,members,callback) {
  content = content.trim();
  var userName;
  var tom = {};
  var from;
  for (let i = 0; i < members.length; i++) {
    if (fromuin == members[i].uin) {
      from = members[i].nick;
    }
    if (members[i].nick && members[i].nick.indexOf(content) >= 0) {
      tom[members[i].nick] = 1;
      continue;
    }
    if (members[i].card && members[i].card.indexOf(content) >= 0) {
      tom[members[i].nick] = 1;
      continue;
    }
  }
  var toa = Object.keys(tom);
  if (content.substring(0, 1).toUpperCase() == "B" && content.length == 2) {
    userName = content.toUpperCase();
  } else if (content == "") {
    userName = from;
  } else if (toa.length == 1) {
    userName = toa[0];
  } else {
    callback(content + '是谁？');
    return;
  }
  getUserInfoById(userName,callback);
}


function initUser(userName){
  var n = 1;
  while(n>0){
    x = Math.floor(Math.random()*width);
    y = Math.floor(Math.random()*height);
    sight = 4;
    if(maze[x][y].type==0){
      n--;
      user = {type:4,_id:userName,hp: 100, mp: 100, tp: 100, gold: 100,lv: 1,exp:0,sight:sight,
        str: 9, int: 9, agi: 9, atk:9, def:9, mag:9,luck:9,status:0,x:x,y:y};
      maze[x][y]=user;
      userMap[userName]=[x,y];
      return user;
    }
  }
}

function getUserInfoById(userName,callback){
  var x;
  var y;
  var user;
  console.log(userMap);
  if(userMap[userName]){
    x = userMap[userName][0];
    y = userMap[userName][1];
    user = maze[x][y];
  }else{
    user = initUser(userName);
    x = user.x;
    y = user.y;
  }
  var ret = "";
  var data = user;
  var statusstr;
  if(data.status==0){
    statusstr='普通';
  }else if(data.status==1){
    statusstr='死亡';
  }else if(data.status==2){
    statusstr='防御';
  }else if(data.status==3){
    statusstr='攻击';
  }else if(data.status==4){
    statusstr='狂怒';
  }
  var ret = data._id + "\n";
  ret = ret + "hp:" + data.hp + "   mp:" + data.mp + "\n";
  ret = ret + "lv:" + data.lv + "   exp:" + data.exp + "/"+(data.lv*100-50)+"\n";
  ret = ret + "atk:" + data.atk + "   def:" + data.def + "\n";
  ret = ret + "luck:" + data.luck + "   agi:" + data.agi + "\n";
  ret = ret + "gold:" + data.gold + "   status:" + statusstr + "\n";
  ret = ret + getMapInfo(parseInt(x),parseInt(y),parseInt(user.sight));
  callback(ret);
}

function getMapInfo(x,y,sight){
  var leftx = x>sight?(x-sight):0;
  var rightx = (x+sight<width)?(x+sight):width;
  var downy = y>sight?(y-sight):0;
  var upy = (y+sight<height)?(y+sight):height;
  var ret = "";
  for(var j=upy-1;j>=downy;j--){
    for(var i=leftx;i<rightx;i++){
      var type = maze[i][j].type;
      if(x==i&&y==j){
        ret = ret + "●";
      }else if(type==0){
        ret = ret + "○";
      }else if(type==1){
        ret = ret + "╳";
      }else if(type==2){
        ret = ret + "□";
      }else if(type==3){
        ret = ret + "△";
      }else if(type==4){
        ret = ret + "◎";
      }
    }
    ret = ret + "\n";
  }
  ret = ret + "●:自己,○:道路,╳:墙壁,□:小怪,△:大怪,◎:其他玩家";
  return ret.trim();
}


function moveuser(user){
  var n = 1;
  while(n>0){
    x = Math.floor(Math.random()*width);
    y = Math.floor(Math.random()*height);
    if(maze[x][y].type==0){
      n--;
      maze[x][y]=user;
      userMap[userName]=[x,y];
      return user;
    }
  }
}



function handleDeath(data2,data1){
  var ret = "";
  data1.gold=data1.gold+data2.gold;
  maze[data1.x][data1.y]=data1;
  if(data2.type==4){
    if(data2.exp>=100){
      data1.exp=data1.exp+100;
      ret = ret + data2._id+"用100经验值保护了自己\n";
      data2.exp=data2.exp-100;
      moveuser(data2);
    }else{
      data1.exp=data1.exp+data2.exp;
      maze[data2.x][data2.y]={type:0,hp:0};
      delete(userMap[data2._id]);
    }
  }
  if(data2.type==2){
    insertMonsters(1)
    data1.exp=data1.exp+data2.exp;
    maze[data2.x][data2.y]={type:0,hp:0};
  }
  if(data2.type==3){
    insertBoss(1)
    data1.exp=data1.exp+data2.exp;
    maze[data2.x][data2.y]={type:0,hp:0};
  }
  ret = ret + data1._id+"获得"+data2._id+"的所有经验值和金钱";
  return ret;
}


function battle(data1,data2){
  var ret='';
  var damageAndStr = generateDamage(data1,data2,1,1);
  var damage = damageAndStr[0];
  var dmgstr = damageAndStr[1];
  ret = ret + dmgstr;
  if(damage>=data2.hp){
    ret = ret + data2._id+'被砍死了\n';
    ret = ret + handleDeath(data2,data1);
  }else{
    data2.hp=data2.hp-damage;
    var damageAndStr = generateDamage(data2,data1,2,1);
    var damage = damageAndStr[0];
    var dmgstr = damageAndStr[1];
    ret = ret + dmgstr;
    if(damage>=data1.hp){
      ret = ret + data1._id+'被砍死了';
      ret = ret + handleDeath(data1,data2);
    }else{
      data1.hp=data1.hp-damage;
      if(data1.agi>data2.agi*(Math.random()/2+1)){
        ret = ret + data1._id+'对'+data2._id+'发动了EX袭击\n';
        var rate = data1.agi/data2.agi-1;
        if(rate<0.5){
          rate = 0.5;
        }
        if(rate>2){
          rate = 2;
        }
        var damageAndStr = generateDamage(data1,data2,1,rate);
        var damage = damageAndStr[0];
        var dmgstr = damageAndStr[1];
        ret = ret + dmgstr;
        if(damage>=data2.hp){
          ret = ret + data2._id+'被砍死了\n';
          ret = ret + handleDeath(data2,data1);
        }else {
          data2.hp = data2.hp - damage;
        }
      }else{
        ret = ret + "ex袭击未发生";
      }
    }
  }
  return ret;
}

function generateDamage(data1,data2,type,rate2){
  if(data1.status==1||data1.status==2){
    var damage = 0;
    var str = data1._id+'砍向'+data2._id+',造成'+damage+'点伤害\n';
    return [damage,str];
  }else{
    var critical = Math.random()*100<data1.luck;
    var criticalrate = 1;
    if(critical){
      criticalrate = 2.5;
      if(type==2){
        criticalrate=1.5;
      }
    }
    var atk = data1.atk*(criticalrate)*(Math.random()+0.5);
    var def = data2.def*(Math.random()*0.5+0.5);
    if(data2.status==2){
      def = def * 2;
    }
    if(data1.status==3){
      atk = atk * 2;
    }
    if(critical){
      atk = atk + data2.def;
    }
    var rate = (80 + data1.lv+(data1.hp<200?data1.hp:200))/2;
    if(type==2){
      rate = rate * 0.8;
    }
    var damage = 0;
    if(atk<=def){
      damage = data2.hp*Math.random()*0.08;
    }else{
      damage = (atk-def)*rate/100;
    }
    if(Math.random()*100>data1.lv+80){
      damage = 0;
    }
    damage = Math.floor(damage*rate2);
    var str = data1._id+'砍向'+data2._id+'\n'+(critical?'会心一击!':'')+'造成'+damage+'点伤害\n';
    return [damage,str];
  }
}

module.exports={
  handleUserOperation
}





































