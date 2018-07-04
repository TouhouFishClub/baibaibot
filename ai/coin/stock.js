const fs = require('fs'),
  path = require('path'),
  Canvas = require('canvas'),
  { sendImageMsgBuffer } = require(path.join(__dirname, '../../cq/sendImage.js'))


function getStock(){
  var url = "http://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sz399300,int_hangseng,int_dji,int_nasdaq,int_sp500,int_nikkei";
  var options = {
    hostname: "hq.sinajs.cn",
    port: 443,
    path: '/list=s_sh000001,s_sz399001,s_sz399300,int_hangseng,int_dji,int_nasdaq,int_sp500,int_nikkei',
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
        var ra = resdata.split('\n');
        for(var i=0;i<ra.length;i++){

        }
      });
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });

}

