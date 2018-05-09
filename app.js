const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')
const {handleMsg,reconnect} = require('./baibai2');
const {getChat} = require('./ai/chat/collect');
var request = require("request");


app.listen('10086', () => {
  console.log('server started')
  console.log('http://localhost:10086')
})

/* set public path */
app.use(express.static('public'))

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
    res.set("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(ret));
  }
  getChat(gid,ts,callback);
});

app.get('/image',function(req,res){
  var querydata = req.query;
  var url = querydata.url;
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(res);
});

app.get('/log', (req, res) => {
  res.send(fs.readFileSync(path.join('log', 'index.html', 'utf-8')))
})


