const {banUserInGroup,getUserRoleInGroupByCache} = require('../cq/cache');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';


var memory={};
function replayReply(content,userName,groupuin,callback,qq,port){
  if((groupuin+"").startsWith("63508")||
    (groupuin+"").startsWith("69738")){
    return;
  }
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

      var botrole = getUserRoleInGroupByCache(2375373419,groupuin);
      if(groupuin==205700800||groupuin==616147379||groupuin==964358164){
        botrole = 'admin';
      }
      if((botrole=='admin'||botrole=='owner')&&list.length>3+Math.random()*3){
        var time = 100+Math.floor(Math.random()*200);
        var banqq = list[Math.floor((list.length-1)*Math.random())+1];
        if(Math.random()<1){
          var delay = Math.floor(Math.random()*1000*120)+1000;
          var txt = '发现大量复读姬出没！\n下面百百要选择一名复读姬塞上口球\n到底是哪位小朋友这么幸运呢？\n就决定是你了[CQ:at,qq='+banqq+']\n';
          txt = txt + '口球将于'+Math.floor(delay/1000)+'秒后飞入[CQ:at,qq='+banqq+']的嘴里';
          callback(txt);
          setTimeout(function(){
            banUserInGroup(banqq,groupuin,time,port);
            memory[groupuin].lx=[banqq];
            var uban = Math.floor(Math.random()*time*1000);
            //var realbandur = time*1000-uban;
            saveBan(banqq,groupuin,uban,callback);
            setTimeout(function(){
              banUserInGroup(banqq,groupuin,0,port);
            },uban)
          },delay);
        }else{
          callback('发现大量复读姬出没！\n下面百百要选择一名复读姬黑了他\n到底是哪位小朋友这么幸运呢？\n就决定是你了[CQ:at,qq='+banqq+']');
          banUserInGroup(banqq,groupuin,time,port);
          memory[groupuin].lx=[banqq];
          var uban = Math.floor(Math.random()*time*1000);
          //var realbandur = time*1000-uban;
          saveBan(banqq,groupuin,uban,callback,port);
          setTimeout(function(){
            banUserInGroup(banqq,groupuin,0,port);
          },uban)
        }
      }
    }else{
      memory[groupuin]={l:content,c:1,m:false,lx:[qq]};
    }
  }else{
    memory[groupuin]={l:content,c:1,m:false,lx:[qq]}
  }
}

function saveBan(qq,gid,dur,callback,port){
  console.log('ban:'+qq+':in:'+gid+':dur:'+dur);
  MongoClient.connect(mongourl, function(err, db) {
    var now = new Date();
    var cl_replay_ban = db.collection('cl_replay_ban');
    var d = {'_id':now,qq:qq,dur:dur,gid:gid};
    cl_replay_ban.save(d,function(){
      var then = new Date();
      then.setHours(0);
      then.setMinutes(0);
      then.setSeconds(0);
      then.setMilliseconds(1);
      var query = {'_id':{'$gt':then},gid:gid,qq:qq};
      cl_replay_ban.count(query,function(err,count){
        if(err){
          console.log('mongo errora:!!!!!!!!!');
          console.log(err);
        }else {
          if (count > 2) {
            console.log('next:' + dur);
            setTimeout(function () {
              var time = 0;
              for (var i = 0; i < count; i++) {
                time = time + 200 + Math.floor(Math.random() * 200);
              }
              callback('[CQ:at,qq=' + qq + ']本日已被口球' + count + '次,将额外塞' + count + '个口球封住他的嘴');
              cban(qq, gid, count - 1, callback,port);
            }, dur + 1000);
          }
        }
      });
    });
  })
}

function cban(banqq,gid,c,callback,port){
  var time = 100 + Math.floor(Math.random() * (20000/(c*10+100)));
  banUserInGroup(banqq, gid, time,port);
  var uban = Math.floor(Math.random() * time * 1000);
  console.log(banqq+'next:'+uban+":"+c);
  if(c<=0){
    return;
  }
  setTimeout(function () {
    var nextban = Math.floor(Math.random()*60000+10000);
    console.log('nextban:'+nextban)
    banUserInGroup(banqq, gid, 0,port);
    if(Math.random()*c>1.5){
      c = c - 1;
      callback('[CQ:at,qq='+banqq+']竟然吞掉了一个口球,为他鼓掌！');
    }
    setTimeout(function(){
      callback('剩余'+c+'个口球正在飞往'+'[CQ:at,qq='+banqq+']的嘴中');
      cban(banqq,gid,c-1,callback)
    },nextban);
  }, uban)
}


module.exports={
  replayReply,
  saveBan
}