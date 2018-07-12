const {banUserInGroup} = require('../cq/cache');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';


var memory={};
function replayReply(content,userName,groupuin,callback,qq){
  content=content.trim();
  if(memory[groupuin]){
    var lst = memory[groupuin];
    var lastcontent = lst.l;
    if(content==lastcontent){
      var um = lst.m;
      var c = lst.c;
      var list = lst.lx;
      list.push(qq);
      if(!um){
        if(c>0.9+Math.random()*3){
          memory[groupuin]={l:content,c:c+1,m:true,lx:list};
          callback(content,true);
        }else{
          memory[groupuin]={l:content,c:c+1,m:um,lx:list};
        }
      }else{
        memory[groupuin]={l:content,c:c+1,m:um,lx:list};
      }
      console.log("c:"+c);
      if(list.length>3+Math.random()*3){
        var time = 200+Math.floor(Math.random()*200);
        var banqq = list[Math.floor(list.length*Math.random()-1)+1];
        callback('发现大量复读姬出没！\n下面百百要选择一名复读姬塞上口球\n到底是哪位小朋友这么幸运呢？\n就决定是你了[CQ:at,qq='+banqq+']');
        banUserInGroup(banqq,groupuin,time);
        memory[groupuin].lx=[banqq];
        var uban = Math.floor(Math.random()*time*1000);
        //var realbandur = time*1000-uban;
        saveBan(qq,groupuin,uban,callback);
        setTimeout(function(){
          banUserInGroup(banqq,groupuin,0);
        },uban)
      }
    }else{
      memory[groupuin]={l:content,c:1,m:false,lx:[qq]};
    }
  }else{
    memory[groupuin]={l:content,c:1,m:false,lx:[qq]}
  }
}

function saveBan(qq,gid,dur,callback){
  console.log('ban:'+qq+':in:'+gid+':dur:'+dur);
  MongoClient.connect(mongourl, function(err, db) {
    var now = new Date();
    var cl_replay_ban = db.collection('cl_replay_ban');
    var d = {'_id':now,qq:qq,dur:dur,gid:gid};
    cl_replay_ban.save(d,function(){
      var query = {'_id':{'$gt':new Date(new Date().getTime()-86400000)},gid:gid,qq:qq};
      cl_replay_ban.count(query,function(err,count){
        if(count>2){
          setTimeout(function(){
            var time = 0;
            for(var i=0;i<count;i++){
              time = time + 200+Math.floor(Math.random()*200);
            }
            callback('[CQ:at,qq='+qq+']本日已被口球'+count+'次,将额外塞'+count+'个口球封住他的嘴');
            cban(qq,gid,count,callback);
          },dur+1000);
        }
      });
    });
  })
}

function cban(banqq,gid,c,callback){
  if(c<=0){
    return;
  }
  var time = 200 + Math.floor(Math.random() * 200);
  banUserInGroup(banqq, gid, time);
  var uban = Math.floor(Math.random() * time * 1000);
  console.log(banqq+'next:'+uban);
  setTimeout(function () {
    banUserInGroup(banqq, gid, 0);
    setTimeout(function(){
      callback('剩余'+c+'个口球正在飞往'+'[CQ:at,qq='+qq+']的嘴中');
      cban(banqq,gid,c-1,callback)
    },1234);
  }, uban)
}


module.exports={
  replayReply
}