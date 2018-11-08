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
    host: '192.168.17.52',
    port: 10088,
    path: '/py?type=poem&url='+encodeURIComponent(imgurl),
    method: 'get',
    headers: {

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