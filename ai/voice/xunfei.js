var http =require('http');
var crypto = require('crypto');
var fs=require('fs');
var request = require("request");
const {RECORD_DATA} = require('../../baibaiConfigs');
var path = require('path');

const WxVoice = require('wx-voice');
var voice = new WxVoice();

function getVoice(text,callback){

  var headjson = {
    "auf": "audio/L16;rate=16000",
    "aue": "raw",
    "voice_name": "xiaoyan",
    "speed": "50",
    "volume": "50",
    "pitch": "50",
    "engine_type": "intp65",
    "text_type": "text"
  }

  var buf = Buffer.from(JSON.stringify(headjson));

  var now = new Date();

  var appid = '5ae287a3';
  var apikey = '5fb79f803130bbd5fdd3d96cadba0d1c'
  var b64 = buf.toString('base64');
  var nowsec = Math.floor(now.getTime()/1000);
  var md5str = apikey+nowsec+b64;
  var md5=crypto.createHash("md5");
  md5.update(md5str);
  var str=md5.digest('hex');

  var options = {
    host: 'api.xfyun.cn',
    port: 80,
    path: '/v1/service/v1/tts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'X-Appid':appid,
      'X-CurTime':nowsec,
      'X-Param':b64,
      'X-CheckSum':str
    }
  };
  var optionreq = {
    url: 'http://api.xfyun.cn/v1/service/v1/tts',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'X-Appid':appid,
      'X-CurTime':nowsec,
      'X-Param':b64,
      'X-CheckSum':str
    }
  }

  var body = "text="+encodeURIComponent(text);

  console.log(optionreq);

  var filename = now.getTime()+".mp3";



  var req = request.post(optionreq).pipe(fs.createWriteStream(filename));
  req.on('close',function(){
    voice.encode(
      filename, "oooooooo.silk", { format: "silk" },
      (file) => console.log(file));

    callback(filename);
  })
  req.on('error',function(err){
    console.log(err);
    console.log(img);
    callback("");
  })

  req.write(body);
  req.end();
}


module.exports={
  getVoice
}