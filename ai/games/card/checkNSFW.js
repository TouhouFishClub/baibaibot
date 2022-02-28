var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../../baibaiConfigs').mongourl;
var fs = require('fs');
var request = require('request');

function checknsfw(imgurl,callback){
  var option = {
    host: require('../../../baibaiConfigs').myip,
    port: 11001,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/url='+encodeURIComponent(imgurl)
  };
  console.log('\n\n=====================================')
  console.log("will check:"+imgurl+":");
  console.log(option);
  console.log('=====================================\n\n')
  var req = http.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    if(res.statusCode==200){
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function(){
        console.log("nsfw:"+imgurl+':'+resdata);
        callback(resdata)
      });
    }else{
      console.log('id:error:'+imgurl)
      callback(0)
    }
  });

  req.end();
}


module.exports={
  checknsfw
}