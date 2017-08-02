var http=require('http');
var https=require('https');
var fs = require('fs');

const Client = require('../httpclient');
var cookie = new Client().getCookieString();
function urlget(config){
  var url = config.url;
  var n = url.indexOf('://');
  var p1 = url.substring(0,n);
  var p2 = url.substring(n+3);
  var n1 = p2.indexOf('/');
  var host = n1>0?p2.substring(0,n1):p2;
  var path = n1>0?p2.substring(n1+1):'/';
  var headers = config.headers;
  headers.Cookie = cookie;
  headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
  var options = {
    hostname: host,
    port: p1=='https'?443:80,
    path: path,
    method: 'GET',
    headers: headers
  };
  console.log(options)
  var protocol = p1=='https'?https:http;
  return new Promise((resolve, reject) => {
    var req = protocol.request(options, function(res) {
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        console.log(111);
        console.log(resdata);
        resolve(resdata);
      });
    });
    req.end();
  });
}

module.exports={
  urlget
}