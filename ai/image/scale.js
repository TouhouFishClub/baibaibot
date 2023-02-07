var fs = require('fs');
var request = require('request');
const {secret} = require("../../secret");

function ImgScale(content,gid,qq,callback){
  var n = content.indexOf("[CQ:image");
  var s1 = content;
  if (n >= 0) {
    var n1 = s1.indexOf(']');
    var image = s1.substring(n, n1 + 1);
    var n2 = image.indexOf("https://gchat.qpic.cn");
    var n22 = image.indexOf("http://gchat.qpic.cn");
    if (n22 >= 0 && n2 < 0) {
      n2 = n22;
    }
    if (n2 > 0) {
      var n3 = image.indexOf("?");
      var url = image.substring(n2, n3);
      scaletask(url,callback);
    }
  }
}

// function realesrganByHuggingface(filename,callback){
//   var b64 = fs.readFileSync(filename,'base64');
//   var dt = [];
//   dt[0]='data:image/jpeg;base64,'+b64;
//   dt[1]='anime';
//   var bd = {fn_index: 0, data: dt, session_hash: "vzrx9clggr"};
//   var url = 'https://akhaliq-real-esrgan.hf.space/api/predict/';
//   console.log(bd)
//   request({
//     url: url,
//     method: "POST",
//     proxy: 'http://192.168.17.241:2346',
//     headers:{
//       'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
//       'content-type':'application/json',
//       'referer': 'https://akhaliq-real-esrgan.hf.space/?__theme=light'
//     },
//     body:JSON.stringify(bd)
//   }, function(error, response, resbody) {
//     if (error && error.code) {
//       console.log('pipe error catched!')
//       console.log(error);
//     } else {
//       console.log(resbody);
//       var data = eval('('+resbody+')');
//       console.log(data);
//     }
//   });
// }
// realesrganByHuggingface('/home/ter/i/111.png',function(r){console.log(r)})

function realesrgan(filepath,callback){
  var url = 'https://replicate.com/api/upload/a10.png?content_type=image%2Fpng'
  request({
    method : 'POST',
    url : url,
    proxy: 'http://192.168.17.241:2346',
    headers : { 'Content-Type' : 'multipart/form-data' },
    body:'content_type=image%2Fpng'
  },function (error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      console.log(resbody);
      var data = eval('('+resbody+')');
    }
  });
}

scaletask('https://gchat.qpic.cn/gchatpic_new/357474405/4111698514-2726882018-511E04E321410E11C49706E4A1802B33/0',function(r){console.log(r)})

function scaletask(imgurl,callback){
  var apikeylist = secret.u2;
  var apikey = apikeylist[Math.floor(Math.random()*apikeylist.length)];
  var url = 'https://api.replicate.com/v1/predictions'
  var version = "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b"
  var body0 = {version:version,input:{"image": imgurl,"scale":2,}};
  var body1 = JSON.stringify(body0);
  request({
    url: url,
    method: "POST",
    proxy:'http://192.168.17.241:2346',
    headers:{
      'Authorization': 'Token '+apikey,
      'Content-Type':'application/json'
    },
    body:body1
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      console.log('task ok,will get result');
      var d1 = eval('(' + resbody + ')');
      console.log(resbody);
      if(!(d1&&d1.urls&&d1.urls.get)){
        callback('failed');
      }else{
        var geturl = d1.urls.get;
        setTimeout(function(){
          console.log('get result now');
          console.log(apikey);
          request({
            url: geturl,
            method: "GET",
            proxy: 'http://192.168.17.241:2346',
            headers: {
              'Authorization': 'Token '+apikey,
              'Content-Type': 'application/json'
            },
          }, function (error, response, resbody2) {
            if (error && error.code) {
              callback('failed');
            } else {
              console.log(resbody2);
              var d2 = eval('(' + resbody2 + ')');
              if(d2.output){
                var imgurl = d2.output;
                console.log('iiiiiiiiiiiiiiiiiiiiiii'+imgurl)
                var now = new Date().getTime();
                var filename = "../coolq-data/cq/data/image/send/scale/" + now+".png";
                var imgreq = request({
                  url: imgurl,
                  method: "GET",
                  proxy: 'http://192.168.17.241:2346',
                }, function (error, response, body) {
                  if (error && error.code) {
                    callback('failed')
                  }
                }).pipe(fs.createWriteStream(filename));
                imgreq.on('close', function () {
                  var ret = '[CQ:'+'image'+',file=send/scale/' + now+".png]";
                  callback(ret);
                });
              }else{
                callback('failed')
              }
            }
          });
        },15000);
      }
    }
  });
}

module.exports={
  realesrgan,
  ImgScale
}
