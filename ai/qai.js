var https = require('https');
var crypto = require('crypto');
var appid = 1107054322;
var appkey = 'Yw6WKnq3It2cnUqn';

function getQAIresponse(content,callback){
  content = '你好 百百'
  var now = new Date();
  var tss = Math.floor(now.getTime()/1000) ;
  var nonce = 987654154;
  var session_id = 121451789
  var body = {
    app_id:appid+"",
    session:session_id+"",
    question:content,
    time_stamp:tss+"",
    nonce_str:nonce+""
  }
  var param = signParam(body);

  var options = {
    host: 'api.ai.qq.com',
    port: 443,
    path: '/fcgi-bin/nlp/nlp_textchat?'+param,
    method: 'GET',
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      console.log(resdata);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.write(JSON.stringify(body));
  req.end();
}

function signParam(data){
  var keys = Object.keys(data);
  var str = "";
  var rstr = "";
  keys.sort();
  for(var i=0;i<keys.length;i++){
    rstr = rstr + keys[i] + "=" + encodeURIComponent(data[keys[i]]) + "&";
    str = str + keys[i] + "=" + encodeURIComponent(data[keys[i]]).replace(/%20/g,'+') + "&";
  }

  str = str + "app_key="+appkey;
  console.log(str);
  var md5=crypto.createHash("md5");
  md5.update(str);
  var md5str=md5.digest('hex').toUpperCase();
  return rstr+"&sign="+md5str;
}


module.exports={
  getQAIresponse
}