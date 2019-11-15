var http=require('http');
var https=require('https');
var fs = require('fs');
var zlib = require('zlib');
var request = require('request');


function beautyReply(content,gid,callback){
  var url = 'https://api.bilibili.com/x/space/channel/video?mid=15503317&cid=55877&pn=1&ps=1&order=0&jsonp=jsonp';

  var options = {
    hostname: "api.bilibili.com",
    port: 443,
    path: "/x/space/channel/video?mid=15503317&cid=55877&pn=1&ps=1&order=0&jsonp=jsonp",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        try{
          var data = eval('('+resdata+')');
          var avid = data.data.list.archives[0].aid;
          console.log("av:"+avid);
          getavDetail(avid,callback)
        }catch(e){
          console.log(e);
        }

      });
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function getavDetail(avid,callback){
  // avid = 74076143;
  var url = "https://www.bilibili.com/video/av"+avid;
  request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    url: url,
    gzip: true
  }, function(err, response, body) {
    var n1 = body.indexOf('info open');
    var s1 = body.substring(n1+2);
    var n2 = s1.indexOf('>');
    var s2 = s1.substring(n2+1);
    var n3 = s2.indexOf('<');
    var ret = s2.substring(0,n3);
    callback(ret+"\n\n"+url);
  });
}


module.exports={
  beautyReply
}