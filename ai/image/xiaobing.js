var http = require('http');

function poemReply(content,userName,callback){
  var n3 = content.indexOf('[CQ:image')
  if(n3>=0){
    var n1 = content.indexOf('https://gchat.qpic');
    var s1 = content.substring(n1);
    var n2 = s1.indexOf('?');
    var url = s1.substring(0,n2);
    getPoemByImgurl(url,function(text){
      callback(content+'\n'+text);
    })
  }
}

function getPoemByImgurl(imgurl,callback){
  var options = {
    host: require('../../baibaiConfigs').myip,
    port: 10088,
    path: '/py?type=poem&url='+encodeURIComponent(imgurl),
    method: 'GET',
    headers: {
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'

    }
  };
  console.log(options)
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    console.log(res.statusCode)
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      var text = data.content.text;
      var ts = text.replace(/小冰/g,'');
      callback(ts);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

module.exports={
  poemReply
}