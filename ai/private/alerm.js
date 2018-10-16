var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var path = require('path');
var request = require("request");
var fs = require('fs');
var http = require('http');

var udb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
    alermTimer();
  });
}

function saveAlarm(content,userid,callback){
  content=content.toLowerCase().trim();
  var future;
  var p1 = content.indexOf("\n")
  var p2 = content.indexOf(" ");
  var alarmcontent = "百百提醒\n";
  if(p1>0){
    alarmcontent = alarmcontent+content.substring(p1+1).trim();
    content=content.substring(0,p1);
  }else if(p2>0){
    alarmcontent = alarmcontent+content.substring(p2+1).trim();
    content=content.substring(0,p2);
  }
  var after = 0;
  var n1 = content.indexOf("h");
  var n3 = content.indexOf("m");
  if(n1>0){
    var num = content.substring(0,n1);
    var hours = parseInt(num);
    var s1 = content.substring(n1+1)
    var n2 = s1.indexOf("m");
    var minutes = 0;
    if(n2>=0){
      var m = s1.substring(0,n2);
      minutes = parseInt(m);
    }
    after = hours*3600000+minutes*60000;
    future = new Date(new Date().getTime()+after);
  }else if(n3>0){
    var num = content.substring(0,n3);
    var minutes = parseInt(num);
    after = minutes*60000;
    future = new Date(new Date().getTime()+after);
  }else{
    return false;
  }
  var cl_alerm_user = udb.collection('cl_alerm_user');
  cl_alerm_user.save({qq:userid,f:future,d:alarmcontent,ts:new Date()});
  callback('百百将于'+new Date(future).toLocaleString()+'\n'+alarmcontent);
  setTimeout(function(){
    alermUser(userid,alarmcontent);
  },after)
  return true;
}

function alermTimer(){
  var cl_alerm_user = udb.collection('cl_alerm_user');
  cl_alerm_user.find({f:{'$gt':new Date()}}).toArray(function(err, result) {
    for(var i=0;i<result.length;i++){
      var alermData = result[i];
      console.log(alermData);
      var timeleft = alermData.f.getTime()-new Date().getTime();
      setTimeout(function(){
        alermUserShake(alermData.qq)
        alermUser(alermData.qq,alermData.d)
      },timeleft)
    }
  })
}

function alermUserShake(qq){
  var options = {
    host: '192.168.17.52',
    port: 23334,
    path: '/send_private_msg?user_id='+qq+'&message='+encodeURIComponent('[CQ:shake]'),
    method: 'GET',
    headers: {

    }
  };
  console.log("alerms:"+qq+":");
  var req = http.request(options);
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function alermUser(qq,content){
  var options = {
    host: '192.168.17.52',
    port: 23334,
    path: '/send_private_msg?user_id='+qq+'&message='+encodeURIComponent(content),
    method: 'GET',
    headers: {

    }
  };
  console.log("alerm:"+qq+":"+content);
  var req = http.request(options);
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}


module.exports={
  saveAlarm
}

