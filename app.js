const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')
const {handleMsg,reconnect} = require('./baibai2');
const {getChat,saveChat} = require('./ai/chat/collect');
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
  var order = querydata.w;
  var callback=function(r){
    var ret = {d:r}
    res.set("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(ret));
  }
  if(gid){
    getChat(gid,ts,callback,order);
  }else{
    res.send('[]');
  }

});

app.get('/image',function(req,res){
  var querydata = req.query;
  var url = querydata.url;
  var imgpath = querydata.d;
  var bface = querydata.bface;
  if(imgpath){
    var head = '../coolq-data/cq/data/image';
    var realpath = path.join(__dirname,head,imgpath);
    res.sendFile(realpath);
  }else if(bface){
    var head = '../coolq-data/cq/data/bface';
    var facepath = path.join(__dirname,head,bface);
    res.sendFile(facepath);
  }else{
    request({
      url: url,
      method: "GET"
    }, function(error, response, body){
      if(error&&error.code){
        console.log('pipe error catched!')
        console.log(error);
      }
    }).pipe(res);
  }
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

app.get('/send_group_msg',(reqp, resp) => {
  var querydata = reqp.query;
  var res=querydata.d;
  var groupid = parseInt(querydata.gid);
  resp.set("Access-Control-Allow-Origin", "*");
  if(res.trim().length>0){
    var options = {
      host: '192.168.17.52',
      port: 23334,
      path: '/send_group_msg?group_id='+groupid+'&message='+encodeURIComponent(res),
      method: 'GET',
      headers: {

      }
    };
    console.log(res);
    saveChat(groupid,2375373419,'百百',res);
    var req = http.request(options,function(res2){
      res2.on('data', function (chunk) {

      });
      res2.on('end',function(){
        resp.send('{"result":"ok"}')
      })
    });
    req.on('error', function(err) {
      console.log('req err:');
      console.log(err);
      resp.send('{"result":"error"}')
    });
    req.end();
  }
})


app.get('/text', (req, res) => {
  res.set('Content-Type','text/html');
  res.send(fs.readFileSync(path.join('public', 'tools', 'textCheck.html')))
})


app.get('/get_group_list',function(req,res){
  groupm(req,res,'get_group_list')
});

app.get('/get_group_member_list',function(req,res){
  groupm(req,res,'get_group_member_list')
});

app.get('/get_group_member_info',function(req,res){
  groupm(req,res,'get_group_member_info')
});

function groupm(req,res,path){
  res.set("Access-Control-Allow-Origin", "*");
  var url = 'http://192.168.17.52:23334/'+path;
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(res);
}


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
  res.set("Access-Control-Allow-Origin", "*");
  res.send(JSON.stringify(r));
})

app.get('/x1',function(req,res){
  var r = "var x = 1"
  res.set('Content-Type','text/javascript')
  res.send(r);
})

