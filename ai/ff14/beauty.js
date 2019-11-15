var http=require('http');
var https=require('https');
var fs = require('fs');
var zlib = require('zlib');
var request = require('request');
var gm = require('gm')

var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../cq/sendImage');

function beautyReply(content,gid,callback){
  var url = 'https://api.bilibili.com/x/space/channel/video?mid=15503317&cid=55877&pn=1&ps=1&order=0&jsonp=jsonp';

  var options = {
    hostname: "api.bilibili.com",
    port: 443,
    path: "/x/space/arc/search?mid=15503317&ps=10&tid=0&pn=1&keyword=&order=pubdate",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        try{
          var data = eval('('+resdata+')');
          var vlist = data.data.list.vlist;
          var rpy = false;
          for(var i=0;i<vlist.length;i++){
            if(rpy==false){
              var title = vlist[i].title;
              if(title.indexOf("时尚品鉴")>=0){
                var avid = vlist[i].aid;
                getavDetail(avid,callback,title);
                rpy=true;
                break;
              }
            }
          }
        }catch(e){
          console.log(e);
        }

      });
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function getavDetail(avid,callback,title){
  // avid = 74076143;
  var url = "https://www.bilibili.com/video/av"+avid;
  request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    url: url,
    gzip: true
  }, function(err, response, body) {
    var n1 = body.indexOf('info open');
    var s1 = body.substring(n1+2);
    var n2 = s1.indexOf('>');
    var s2 = s1.substring(n2+1);
    var n3 = s2.indexOf('<');
    var ret = s2.substring(0,n3);
    sendBeautyImage(title+"\n"+url+"\n",ret,callback);
  });
}


function sendBeautyImage(titlewd,imgwd,callback){
  var wd = imgwd;
  var wa = wd.split('\n');
  var maxwd = 0;
  var uwd = 40;
  var uw = "";
  for(var i=0;i<wa.length;i++){
    var lw = wa[i];
    var ud = "";
    while(lw.length>uwd){
      ud = ud + lw.substring(0,uwd)+"\n";
      lw = lw.substring(uwd);
    }
    if(lw.length>0){
      uw = uw + ud +lw+"\n";
    }else{
      uw = uw + ud;
    }
  }
  var ua = uw.split('\n');
  for(var i=0;i<ua.length;i++){
    if(ua[i].length>maxwd){
      maxwd = ua[i].length;
    }
  }

  var len = ua.length;
  var imgname = new Date().getTime()+"";
  var folder = 'static/'

  var img1 = new imageMagick("static/blank.png");
  console.log("len:"+maxwd+":"+len);
  img1.resize(maxwd*14+33, len*22+24,'!') //加('!')强行把图片缩放成对应尺寸150*150！
    .autoOrient()
    .fontSize(16)
    .fill('blue')
    .font('./font/STXIHEI.TTF')
    .drawText(0,0,uw,'NorthWest');
  sendGmImage(img1,titlewd,callback);
}



module.exports={
  beautyReply
}