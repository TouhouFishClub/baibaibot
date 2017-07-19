var https=require('https');

function baiduSearch(userid,content,callback){
  var path = '/s?wd='+encodeURIComponent(content);
  httpget('www.baidu.com',path,callback,0);
}




function httpget(host,path,callback,depth){
  var options = {
    hostname: host,
    port: 443,
    path: path,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(depth<5&&(code==301||code==302)){
      var location = res.headers.location;
      httpget(host,location,callback,depth+1);
    }else{
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        var ret = handleBaiduRes(resdata);
        callback(ret);
      });
    }

  });
  req.end();
}

function handleBaiduRes(resdata){
  var n0 = resdata.indexOf('<div id="content_left');
  var s0 = resdata.substring(n0);
  var n1 = s0.indexOf('c-container');
  var s1 = s0.substring(n1+10);
  var n2 = s1.indexOf('c-container');
  var s = s1.substring(0,n2);
  var ret = '';
  var isinner=0;
  var rn = 0;
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
  ret = ret.trim();
  return ret;
}


module.exports={
  baiduSearch
}
