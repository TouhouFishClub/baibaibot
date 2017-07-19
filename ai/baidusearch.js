var https=require('https');

function baiduSearch(userid,content,callback){
  var path = '/s?wd='+encodeURIComponent(content);
  console.log(path);
  httpget('www.baidu.com',path,function(resdata){

  },0);
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

        console.log('get ok');
        require('fs').writeFileSync('1.html',resdata);

      });
    }

  });
  req.end();
}

module.exports={
  baiduSearch
}
