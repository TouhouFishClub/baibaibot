var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

var tmpfight = {};
var limitFight = {};
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
  var tom={};
  for(let i=0;i<members.length;i++){
    if(fromuin==members[i].uin){
      from = members[i].nick;
    }
    if(members[i].nick&&members[i].nick.indexOf(content)>=0){
      tom[members[i].nick]=1;
      continue;
    }
    if(members[i].card&&members[i].card.indexOf(content)>=0){
      tom[members[i].nick]=1;
      continue;
    }
  }
  if(content.substring(0,1).toUpperCase()=="B"&&content.length==2){
    to = content.toUpperCase();
    fightUser(from,to,callback);
    return;
  }
  var toa=Object.keys(tom);
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
  var now = new Date();
  var then = limitFight[from];
  if(!then){
    then = {ts:0,c:0};
  }
  var thents = then.ts;
  var thenc = then.c;
  var tsnew;
  var cnew;
  if(now.getTime()-thents>300000){
    tsnew = now.getTime();
    cnew = 1;
  }else{
    tsnew = thents;
    cnew = thenc+1;
  }
  if(cnew>5){
    callback(from+'疲劳中无法攻击,恢复时间：'+new Date(tsnew+300000).toLocaleString());
    return;
  }
  limitFight[from]={ts:tsnew,c:cnew};
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


