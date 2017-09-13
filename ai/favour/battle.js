var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

var tmpfight = {};
function fight(fromuin,content,members,callback){
  var from;
  var to;
  content=content.trim();
  if(content.substring(0,1)==1&&content.length==2){
    var tmp = tmpfight[fromuin];
    var no = content.substring(1);
    if(tmp){
      var from=tmp.f;
      var to = tmp[no];
      if(from&&to){
        fightUser(from,to,callback)
      }
    }else{
      callback(from+'砍向了'+'空气'+',造成'+Math.floor(Math.random()*100-50)+'点伤害');
    }
    return;
  }
  var toa=[];
  for(let i=0;i<members.length;i++){
    if(fromuin==members[i].uin){
      from = members[i].nick;
    }
    if(members[i].nick&&members[i].nick.indexOf(content)>=0){
      toa.push(members[i].nick);
      continue;
    }
    if(members[i].card&&members[i].card.indexOf(content)>=0){
      toa.push(members[i].nick);
      continue;
    }
  }
  if(toa.length==1&&from){
    to=toa[0];
    if(from&&to){
      fightUser(from,to,callback)
    }else{
      callback(content+'是谁？'+from+'砍向了'+content+',造成'+Math.floor(Math.random()*1999999-999999)+'点伤害');
    }
  }else{
    if(toa.length>9){
      callback(from+'砍向了'+'空气'+',造成'+Math.floor(Math.random()*1000-500)+'点伤害');
    }else{
      var ret = "请选择：\n";
      tmpfight[fromuin]={f:from};
      for(var i=0;i<toa.length;i++){
        ret = ret + '`f1'+i+' | '+toa[i]+'\n';
        tmpfight[fromuin][i]=toa[i]
      }
      callback(ret.trim());
    }
  }
}

function fightUser(from,to,callback){
  if(from==to){
    callback(from+'自杀了');
    return;
  }
  MongoClient.connect(mongourl, function(err, db) {
    var cl_user = db.collection('cl_user');
    var query = {'_id':from};
    cl_user.findOne(query, function(err, data) {
      if (data) {

      } else {
        init = {'_id': from, hp: 100, mp: 100, tp: 100, gold: 100,lv: 1,exp:0,
           str: 9, int: 9, agi: 9, atk:9, def:9, mag:9,luck:9,status:0,
          love: 0}
        data = init;
      }
      var mpcost = 20;
      if(data.status==3){
        mpcost = 50;
      }
      if(data.mp<mpcost){
        callback(from+'mp不足,无法发动攻击');
      }else if(data.status==1){
        callback(from+'死了也想砍'+to+',但砍到了自己,受到'+Math.floor(Math.random()*10000-5000)+'点伤害');
      }else{
        data.mp=data.mp-mpcost;
        var q2 = {'_id':to};
        cl_user.findOne(q2,function(err, data2) {
          if (data2) {

          } else {
            init = {'_id': to, hp: 100, mp: 100, tp: 100, gold: 100,lv: 1,exp:0,
              str: 9, int: 9, agi: 9, atk:9, def:9, mag:9,luck:9,status:0,
              love: 0}
            data2 = init;
          }
          if(data2.status==1){
            callback(from+'想鞭尸'+to+',但砍到了自己,受到'+Math.floor(Math.random()*100000-50000)+'点伤害');
          }else{
            var ret = battle(data,data2,db);
            callback(ret);
          }
        })
      }

    });
  });
}

function battle(data1,data2,db){
  var ret='';
  var damage = generateDamage(data1,data2);
  ret = ret + data1._id+'对'+data2._id+'造成'+damage+'点伤害,获得'+damage+'点经验\n';
  data1.exp=data1.exp+damage;
  if(damage>data2.hp){
    data2.status=1;
    data2.hp=100;
    ret = ret + data2._id+'被砍死了,稍后复活\n'+data1._id+'获得'+(data2.gold/2)+'金钱';
    data1.gold=data1.gold+Math.floor(data2.gold/2);
    data2.gold=data2.gold-Math.floor(data2.gold/2);
  }else{
    data2.hp=data2.hp-damage;
    damage = generateDamage(data2,data1);
    data2.exp=data2.exp+damage;
    ret = ret + data2._id+'对'+data1._id+'造成'+damage+'点伤害,获得'+damage+'点经验\n';
    if(damage>data1.hp){
      data1.status=1;
      data1.hp=100;
      ret = ret + data1._id+'被砍死了,稍后复活\n'+data2._id+'获得'+(data1.gold/2)+'金钱';
      data2.gold=data2.gold+Math.floor(data1.gold/2);
      data1.gold=data1.gold-Math.floor(data1.gold/2);
    }else{
      data1.hp=data1.hp-damage;
    }
  }
  var cl_user = db.collection('cl_user');
  cl_user.save(data1);
  cl_user.save(data2);
  return ret;
}

function generateDamage(data1,data2){
  if(data1.status!=0){
    return 0;
  }else{
    var atk = data1.atk*(Math.random()*100<data1.luck?3:1)*(Math.random()+0.5);
    var def = data2.def*(Math.random()*0.5+0.5);
    if(data2.status==2){
      def = def * 2;
    }
    if(data1.status==3){
      atk = atk * 2;
    }
    var rate = 100+(data1.hp<100?data1.hp:100);
    var damage = 0;
    if(atk<=def){
      damage = data2.hp*Math.random()*0.05;
    }else{
      damage = (atk-def)*rate/100;
    }
    damage = Math.floor(damage);
    return damage;
  }
}

