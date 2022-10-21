var fs = require('fs');
var request = require('request');
const {secret} = require("../../secret");

function realesrgan(content,gid,qq,callback){

}

function realesrgan(filepath,callback){
  var url = 'https://replicate.com/api/models/xinntao/realesrgan/files'
  request({
    method : 'POST',
    url : url,
    proxy: 'http://192.168.17.241:2346',
    headers : { 'Content-Type' : 'multipart/form-data' },
    formData : {file:fs.createReadStream(filepath)}
  },function (error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      console.log(resbody);
      var data = eval('('+resbody+')');
      var imgurl = data.file_url;
      scaletask(imgurl,callback);
    }
  });
}

function scaletask(imgurl,callback){
  var apikeylist = secret.u2;
  var apikey = apikeylist[Math.floor(Math.random()*apikeylist.length)];
  var url = 'https://api.replicate.com/v1/predictions'
  var version = "1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56"
  var body0 = {version:version,input:{"scale":2,"version":"Anime - anime6B","tile":0,"img": imgurl}}
  var body1 = JSON.stringify(body0);
  request({
    url: url,
    method: "POST",
    proxy:'http://192.168.17.241:2346',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
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
      if(!(d1&&d1.urls&&d1.urls.get)){
        callback('failed');
      }else{
        var geturl = d1.urls.get;
        setTimeout(function(){
          console.log('get result now');
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
        },11000);
      }
    }
  });
}

module.exports={
  realesrgan

}
