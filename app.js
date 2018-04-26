var express = require('express');
var app = express();
var http = require('http');
const {handleMsg,reconnect} = require('./baibai2');

const callback = function(res){
  if(res.trim().length>0){
    setTimeout(function(){

      console.log(res)
      console.log('\n=========\n')

    },1000);
  }
}

app.get('restart',function(reqq,ress){
  var options = {
    hostname: "192.168.17.52",
    port: 23334,
    path: '',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      failed=0;
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        setTimeout(function(){
          reconnect();
          setTimeout(function(){
            reconnect();
            setTimeout(function(){
              reconnect();
            },5000);
          },5000);
        },5000);
        ress.send('ok');
      });
      res.on('error',function(){

      })
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
});

const mabi = require('./ai/mabinogi/smuggler')
const {getNameList} = require('./ai/games/card/fetch');
const {drawNameCard,getDetailByName,draw2df} = require('./ai/games/card/draw');
const {fetchbangumi} = require('./ai/games/card/bangumi');
const {searchByUrl} = require('./ai/image/google')
const {regen} = require('./ai/favour/battle');
//getDetailByName(1,'Etihw','/Etihw',function(){});
//mabi()
//getNameList();
//fetchGame(2235)
//draw2df(1,2,function(r){console.log(r)});
//searchByUrl();


