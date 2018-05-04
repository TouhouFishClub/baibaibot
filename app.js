var express = require('express');
var app = express();
var http = require('http');
const {handleMsg,reconnect} = require('./baibai2');
const {getChat} = require('./ai/chat/collect');
app.listen('10086')
const callback = function(res){
  if(res.trim().length>0){
    setTimeout(function(){

      console.log(res)
      console.log('\n=========\n')

    },1000);
  }
}

app.get('/chathistory',function(req,res){
  var querydata = req.query;
  var gid = querydata.gid;
  var ts = querydata.ts;
  var callback=function(r){
    var ret = {d:r}
    res.send(JSON.stringify(ret));
  }
  getChat(gid,ts,callback);
});



