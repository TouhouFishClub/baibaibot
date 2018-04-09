var https=require('https');
var http = require('http');
var cache = {};
var namecache = {};
function getUserNameInGroup(qq,gid){
  if(cache[gid]){
    return getUserNameInGroupByCache(cache[gid],qq);
  }else{
    var options = {
      host: '192.168.17.52',
      port: 23334,
      path: '/get_group_member_list?group_id='+gid,
      method: 'GET',
      headers: {

      }
    };
    console.log(options)
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        var data = eval('('+resdata+')');
        var arr = {};
        var namearr = {};
        for(var i=0;i<data.data.length;i++){
          var user = data.data[i];
          var uid = user.user_id;
          arr[uid]=user;
          namearr[user.card?user.card:user.nickname]=uid;
        }
        cache[gid] = arr;
        namecache[gid]=namearr;
        getUserNameInGroupByCache(data,qq);
      });
    });
    req.end();
  }
}


function getUserNameInGroupByCache(data,qq){
  if(data){
    if(data[qq]){
      var card = data[qq].card;
      var nick = data[qq].nickname;
      if(card==""){
        return nick;
      }else{
        return card;
      }
    }
  }
  return 'card error:'+qq;
}

function getUserNickInGroupByCache(qq,groupid){
  if(cache[groupid]){
    if(cache[groupid][qq]){
      var card = cache[groupid][qq].card;
      var nick = cache[groupid][qq].nickname;
      return nick;
    }
  }
  return 'nick error:'+qq;
}

var gcache = {};
function getGroupName(gid){
  if(gcache[gid]){
    return gcache[gid].group_name;
  }else{
    var options = {
      host: '192.168.17.52',
      port: 23334,
      path: '/get_group_list',
      method: 'GET',
      headers: {

      }
    };
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        var data = eval('('+resdata+')');
        for(var i=0;i<data.data.length;i++){
          var group = data.data[i];
          var groupid = group.group_id;
          gcache[groupid]=group;
        }
        return gcache[gid].group_name;
      });
    });
    req.end();
  }
}


function sendPrivateMsg(userid,msg){
  var options = {
    host: '192.168.17.52',
    port: 23334,
    path: '/send_private_msg?user_id='+userid+'&message='+encodeURIComponent(msg),
    method: 'GET',
    headers: {

    }
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {

    });
  });
  req.end();
}

function banUserInGroup(qq,groupid,seconds){
  var options = {
    host: '192.168.17.52',
    port: 23334,
    path: '/set_group_ban?group_id='+groupid+'&user_id='+qq+'&duration='+seconds,
    method: 'GET',
    headers: {

    }
  };
  console.log(options);
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {

    });
    res.on('error', function () {

    });
  });
  req.end();
}

function banUserRandom(qq,groupid){
  if(cache[groupid]){
    var time = Math.random()*10000;
    if(Math.random()<0.5){
      banUserInGroup(qq,groupid,time);
      setTimeout(function(){
        banUserInGroup(qq,groupid,0);
      },time+2345);
    }else{
      var keys = Object.keys(cache[groupid]);
      var userqq = cache[groupid][keys[Math.floor(Math.random()*keys.length)];
      banUserInGroup(userqq,groupid,time);
      setTimeout(function(){
        banUserInGroup(userqq,groupid,0);
      },time+2345);
    }
  }
}


function banUserByName(name,groupid,seconds){

}


module.exports={
  getUserNameInGroup,
  getUserNickInGroupByCache,
  getGroupName,
  banUserInGroup,
  banUserByName,
  banUserRandom,
  sendPrivateMsg
}