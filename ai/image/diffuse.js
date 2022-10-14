var fs = require('fs');
var request = require('request');
const {secret} = require("../../secret");
var base64ToImage = require('base64-to-image');
const b64img = require('node-base64-image');
var path = require('path');
const { sendImageMsgBuffer } = require(path.join(__dirname, '../../cq/sendImage.js'))

function diffuseReply(content,gid,qq,callback,waifu){
  var apikeylist = secret.u2;
  var apikey = apikeylist[Math.floor(Math.random()*apikeylist.length)];
  content = content.trim()
  var url = 'https://api.replicate.com/v1/predictions'
  var version = "a9758cbfbd5f3c2094457d996681af52552901775aa2d6dd0b17fd15df959bef";
  if(waifu){
    version = "9e767fbac45bea05d5e1823f737f927856c613e18cbc8d9068bafdc6d600a0f7"
  }
  var body1 = '{"version": "'+version+'", "input": {"prompt": "'+content+'"}}';
  console.log(body1)
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
      // resbody = imgurl;
      // var now = new Date().getTime();
      // var filename = "../coolq-data/cq/data/image/send/diffuse/" + now+"_"+content;
      // var imgreq = request({
      //   url: imgurl,
      //   method: "GET"
      // }, function (error, response, body) {
      //   if (error && error.code) {
      //     console.log('pipe error catched!')
      //     console.log(error);
      //   }
      // }).pipe(fs.createWriteStream(filename));
      // imgreq.on('close', function () {
      //
      // });

      var d1 = eval('(' + resbody + ')');
      if(!(d1&&d1.urls&&d1.urls.get)){
        callback(content+'\n画图失败哦');
        return;
      }
      var geturl = d1.urls.get;
      console.log(geturl);
      setTimeout(function(){
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
            console.log('pipe error catched!')
            console.log(error);
          } else {
            console.log(resbody2);
            var d2 = eval('(' + resbody2 + ')');
            if(d2.output&&d2.output[0]){
              var imgurl = d2.output[0];

              var now = new Date().getTime();
              var filename = "../coolq-data/cq/data/image/send/diffuse/" + now+"_"+content;
              var imgreq = request({
                url: imgurl,
                method: "GET",
                proxy: 'http://192.168.17.241:2346',
              }, function (error, response, body) {
                if (error && error.code) {
                  console.log('pipe error catched!')
                  console.log(error);
                }
              }).pipe(fs.createWriteStream(filename));
              imgreq.on('close', function () {
                var ret = '[CQ:'+'image'+',file=send/diffuse/' + now+"_"+content + ']';
                callback(content+'\n'+ret);
              });
            }else{
              if(waifu){
                callback(content+'\n绘图失败');
              }else{
                callback(content+'\n画图失败');
              }
            }
          }
        });
      },8000);
    }
  });
}

function novelAI(callback,content){
 //  curl -i -X POST -d '{"fn_index":12,"data":["magical girl","","None","None",20,"Euler a",false,false,1,1,7,-1,-1,0,0,0,false,512,512,false,false,0.7,"None",false,false,null,"","Seed","","Nothing","",true,false,null,"",""],"session_hash":"goaf491shp"}' \
 // -H 'content-type: application/json' -H 'referer: https://25796.gradio.app/' \
 // -H 'user-agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36' \
 // https://28113.gradio.app/api/predict/
  var hostid = 10214;
  var url = 'https://'+hostid+'.gradio.app/api/predict/';
  var bd = {"fn_index":12,"data":[content.substring(4).trim(),"","None","None",20,"Euler a",false,false,1,1,7,-1,-1,0,0,0,false,512,512,false,false,0.7,"None",false,false,null,"","Seed","","Nothing","",true,false,null,"",""],"session_hash":"goaf491shp"}
  request({
    url: url,
    method: "POST",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type':'application/json',
      'referer': 'https://'+hostid+'.gradio.app/'
    },
    body:JSON.stringify(bd)
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var data = eval('('+resbody+')');
      var base64 = data.data[0][0].substring(22);
      console.log(base64.substring(0,300));
      var now = new Date().getTime();
      let dataBuffer = new Buffer(base64,'base64');
      sendImageMsgBuffer(dataBuffer, 'coin_'+new Date().getTime(), 'coin', msg => {
        callback(msg)
      },content,'MF');
    }
  });
}
//novelAI(function(r){console.log(r)})



function naifu(callback,content){
  content=content.substring(4).trim();
  var url = 'https://rebate-aggressive-rehab-author.trycloudflare.com/generate-stream';
  var seed = Math.floor(Math.random()*4294967295)
  var bd = {"prompt":"masterpiece, best quality, "+content,"width":512,"height":768,"scale":12,"sampler":"k_euler_ancestral","steps":20,"seed":seed,"n_samples":1,"ucPreset":0,"uc":"lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"}
  var now = new Date().getTime();
  var fnc = '';
  var fn = "public/png/"+seed+"_"+fnc+"_"+now;
  var imgreq = request({
    url: url,
    method: "POST",
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type':'application/json',
    },
    proxy: 'http://192.168.17.241:2346',
    body:JSON.stringify(bd)
  }, function(error, response, resbody) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
    }
  }).pipe(fs.createWriteStream(fn));
  imgreq.on('close', function () {
    if (fs.existsSync(fn)) {
      var data = fs.readFileSync(fn,"utf-8")
      var da = data.split('\n');
      var imgb64 = da[2].substring(5);
      let dataBuffer = new Buffer(imgb64,'base64');
      sendImageMsgBuffer(dataBuffer, seed+"_"+fnc+"_"+now, 'naifu', msg => {
        callback(msg)
      },content,'MF');
    }
  });
}


module.exports={
  novelAI,
  diffuseReply,
  naifu
}
