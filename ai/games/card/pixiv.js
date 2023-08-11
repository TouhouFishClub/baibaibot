var http=require('http');
var https = require('https');
var fs = require('fs')
var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://'+require('../../../baibaiConfigs').myip+':2346';
var agent = new HttpsProxyAgent(proxy);
var request = require('request');

var pixivDailyList = [];
function run(){
  var fn = "tmp/pixiv/"+new Date().toLocaleDateString().replace(/\//g,'-')+".txt";
  fs.exists(fn,function(ret){
    console.log(ret);
    if(ret){
      pixivDailyList = eval('('+fs.readFileSync(fn,"utf-8")+')');
    }else{
      fetchpixiv();
      setTimeout(function(){
        run();
      },120000)
    }
  });
}
run();


function drawPixiv(username){
  if(pixivDailyList.length==0){
    return "";
  }else{
    var num = Math.floor(Math.random()*pixivDailyList.length);
    var data = pixivDailyList[num];
    var fn = data.fn;
    var ret;
    if(fs.existsSync(fn)){
      ret = username+"抽到了："+data.title+"\n"+data.img+"\nid:"+data.id;
    }else{
      ret = "";
    }
    return ret;
  }
}


function fetchpixiv(){
  var option = {
    host: 'www.pixiv.net',
    port: 443,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    agent:agent,
    path: '/ranking.php?mode=daily&p=1&format=json'
  };
  console.log('\n\n=====================================')
  console.log(option);
  console.log('=====================================\n\n')
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      try{
        var data = eval('('+resdata+')');
        var contents = data.contents;
        var ul = [];
        for(var i=0;i<contents.length;i++){
          var title=contents[i].title;
          var url = contents[i].url;
          var userid = contents[i].user_id;
          var illust_id = contents[i].illust_id;
          var fobj = saveImage(url,i*1000);
          var image = fobj.i;
          var filename = fobj.f;
          ul.push({title:title,url:url,uid:userid,id:illust_id,img:image,fn:filename});
        }
        var fn = "tmp/pixiv/"+new Date().toLocaleDateString().replace(/\//g,'-')+".txt";
        fs.writeFileSync(fn,JSON.stringify(ul));
      }catch(e){
        console.log(e);
      }
    });
  })
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

let saveImage = function(url,delay){
  var now = new Date();
  var rd = Math.floor(Math.random()*8888+1000);
  var filename = IMAGE_DATA+"/pixiv/"+now.getTime()+rd+"";
  var image = '[CQ:image,file=send/pixiv/'+now.getTime()+rd+']';
  setTimeout(function(){
    console.log(filename);
    var req = request({
      url: url,
      method: "GET",
      proxy:'http://192.168.17.241:2346',
      headers:{
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
        'Referer':'https://www.pixiv.net/ranking.php?mode=daily',
        'Accept-Language': 'zh-CN,zh;q=0.8'
      }
    }, function(error, response, body){
      if(error&&error.code){
        console.log('pipe error catched!')
        console.log(error);
      }
    }).pipe(fs.createWriteStream(filename));
    req.on('close',function(){
      console.log(filename);
    });
  },delay);
  return {i:image,f:filename};

}

module.exports={
  drawPixiv
}