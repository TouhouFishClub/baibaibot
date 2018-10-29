var http = require('http');
var https = require('https');


function checkError(content,callback){
    var options = {
      host: 'api.CuoBieZi.net',
      port: 80,
      path: '/spellcheck/json_check/json_phrase',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':'application/json;charset=utf-8'
      }
    };
    var obj = {};
    obj.content=content;
    obj.mode="advanced";
    obj.biz_type="show";
    obj.username="tester";

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        callback(resdata);
      });
    });
    req.on('error', function(err) {
      console.log('req err:');
      console.log(err);
    });
    req.write(JSON.stringify(obj));
    req.end();
}

module.exports={
  checkError
}