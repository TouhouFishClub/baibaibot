var https=require('https');
var http = require('http');
const tulingApiKey = "9cca8707060f4432800730b2ddfb029b";
function tulingMsg(userid,content,callback){
  var body={};
  body.key=tulingApiKey;
  body.info=content;
  body.userid=userid;
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
  req.write(JSON.stringify(body));
  req.end();
}

function handleTulingResponse(resdata){
  var data = eval("("+resdata+")");
  var code = data.code;
  var ret = '';
  if(code == 100000){
    ret = data.text;
  }else if(code == 200000){
    ret = data.text+""+data.url;
  }else{
    ret = '';
  }
  if(ret.indexOf('百百')>-1){
    ret = ret.replace(/百百/g,'百·百');
  }
  return ret;
}

module.exports={
  tulingMsg
}
