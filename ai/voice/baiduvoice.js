var http = require('http');
var fs=require('fs');
var request = require("request");
const WxVoice = require('wx-voice');
var voice = new WxVoice();
voice.on("error", (err) => console.log(err));


var access_token="24.605038ccaddb62db4b00b9ce793153ee.2592000.1534394660.282335-11186658"
initToken();
function initToken(){
  var options = {
    host: 'openapi.baidu.com',
    port: 443,
    path: '/oauth/2.0/token?grant_type=client_credentials&client_id=0zo4P6sBYoLDo2oHaqt6j68m&client_secret=7c5cd27097a52024739a3616438f0740',
    method: 'GET',
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      access_token=data.access_token
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function baiduVoice(text,callback){

  console.log("will voice:"+text);
  var path = '/text2audio?lan=zh&ctp=1&cuid=abcdxxx&tok='+access_token+'&vol=6&per=4&spd=5&pit=7&tex='+encodeURIComponent(text);

  var now = new Date();
  var filename = 'static/'+now.getTime()+".mp3";
  var req = request({
    url: 'https://tsn.baidu.com'+path,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('bd voice pipe error catched!')
      console.log(error);
      callback(text);
      return;
    }
  }).pipe(fs.createWriteStream(filename));
  req.on('close',function(){
    console.log('finish voice:'+filename)
    voice.encode(
      filename, "../coolq-data/cq/data/record/send/"+now.getTime()+".silk", { format: "silk" },
      function(file){
        console.log(file);
        callback('[CQ:record,file=send/'+now.getTime()+'.silk]')
      })
  })
  req.on('error',function(err){
    console.log(err);
    callback("");
  })
}

module.exports={
  baiduVoice
}