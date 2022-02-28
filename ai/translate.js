var https=require('https');
var http = require('http');
function isword(content){
  var ret = true;
  if(content.indexOf(" ")<0){
    for(var i=0;i<content.length;i++){
      var cha=content.charCodeAt(i);
      if((cha>=65&&cha<=90)||(cha>=97&&cha<=122)){

      }else{
        ret = false;
        break;
      }
    }
  }else{
    ret = false;
  }
  return ret;
}

function translateMsg(content,tolan,callback){
  if(tolan=='zh-CHS'){
    if(isword(content)){
      var options = {
        hostname: 'api.shanbay.com',
        port: 80,
        path: '/bdc/search/?word='+content,
        method: 'GET',
      };
      var req = http.request(options, function (res) {
        var code = res.statusCode;
        if(code==200){
          res.setEncoding('utf8');
          var resdata = '';
          res.on('data', function (chunk) {
            resdata = resdata + chunk;
          });
          res.on('end', function () {
            var data = eval("("+resdata+")");
            var ret = data.data?(data.data.definition?data.data.definition:''):'';
            if(ret!=''){
              callback(content+"\n"+ret);
            }else{
              googleTranslate(content,'zh',callback);
            }
          });
        }else{
          googleTranslate(content,'zh',callback);
        }
      });
      req.on('error', function(err) {
        console.log('req err:');
        console.log(err);
      });
      req.end();
    }else{
      googleTranslate(content,'zh',callback);
    }
  }else if(tolan=='ja'||tolan=='en'){
    googleTranslate(content,tolan,callback);
  }else{
    ret = '出错了喵';
    callback(ret);
  }
}


var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://192.168.17.62:3128';
var agent = new HttpsProxyAgent(proxy);
var fs = require('fs');
//var gkey = fs.readFileSync('./gkey.txt','utf-8');
zlib = require('zlib');

function googleTranslate(content,tolan,callback){
  var option = {
    host: 'translate.googleapis.com',
    port: 443,
    method: 'GET',
    agent:agent,
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/translate_a/single?client=gtx&sl=auto&tl='+tolan+'&dt=t&q='+encodeURIComponent(content)
  };
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data=eval("("+resdata+")");
      console.log(data);
      var ret = '';
      try{
        for(var i=0;i<data[0].length;i++){
          ret=ret+data[0][i][0];
        }
      }catch(e){
        ret = '出错了喵';
      }
      callback(content+'\n          ↓\n'+ret);
    });
  })
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}


const crypto=require('crypto');
var request = require('request');
function translateYouDao(content,tolan,callback) {
    var appKey = '312ed77111707e2b';
    var key = 'fzJUxGaSwrwH69K0LHAYVEHagXHf6ZgQ';//注意：暴露appSecret，有被盗用造成损失的风险
    var salt = new Date().getTime();
    var curtime = Math.round(new Date().getTime()/1000);
    var query = '您好，欢迎再次使用有道智云文本翻译API接口服务';
    var from = 'auto';
    var to = tolan;
    var str1 = appKey + truncate(query) + salt + curtime + key;
    var sign = crypto.createHash('sha256').update(str1).digest('hex');

    var bdy = {
        q: query,
        appKey: appKey,
        salt: salt,
        from: from,
        to: to,
        sign: sign,
        signType: "v3",
        curtime: curtime,
    }
    console.log(bdy);
    var url = 'http://openapi.youdao.com/api';
    request({
        url: url,
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify(bdy)

    }, function(error, response, body) {
        if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
        } else {
          console.log(body);
        }
    });
}
translateYouDao('','en',function(){});



function truncate(q){
    var len = q.length;
    if(len<=20) return q;
    return q.substring(0, 10) + len + q.substring(len-10, len);
}








module.exports={
  translateMsg
}