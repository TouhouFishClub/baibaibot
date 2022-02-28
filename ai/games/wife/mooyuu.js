var fs = require('fs');
var request = require('request');
// var brotli = require('brotli');
// var iconv = require('iconv-lite');


function moooyuurun(mid){
  if(!mid){
    mid=42059;
  }
  var url = 'https://www.mooyuu.com/illust/'+mid+'/';
  request({
    headers:{
      'authority': 'www.mooyuu.com',
      'referer':'https://www.mooyuu.com/illust/',
      'accept-language':'zh-CN,zh;q=0.9,ja;q=0.8',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    },
    url: url,
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var n1 = body.indexOf('<a class="piclink"');
      var s1 = body.substring(n1+1);
      var n2 = s1.indexOf('</a>');
      var s2 = s1.substring(0,n2);
      var n3 = s2.indexOf('<img');
      var s3 = s2.substring(n3+1);
      var n4 = s3.indexOf('src="');
      var s4 = s3.substring(n4+5);
      var n5 = s4.indexOf('"');
      var imgsrc = s4.substring(0,n5);

      // var n6 = body.indexOf('h1 class="wname"');
      // var s6 = body.substring(n6+1);
      // var n7 = s6.indexOf('>');
      // var s7 = s6.substring(n7+1);
      // var n8 = s7.indexOf('<');
      // var s8 = s7.substring(0,n8);
      // console.log(s8);


      console.log(imgsrc);
      if(imgsrc.indexOf('uploadfile')>0){
        var imgreq = request({
          url: imgsrc,
          method: "GET"
        }, function(error, response, body){
          if(error&&error.code){
            console.log('pipe error catched!')
            console.log(error);
          }else{
            console.log('mid:'+mid);
          }
        }).pipe(fs.createWriteStream('./mooyuu/'+mid),function(){
          console.log('3333333333');
        });
        imgreq.on('error',function(err){
          console.log(err);
          callback("");
        })
      }
    }
  })
}


function listspecial(wwid){
  if(!wwid){
    wwid=11;
  }
  console.log('will list:'+wwid)
  var url = 'https://www.mooyuu.com/special/'+wwid+'/';
  request({
    headers:{
      'authority': 'www.mooyuu.com',
      'referer':'https://www.mooyuu.com',
      'accept-language':'zh-CN,zh;q=0.9,ja;q=0.8',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    },
    url: url,
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var map = {};
      var ba = body.split('/illust/');
      for(var i=2;i<ba.length;i++){
        var n = ba[i].indexOf('/');
        var id = parseInt(ba[i].substring(0,n));
        map[id]=1;
      }
      var keys = Object.keys(map);
      console.log(keys);
      for(var i=0;i<keys.length;i++){
        moooyuurun(keys[i]);
      }
      setTimeout(function(){
        listspecial(wwid+1);
      },20000)
    }
  });
}

module.exports={
  moooyuurun,
  listspecial
}