const {battlePlusBeforeDamage,battlePlusAfterDamage} = require('./job');
function battle(data1,data2,db){
  var ret='';
  var damageAndStr = generateDamage(data1,data2,1);
  var damage = damageAndStr[0];
  var dmgstr = damageAndStr[1];
  ret = ret + dmgstr;
  data1.exp=data1.exp+damage;
  if(damage>data2.hp){
    data2.status=1;
    if(data2._id=="B1"){
      data2.hp=999+data2.lv*50;
      data2.atk=data2.lv*4+30;
      data2.lv=data2.lv+1;
    }else{
      data2.hp=100;
    }
    ret = ret + data2._id+'被砍死了,失去'+(data2.gold/2)+'金钱,稍后复活\n'+data1._id+'获得'+(15+data2.gold/2)+'金钱';
    data1.gold=data1.gold+Math.floor(15+data2.gold/2);
    data2.gold=data2.gold-Math.floor(data2.gold/2);
  }else{
    data2.hp=data2.hp-damage;
    var damageAndStr = generateDamage(data2,data1,2);
    var damage = damageAndStr[0];
    var dmgstr = damageAndStr[1];
    data2.exp=data2.exp+damage;
    ret = ret + dmgstr;
    if(damage>data1.hp){
      data1.status=1;
      data1.hp=100;
      ret = ret + data1._id+'被砍死了失去'+(data1.gold/2)+'金钱,稍后复活\n'+data2._id+'获得'+(15+data1.gold/2)+'金钱';
      data2.gold=data2.gold+Math.floor(15+data1.gold/2);
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

function generateDamage(data1,data2,type){
  if(data1.status==1||data1.status==2){
    var damage = 0;
    var str = data1._id+'砍向'+data2._id+',造成'+damage+'点伤害,获得'+damage+'点经验\n';
    return [damage,str];
  }else{
    console.log(data1,data2)
    var critical = Math.random()*100<data1.luck;
    if(type==2){
      critical=false;
    }
    var criticalrate = 1;
    if(critical){
      criticalrate = 2.5;
    }
    var atk = data1.atk*(criticalrate)*(Math.random()+0.5);
    var def = data2.def*(Math.random()*0.5+0.5);
    if(data2.status==2){
      def = def * 2;
    }
    if(data1.status==3){
      atk = atk * 2;
    }
    var rate = (80 + data1.lv+(data1.hp<200?data1.hp:200))/2;
    if(type==2){
      rate = rate / 2;
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
    damage = Math.floor(damage);
    var str = data1._id+'砍向'+data2._id+',造成'+damage+'点伤害,获得'+damage+'点经验\n';
    console.log(damage,str);
    return [damage,str];
  }
}

function getUserInfo(fromuin,content,members,callback){
  content=content.trim();
  var userName;
  var tom={};
  var from;
  for(let i=0;i<members.length;i++){
    if(fromuin==members[i].uin){
      from = members[i].nick;
    }
    if(members[i].nick&&members[i].nick.indexOf(content)>=0){
      tom[members[i].nick]=1;
      continue;
    }
    if(members[i].card&&members[i].card.indexOf(content)>=0){
      tom[members[i].nick]=1;
      continue;
    }
  }
  var toa=Object.keys(tom);
  if(content.substring(0,1).toUpperCase()=="B"&&content.length==2){
    userName = content.toUpperCase();
  }else if(content==""){
    userName=from;
  }else if(toa.length==1){
    userName=toa[0];
  }else{
    callback(content + '是谁？');
    return;
  }
  MongoClient.connect(mongourl, function(err, db) {
    var cl_user = db.collection('cl_user');
    var query = {'_id': userName};
    cl_user.findOne(query, function (err, data) {
      if (data) {
        var statusstr;
        if(data.status==0){
          statusstr='普通';
        }else if(data.status==1){
          statusstr='死亡';
        }else if(data.status==2){
          statusstr='防御';
        }else if(data.status==3){
          statusstr='攻击';
        }
        var ret = data._id + "\n";
        ret = ret + "hp:" + data.hp + "   mp:" + data.mp + "\n";
        ret = ret + "lv:" + data.lv + "   exp:" + data.exp + "/"+(50+data.lv*data.lv*data.lv)+"\n";
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


var limitItem = {};
function useMagicOrItem(fromuin,content,members,callback){
  if(content==""){
    ret = "`f+要砍的人：攻击该玩家\n";
    ret = ret + " `g0:查询个人状态,`g0+名字:查询该人物状态\n";
    ret = ret + " `g1:回复魔法(消耗50MP,回复0-200点HP)\n";
    ret = ret + " `g2:转换为防御状态(防御力2倍)\n";
    ret = ret + " `g3:购买MP药水(消耗50金钱,回复20-150MP)\n";
    ret = ret + " `g4:转换为普通状态(自然回复HP/MP/GOLD为2倍)\n";
    ret = ret + " `g5:升级,消耗一定经验值,ATK/DEF/LUCK一定概率+1\n";
    ret = ret + " `g6:转换为攻击状态(攻击力2倍,每次攻击消耗50点MP)\n";
    ret = ret + " `g7:购买重生药水(消耗60金钱,重置等级和经验值)\n";
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
          var init = {
            '_id': from, hp: 100, mp: 100, tp: 100, gold: 100, lv: 1, exp: 0,
            str: 9, int: 9, agi: 9, atk: 9, def: 9, mag: 9, luck: 9, status: 0,
            love: 0
          }
          data = init;
        }
        if(content==1){
          var then = limitItem[fromuin];
          var now = new Date();
          if(!then){
            then = {i1:0,i3:0};
          }
          if(now.getTime()-then.i1<300000){
            then.i1 = now.getTime();
            limitItem[uin]=then;
            callback(userName+'的回复魔法CD中！回复时间：'+new Date(then.i1+300000).toLocaleString());
            return;
          }
          if(data.mp>=50){
            data.mp=data.mp-50;
            var addhp = Math.floor(20000/(100+data.hp))
            data.hp=data.hp+addhp;
            if(data.hp>data.lv*20+200){
              data.hp=data.lv*20+200;
              addhp = addhp + data.lv*20+200 - data.hp;
            }
            callback(userName+'使用了回复魔法回复了'+addhp+'点HP');
          }
        }else if(content==3){
          var then = limitItem[fromuin];
          var now = new Date();
          if(!then){
            then = {i1:0,i3:0};
          }
          if(now.getTime()-then.i3<300000){
            then.i3 = now.getTime();
            limitItem[uin]=then;
            callback(userName+'的回复魔法CD中！回复时间：'+new Date(then.i3+300000).toLocaleString());
            return;
          }
          if(data.gold>=50){
            data.gold=data.gold-50;
            var addmp = Math.floor(13000/(100+data.mp)+20*Math.random())
            data.mp=data.mp+addmp;
            if(data.mp>data.lv*20+200){
              data.mp=data.lv*20+200;
              addmp = addmp + data.lv*20+200 - data.mp;
            }
            callback(userName+'使用了魔法药水回复了'+addmp+'点MP');
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
        }else if(content==6){
          if(data.status!=1){
            data.status=3;
            callback(userName+'转换为攻击状态');
          }
        }else if(content==7){
          if(data.gold>60){
            var l = data.lv-1;
            data.exp=data.exp+l*50+l*l*(l+1)*(l+1)/4;
            data.gold=data.gold-60;
            data.lv=1;
            data.atk=9;
            data.def=9;
            data.luck=9;
            callback(userName+'获得了新生,等级降为1');
          }else{
            callback(userName+'金钱不足,无法获得新生');
          }
        }else if(content==5){
			//callback(userName+Level(data));
          if(data.exp>data.lv*data.lv*data.lv+50){
            if(data.lv<25){
              data.exp=data.exp-data.lv*data.lv*data.lv-50;
              data.lv=data.lv+1;
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
        var addrate = 1;
        if(u.status==0){
          addrate = 2;
        }
        var update = false;
        if(u.status==1){
          update = true;
          u.status=0;
		      if(u._id=="B1"){

            u.hp=999+u.lv*50;
            u.atk=u.lv*4+30;
            u.lv=u.lv+1;

		        u.gold=u.exp*3+99;
			      u.exp=0
    			}
        }
        if(u.hp<100){
          u.hp=u.hp+5*addrate;
          update = true;
        }
        if(u.mp<100){
          u.mp=u.mp+50*addrate;
          update = true;
        }
        if(u.gold<100){
          u.gold=u.gold+5*addrate;
          update = true;
        }
        if(update){
          cl_user.save(u);
        }
      }
    });
  });
}

function fixUser(){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_user = db.collection('cl_user');
    cl_user.find().toArray(function(err, userArr) {
      for(var i=0;i<userArr.length;i++){
        var u = userArr[i];
        var update = false;
        if(u.lv>1){
          u.atk=9;
          u.def=9;
          u.luck=9;
          u.exp=u.exp+u.lv*100-100;
          cl_user.save(u);
        }
      }
    });
  });
}

module.exports={
  fight,
  useMagicOrItem,
  regenTimer,
  fixUser,
  regen
}
