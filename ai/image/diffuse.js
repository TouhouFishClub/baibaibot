var fs = require('fs');
var request = require('request');
const {secret} = require("../../secret");
var apikey = secret.u2;

function diffuseReply(content,gid,qq,callback){
  content = content.trim()
  var url = 'https://api.replicate.com/v1/predictions'
  var body1 = '{"version": "a9758cbfbd5f3c2094457d996681af52552901775aa2d6dd0b17fd15df959bef", "input": {"prompt": "'+content+'"}}';
  request({
    url: url,
    method: "POST",
    proxy:'http://192.168.17.241:2346',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'Authorization': 'Token '+apikey,
      'Content-Type':'application/json'
    },
    body:body1
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      // resbody = imgurl;
      // var now = new Date().getTime();
      // var filename = "../coolq-data/cq/data/image/send/diffuse/" + now+"_"+content;
      // var imgreq = request({
      //   url: imgurl,
      //   method: "GET"
      // }, function (error, response, body) {
      //   if (error && error.code) {
      //     console.log('pipe error catched!')
      //     console.log(error);
      //   }
      // }).pipe(fs.createWriteStream(filename));
      // imgreq.on('close', function () {
      //
      // });

      var d1 = eval('(' + resbody + ')');
      var geturl = d1.urls.get;
      console.log(geturl);
      setTimeout(function(){
        request({
          url: geturl,
          method: "GET",
          proxy: 'http://192.168.17.241:2346',
          headers: {
            'Authorization': 'Token '+apikey,
            'Content-Type': 'application/json'
          },
        }, function (error, response, resbody2) {
          if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
          } else {
            console.log(resbody2);
            var d2 = eval('(' + resbody2 + ')');
            if(d2.output&&d2.output[0]){
              var imgurl = d2.output[0];

              var now = new Date().getTime();
              var filename = "../coolq-data/cq/data/image/send/diffuse/" + now+"_"+content;
              var imgreq = request({
                url: imgurl,
                method: "GET",
                proxy: 'http://192.168.17.241:2346',
              }, function (error, response, body) {
                if (error && error.code) {
                  console.log('pipe error catched!')
                  console.log(error);
                }
              }).pipe(fs.createWriteStream(filename));
              imgreq.on('close', function () {
                var ret = '[CQ:'+'image'+',file=send/diffuse/' + now+"_"+content + ']';
                callback(content+'\n'+ret);
              });
            }else{
              callback(content+'\n画图失败');
            }
          }
        });
      },5000);
    }
  });
}


module.exports={
  diffuseReply
}