function getUserInfo(fromuin,content,members,callback){
  var userName;
  if(content==""){
    for(let i=0;i<members.length;i++){
      if(fromuin==members[i].uin){
        userName = members[i].nick;
        break;
      }
    }
  }else{
    userName=content;
  }
  MongoClient.connect(mongourl, function(err, db) {
    var cl_user = db.collection('cl_user');
    var query = {'_id': userName};
    cl_user.findOne(query, function (err, data) {
      if (data) {
        var statusstr = data.status==0?'普通':(data.status==1?'死亡':'防御')
        var ret = data._id + "\n";
        ret = ret + "hp:" + data.hp + "   mp:" + data.mp + "\n";
        ret = ret + "lv:" + data.lv + "   exp:" + data.exp + "\n";
        ret = ret + "atk:" + data.atk + "   def:" + data.def + "\n";
        ret = ret + "luck:" + data.luck + "   status:" + statusstr + "\n";
        ret = ret + "gold:" + data.gold + "\n";
        callback(ret);
      } else {
        callback(content + '是谁？');
      }
    });
  });
}

function useMagicOrItem(fromuin,content,members,callback){
  if(content==""){
    ret = "`g0:查询个人状态,`g0+名字:查询该人物状态\n";
    ret = ret + " `g1:回复魔法(消耗50MP,回复100HP)\n";
    ret = ret + " `g2:转换为防御状态(防御力2倍,不能自然回复HP和MP)\n";
    ret = ret + " `g3:购买MP药水(消耗50金钱,回复100MP)\n";
    ret = ret + " `g4:转换为普通状态\n";
    ret = ret + " `g5:升级,消耗100点经验,ATK/DEF/LUCK一定概率+1\n";
    ret = ret + " `g6:转换为攻击状态(攻击力2倍,每次攻击消耗50点MP)\n";
    callback(ret);
  }else if(content.substring(0,1)==0){
    getUserInfo(fromuin,content.substring(1).trim(),members,callback);
  }else{
    var userName;
    for (let i = 0; i < members.length; i++) {
      if (fromuin == members[i].uin) {
        userName = members[i].nick;
        break;
      }
    }
    MongoClient.connect(mongourl, function(err, db) {
      var cl_user = db.collection('cl_user');
      var query = {'_id': userName};
      cl_user.findOne(query, function (err, data) {
        if (data) {

        } else {
          init = {
            '_id': from, hp: 100, mp: 100, tp: 100, gold: 100, lv: 1, exp: 0,
            str: 9, int: 9, agi: 9, atk: 9, def: 9, mag: 9, luck: 9, status: 0,
            love: 0
          }
          data = init;
        }
        if(content==1){
          if(data.mp>=50){
            data.mp=data.mp-50;
            data.hp=data.hp+100;
            callback(userName+'使用了回复魔法回复了100点HP');
          }
        }else if(content==3){
          if(data.gold>=50){
            data.gold=data.gold-50;
            data.mp=data.mp+100;
            callback(userName+'使用了魔法药水回复了100点MP');
          }
        }else if(content==2){
          if(data.status!=1){
            data.status=2;
            callback(userName+'转换为防御状态');
          }
        }else if(content==4){
          if(data.status!=1){
            data.status=0;
            callback(userName+'转换为普通状态');
          }
        }}else if(content==6){
        if(data.status!=1){
          data.status=3;
          callback(userName+'转换为攻击状态');
        }
      }else if(content==5){
          if(data.exp>100){
            if(data.lv<20){
              data.lv=data.lv+1;
              data.exp=data.exp-100;
              var ret = "";
              if(Math.random()<0.5){
                data.atk=data.atk+1;
                ret = ret + ",atk+1"
              }
              if(Math.random()<0.5){
                data.def=data.def+1;
                ret = ret + ",def+1";
              }
              if(Math.random()<0.5){
                data.luck=data.luck+1;
                ret = ret + ",luck+1";
              }
              callback(userName+'升级到'+data.lv+'级,'+ret.substring(1))
            }else{
              callback(userName+'不能在升级了,请转生后在升级');
            }
          }else{
            callback(userName+'经验不足,不能升级');
          }
        }
        cl_user.save(data);
      });
    });
  }
}

var timer = 0;
function regenTimer(){
  var left = 3600000 - new Date().getTime()%3600000
  if(timer==0){
    timer = 1;
    setTimeout(function(){
      regen();
      setTimeout(function () {
        timer = 0;
        regenTimer();
      },10000);
    },left)
  }
}

function regen(){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_user = db.collection('cl_user');
    var query = {};
    cl_user.find().toArray(function(err, userArr) {
      for(var i=0;i<userArr.length;i++){
        var u = userArr[i];
        if(u.status==0){
          var update = false;
          if(u.hp<100){
            u.hp=u.hp+5;
            update = true;
          }
          if(u.mp<100){
            u.mp=u.mp+50;
            update = true;
          }
          if(u.gold<100){
            u.gold=u.gold+5;
            update = true;
          }
          if(update){
            cl_user.save(u);
          }
        }
        if(u.status==1){
          u.status=0;
          cl_user.save(u);
        }
      }
    });
  });
}

module.exports={
  fight,
  useMagicOrItem,
  regenTimer
}