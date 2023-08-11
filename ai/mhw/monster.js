var https = require('https');
var path = require('path');
var request = require("request");
var fs = require('fs');
function getmonsters(enname){
  var options = {
    host: 'monsterhunterworld.wiki.fextralife.com',
    port: 443,
    path: '/'+encodeURIComponent(enname),
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    }
  };
  console.log(enname);
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(resdata);
      var n1 = resdata.indexOf('In-game weakness information');
      var s1 = resdata.substring(n1+4);
      var n2 = s1.indexOf('<img');
      var s2 = s1.substring(n2);
      var n3 = s2.indexOf('>');
      var s3 = s2.substring(0,n3+1);
      var n41 = s3.indexOf('src="');
      var n42 = s3.indexOf('data-src="');
      if(n42>0){
        var s4 = s3.substring(n42+10);
        var n5 = s4.indexOf('"');
        var imgsrc = s4.substring(0,n5);
      }else{
        var s4 = s3.substring(n41+5);
        var n5 = s4.indexOf('"');
        var imgsrc = s4.substring(0,n5);
      }
      console.log(imgsrc);
      saveImage("https://monsterhunterworld.wiki.fextralife.com"+imgsrc,enname)

    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}


function getnames(){
  var options = {
    host: 'www.mhchinese.wiki',
    port: 443,
    path: '/monsters',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    }
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(resdata);
      var n1 = resdata.indexOf('大型魔物');
      var s1 = resdata.substring(n1+4);
      var n22 = s1.indexOf('小型魔物');
      s1 = s1.substring(0,n22);
      var list=[];
      var n = s1.indexOf('<a class="tip"');
      while(n>0){
        var s = s1.substring(n+3);
        var n2 = s.indexOf('</a>');
        var info = s.substring(0,n2+3);
        s1 = s.substring(n2+5);
        n = s1.indexOf('<a class="tip"');
        var n2 = info.indexOf('日文: ');
        var s2 = info.substring(n2+3);
        var n3 = s2.indexOf('<');
        var jp = s2.substring(0,n3);
        var s3 = s2.substring(n3+3);
        var n4 = s3.indexOf('英文: ');
        var s4 = s3.substring(n4+3);
        var n5 = s4.indexOf('"');
        var en = s4.substring(0,n5);
        var s5 = s4.substring(n5+2);
        var n6 = s5.indexOf('<');
        var zh = s5.substring(0,n6);
        jp=jp.replace(/&#39;/g,'\'').trim();
        en=en.replace(/&#39;/g,'\'').trim();
        zh=zh.replace(/&#39;/g,'\'').trim();
        list.push({jp:jp,en:en,zh:zh,cn:zh.replace(/龍/g,'龙').replace('/鳥/g','鸟')});
      }
      console.log(list);
      for(var i=0;i<list.length;i++){
        var enn = list[i].en;
        //console.log(en);
        if(enn.length>3){
          //getmonsters(enn.trim())
        }
      }
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

let saveImage = function(url,filename){
  var now = new Date();
  // var rd = Math.floor(Math.random()*8888+1000);
  filename = 'monsters/'+filename;
  console.log(url);
  var req = request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(fs.createWriteStream(filename));
  req.on('close',function(){
    console.log(filename);
  });
  var image = '[CQ:image,file=send/save/'+now.getTime()+'.png]';
  return image;
}





module.exports={
  getmonsters,
  getnames
}