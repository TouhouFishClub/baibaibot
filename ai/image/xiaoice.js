var FormData = require('form-data');
var https = require('https');
var fs = require('fs');
var http = require('http');

function getTid(callback){
  var options = {
    host: 'kan.msxiaobing.com',
    port: 80,
    path: '/V3/Portal?task=yanzhi',
    method: 'GET',
    headers: {
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    }
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var headers = res.headers;
      var cookie = headers['set-cookie'];
      var n = resdata.indexOf('xb_log_info');
      var s1 = resdata.substring(n+1);
      var inputstr = '<input type="text" name="tid" value="';
      var n1 = s1.indexOf(inputstr);
      var s2 = s1.substring(n1+inputstr.length);
      var n2 = s2.indexOf('"');
      var tid = s2.substring(0,n2);
      callback(tid,cookie);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}




function getBase64Image(url,callback){
  https.get(url,function(res){
    var chunks = []; //用于保存网络请求不断加载传输的缓冲数据
    var size = 0;　　 //保存缓冲数据的总长度
    res.on('data',function(chunk){
      chunks.push(chunk);　 //在进行网络请求时，会不断接收到数据(数据不是一次性获取到的)，
      size += chunk.length;　　//累加缓冲数据的长度
    });
    res.on('end',function(err){
      var data = Buffer.concat(chunks, size);　　//Buffer.concat将chunks数组中的缓冲数据拼接起来，返回一个新的Buffer对象赋值给data
      var base64Img = data.toString('base64');　　//将Buffer对象转换为字符串并以base64编码格式显示
      uploadBase64Image(base64Img,callback);
    });
  });
}

function uploadBase64Image(str,callback){
  var options = {
    host: 'kan.msxiaobing.com',
    port: 80,
    path: '/Api/Image/UploadBase64',
    method: 'POST',
    headers: {
      'Host':'kan.msxiaobing.com',
      'Origin':'http://kan.msxiaobing.com',
      'Referer':'http://kan.msxiaobing.com/V3/Portal?task=yanzhi',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    }
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      var host = data.Host.trim();
      var url = data.Url.trim();
      console.log(host,url);
      callback(host+url);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.write(str.trim());
  req.end();
}


function poemReply(imgurl,callback){
  getTid(function(tid,cookie){
    console.log(cookie);

    let map = {};
    let ra = cookie;
    if (ra) {
      ra.forEach((rc) => {
        rc && rc.split(';').forEach((cookie) => {
          let parts = cookie.split('=');
          map[parts.shift().trim()] = parts.join('=');
        });
      });
    }
    console.log(map);




    let ar = [];
    for(var p in map){
      ar.push(`${p}=${map[p]}`);
    }
    var cookieStr = ar.join(';')
    var options = {
      host: 'kan.msxiaobing.com',
      port: 443,
      path: '/Api/ImageAnalyze/Process?service=poem&tid='+tid,
      method: 'POST',
      headers: {
        'Host':'kan.msxiaobing.com',
        'Origin':'http://kan.msxiaobing.com',
        'Content-Type':'application/json',
        'Cookies':cookieStr,
        'Referer':'http://kan.msxiaobing.com/V3/Portal?task=poem',
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
      }
    };
    getBase64Image(imgurl,function(msurl){
      var CreateTime = Math.floor(new Date().getTime()/1000);
      data = {
        'MsgId':CreateTime+'039',
        'CreateTime':CreateTime,
        'Content[imageUrl]':msurl
      }
      console.log(options);
      var req = https.request(options, function(res) {
        res.setEncoding('utf8');
        var resdata = '';
        res.on('data', function (chunk) {
          resdata = resdata + chunk;
        });
        res.on('end', function () {
          var data = eval('('+resdata+')');
          var text = data.content.text;
          callback(text);
        });
      });
      req.on('error', function(err) {
        console.log('req err:');
        console.log(err);
      });
      req.write(JSON.stringify(data));
      req.end();
    });
  })





}

module.exports={
  poemReply,
  getTid,
  uploadBase64Image,
  getBase64Image
}

function generateUID(){
  return generateRandom(8)+"-"+generateRandom(4)+"-"+generateRandom(4)+"-"+generateRandom(4)+"-"+generateRandom(12);
}

function generateRandom(num){
  var sm = Math.pow(16,num-1);
  var rm = Math.pow(16,num)-sm
  return Math.floor(sm+Math.random()*rm).toString(16)
}







