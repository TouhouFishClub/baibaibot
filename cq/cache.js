var https=require('https');
var http = require('http');
var cache = {};
function getUserNameInGroup(qq,gid){
  if(cache[gid]){
    return getUserNameInGroupByCache(cache[gid],qq);
  }else{
    var options = {
      host: '192.168.17.52:23334',
      port: 80,
      path: '/get_group_member_list?group_id='+gid,
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
        var arr = {};
        for(var i=0;i<data.data.length;i++){
          var user = data.data[i];
          var uid = user.user_id;
          arr[uid]=user;
        }
        cache[gid] = arr;
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


module.exports={
  getUserNameInGroup
}