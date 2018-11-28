var http = require('http');
var https = require('https');
var fs = require('fs');
var request = require('request');


function fetchYande(id){
  var option = {
    host: 'yande.re',
    port: 443,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/post/show/'+id
  };
  console.log('\n\n=====================================')
  console.log("will fetch from:"+id+":");
  console.log(option);
  console.log('=====================================\n\n')
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    if(res.statusCode==200){
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function(){
        resdata=resdata.toLowerCase();
        var n1 = resdata.indexOf('<div id="note-container">');
        if(n1>0){
          var s1 = resdata.substring(n1+2);
          var n2 = s1.indexOf('alt="');
          var s2 = s1.substring(n2+5);
          var n3 = s2.indexOf('"');
          var alt = s2.substring(0,n3);
          console.log(alt);
          var n4 = s1.indexOf('src="');
          var s4 = s1.substring(n4+5);
          var n5 = s4.indexOf('"');
          var src = s4.substring(0,n5);
          console.log(src);

          var filename = 'ydb/'+id;
          var list = alt.split(' ');
          var reqs = request({
            url: src,
            method: "GET",
            headers:{
              'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
            }
          }, function(error, response, body){
            if(error&&error.code){
              console.log('pipe error catched!')
              console.log(error);
            }
          }).pipe(fs.createWriteStream(filename));
          reqs.on('close',function(){
            console.log(filename);
            fetchYande(id+1);
          });
        }else{
          fetchYande(id+1);
        }
      })
    }else{
      fetchYande(id+1);
    }
  });
  req.on('error', function(err) {
    fetchYande(id+1);
  });
  req.end();
}

fetchYande(410005);

module.exports={
  fetchYande
}


