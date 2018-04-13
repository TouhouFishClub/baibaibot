var http = require('http');
var https = require('https');
var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://192.168.17.62:3128';
var agent = new HttpsProxyAgent(proxy);

function googleImageSearch(content,callback){
  if(content.startsWith('[CQ:image')){
    var n1 = content.indexOf('url=');
    var n2 = content.indexOf('?');
    var imgurl = content.substring(n1+4,n2);
    var cb = function(ret){
      callback(content+'\n对该图片的最佳猜测:'+ret);
    }
    searchByUrl(imgurl,cb);
  }
}


function searchByUrl(imgurl,callback){
  //imgurl = 'https://avatars1.githubusercontent.com/u/1687507?s=400&v=4';
  var options = {
    hostname: "www.google.co.jp",
    port: 443,
    path: '/searchbyimage?image_url='+encodeURIComponent(imgurl),
    method: 'GET'
  };
  console.log(options);
  console.log('===============')
  options.agent=agent;

  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      console.log('code1:'+code);
      if(code==302){
        var location = res.headers.location;
        console.log(location);
        searchByUrl_Step2(location,callback)
      }
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.setTimeout(5000,function(){
    console.log('boom!');
  });
  req.end();
}

function searchByUrl_Step2(url,callback){
  var headstr = "https://www.google.co.jp";
  if(url.startsWith(headstr)){
    var path = url.substring(headstr+1);
    var options = {
      hostname: "www.google.co.jp",
      port: 443,
      path: path,
      method: 'GET',
      headers:{
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
        'accept-language':'zh-CN,zh;q=0.9'
      }
    };
    console.log(options);
    console.log('===============')
    options.agent=agent;

    var req = https.request(options, function(res) {
      res.setEncoding('utf8');
      var code = res.statusCode;
      res.setEncoding('utf8');
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        console.log('code2:'+code);
        if(code==200){
          console.log('===============')
          var n1 = resdata.indexOf('对该图片的最佳猜测');
          if(n1>0){
            var s1 = resdata.substring(n1+10);
            var n2 = s1.indexOf('</div>');
            var s2 = s1.substring(0,n2);
            var r=getinner(s2);
            console.log(r);
            callback(r);

          }

          console.log('===============')
        }
      });
    });
    req.on('error', function(err) {
      console.log('req err:');
      console.log(err);
    });
    req.setTimeout(5000,function(){
      console.log('boom!');
    });
    req.end();
  }

}

function getinner(s){
  var isinner=0;
  var rn = 0;
  var ret = "";
  for(var i=0;i<s.length;i++){
    if(isinner==0&&s[i]==">"){
      isinner=1;
    }else if(isinner==1&&s[i]=="<"){
      isinner=0;
    }else if(isinner){
      if(s[i]==" "||s[i]=="\n"){
        if(rn==0){
          ret=ret+s[i];
        }
        rn=1;
      }else{
        ret=ret+s[i];
        rn=0;
      }
    }
  }
  return ret;
}


module.exports={
  googleImageSearch,
  searchByUrl
}