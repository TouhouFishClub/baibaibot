var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

function fight(fromuin,content,members,callback){
  var from;
  var to;
  for(let i=0;i<members.length;i++){
    if(fromuin==members[i].uin){
      from = members[i].nick;
      if(to){
        break;
      }
    }
    if(content==members[i].nick){
      to = content;
      if(from){
        break;
      }
    }
  }
  if(from&&to){
    fightUser(from,to,callback)
  }else{
    callback(content+'是谁？'+from+'砍向了'+content+',造成'+Math.floor(Math.random()*1999999-999999)+'点伤害');
  }
}

function fightUser(from,to,callback){
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
      if(data.mp<20){
        callback('mp不足,无法发动攻击');
      }else{
        data.mp=data.mp-20;
        var q2 = {'_id':to};
        cl_user.findOne(q2,function(err, data2) {
          if (data2) {

          } else {
            init = {'_id': to, hp: 100, mp: 100, tp: 100, gold: 100,lv: 1,exp:0,
              str: 9, int: 9, agi: 9, atk:9, def:9, mag:9,luck:9,status:0,
              love: 0}
            data2 = init;
          }
          var ret = battle(data,data2,db);
          callback(ret);
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
    data1.gold=data1.gold+Math.floor(data2.gold/2);
    data2.gold=data2.gold-Math.floor(data2.gold/2);
    ret = ret + data2._id+'被砍死了,'+data1._id+'获得'+(data2.gold/2)+'金钱';
  }else{
    data2.hp=data2.hp-damage;
    damage = generateDamage(data2,data1);
    data2.exp=data2.exp+damage;
    ret = ret + data2._id+'对'+data1._id+'造成'+damage+'点伤害,获得'+damage+'点经验\n';
    if(damage>data1.hp){
      data1.status=1;
      data1.hp=100;
      data2.gold=data2.gold+Math.floor(data1.gold/2);
      data1.gold=data1.gold-Math.floor(data1.gold/2);
      ret = ret + data1._id+'被砍死了,'+data2._id+'获得'+(data1.gold/2)+'金钱';
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
    var atk = data1.atk*(Math.random()*100<data1.luck?3:1);
    var def = data2.def*(Math.random()*0.5+0.5);
    if(data2.status==2){
      def = def * 2;
    }
    var rate = data1.hp<100?data1.hp:100;
    var damage = 0;
    if(atk<def){
      damage = data2.hp*Math.random()*0.1;
    }else{
      damage = (atk-def)*rate/100;
    }
    damage = Math.floor(damage);
    return damage;
  }
}

module.exports={
  fight
}