var https=require('https');
var http = require('http');
const tulingApiKey = "9cca8707060f4432800730b2ddfb029b";

var limit = {};


function tulingMsg(userid,content,callback,groupid){
  var then=limit[groupid];
  if(then){
    if(new Date().getTime()-then<3000){
      callback('太快了喵～');
      return;
    }
  }
  limit[groupid]=new Date().getTime();
  var body={};
  body.userInfo={};
  body.userInfo.apiKey=tulingApiKey;
  body.userInfo.userId=groupid;
  body.reqType=0;
  body.perception={};
  body.perception.inputText={};
  body.perception.inputText.text=content;
  var options = {
    hostname: 'openapi.tuling123.com',
    port: 80,
    path: '/openapi/api/v2',
    method: 'POST',
    headers:{
      'Content-Type':'application/json'
    }
  };
  var req = http.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });

    res.on('end', function () {
      var ret = handleTulingResponse(resdata);
      callback(ret);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.write(JSON.stringify(body));
  req.end();
}
var dup=0;
function handleTulingResponse(resdata){
  var data = eval("("+resdata+")");
  var code = data.intent.code;
  var ret = '';
  for(var i=0;i<data.results.length;i++){
    var value=data.results[i].values;
    var type = data.results[i].resultType;
    ret = ret + value[type]+"\n";
  }
  return ret.trim();
}

module.exports={
  tulingMsg
}
