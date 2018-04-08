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
  body.key=tulingApiKey;
  body.info=content;
  body.userid=groupid;
  var options = {
    hostname: 'www.tuling123.com',
    port: 80,
    path: '/openapi/api',
    method: 'POST',
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
  var code = data.code;
  var ret = '';
  if(code == 100000){
    ret = data.text;
  }else if(code == 200000){
    ret = data.text+""+data.url;
  }else{
    ret = '玩累了，明天再来喵～';
  }
  if(ret.indexOf('百百')>-1){
    if(dup<3){
      dup++;
    }else{
      ret = ret.replace(/百百/g,'百·百');
    }
  }else{
    dup = 0 
  }
  return ret;
}

module.exports={
  tulingMsg
}
