const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')
const {handleMsg,reconnect} = require('./baibai2');
const {getChat} = require('./ai/chat/collect');

const {checkError} = require('./tools/textCheck');
var bodyParser = require('body-parser');
app.use(bodyParser.json())


var request = require("request");
app.use(express.static(path.join(__dirname, 'public')));

app.listen('10086', () => {
  console.log('server started')
  console.log('http://localhost:10086')
})

/* set public path */


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

app.get('/ngaImgPipe/*',function(req,res){
  var path = req.path;
  var url = 'https://img.nga.178.com/'+path.substring(12);
  console.log(url);
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(res);
})

app.get('/Data/*',function(req,res){
  var path = req.path;
  console.log('path:'+path);
  var url = 'http://ffxivtools.polaris.xin/Data/'+path.substring(6);
  console.log(url);
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(res);
})

app.get('/Content/*',function(req,res){
  var path = req.path;
  console.log('path:'+path);

  var url = 'http://ffxivtools.polaris.xin/Content/'+path.substring(9);
  console.log(url);
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(res);
})

app.get('/textCheck',function(req,res){
  var querydata = req.query;
  var content = querydata.d;
  checkError(content,function(ret){
    res.send(ret);
  });
})

app.post('/textCheck',function(req,res){
  var body=req.body;
  var content = body.d;
  checkError(content,function(ret){
    res.send(ret);
  });
})



app.get('/log', (req, res) => {
  res.send(fs.readFileSync(path.join('log', 'index.html', 'utf-8')))
})

app.get('/text', (req, res) => {
  res.set('Content-Type','text/html');
  res.send(fs.readFileSync(path.join('public', 'tools', 'textCheck.html')))
})


app.get('/xxx',function(req,res){
  var r= [
    {
      "id": 1,
      "name": "LV",
      "createTime": 1543828108386
    },
    {
      "id": 2,
      "name": "CC",
      "createTime": 1543828108387
    },
    {
      "id": 3,
      "name": "BB",
      "createTime": 1543828108388
    }
  ]
  res.send(JSON.stringify(r));
})


