const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')
const qs = require("querystring")
const {handleMsg,reconnect,handle_msg_D2} = require('./baibai2');
const {getChat,saveChat,getImage} = require('./ai/chat/collect');
const {checkError} = require('./tools/textCheck');
const basicAuth = require('basic-auth');
const {handlef1} = require("./route/f1")
const mkdirsSync = require('./lib/mkdirsSync')
const multer = require('multer')
const UPLOAD_TMP_URL = '../coolq-data/cq/data/image/send/upload_tmp/'
const UPLOAD_URL = '../coolq-data/cq/data/image/send/upload/'
const ports = new Set([23334, 24334, 25334])
let PORT = 23334

var bodyParser = require('body-parser');
app.use(bodyParser.json())
var request = require("request");
app.use(express.static(path.join(__dirname, 'public')));



/* set public path */




var expressWs = require('express-ws')(app);
var util = require('util');
app.ws('/c/*', function(ws, req) {
  var path = req.path.substring(1);
  console.log(path);
  var ret = {a:1};
  ws.send(JSON.stringify(ret));
  util.inspect(ws);
  ws.on('message', function(msg) {
    msg = JSON.parse(msg);
    console.log(msg);
    var msgType = msg.message_type;
    console.log('ms:'+msgType+":"+(msgType=='group'));
    if(msgType=='group'){
      var content = msg.message;
      var groupid = msg.group_id;
      var from = msg.user_id;
      var sender = msg.sender;
      var name = sender?(sender.card?sender.card:sender.nickname):'[CQ:at,qq='+from+']';
      var nickname = sender?(sender.nickname):'[CQ:at,qq='+from+']';
      var groupName = 'group_'+groupid;
      console.log(content,from,name,groupid,groupName,nickname,msgType)
      var callback = function(replymsg){
        setTimeout(function() {
          var sendmsg = {
            "action": "send_group_msg",
            "params": {
              "group_id": groupid,
              "message": replymsg
            },
            "echo": new Date().getTime()
          }
          console.log(sendmsg);
          ws.send(JSON.stringify(sendmsg));
        },1000);
      }
      handle_msg_D2(content,from,name,groupid,callback,groupName,nickname,msgType)
    }
  });
  ws.on('close', function() {

  });
});


app.listen('10086', () => {
  console.log('server started')
  console.log('http://localhost:10086')
})
































app.get('/chathistory',function(req,res){
  var querydata = req.query;
  var gid = querydata.gid;
  var ts = querydata.ts;
  var order = querydata.w;
  var qq=querydata.qq;
  var keyword = querydata.kw;
  var callback=function(r){
    var ret = {d:r}
    res.set("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(ret));
  }
  if(gid){
    getChat(gid,ts,callback,order,qq,keyword);
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
    // var head = '../coolq-data/cq/data/image';
    // var realpath = path.join(__dirname,head,imgpath);
    res.sendFile(imgpath.slice(5));
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

app.get('/listimg',function(req,res){
  var querydata = req.query;
  var ts = querydata.ts;
  var set = querydata.d;
  var callback=function(r){
    var ret = {d:r}
    res.set("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(ret));
  }
  getImage(ts,set,callback);
})


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



app.get('/chat', (req, res) => {
  var user = basicAuth(req);
  // var check = !user || !user.name || !user.pass || user.name != 'aaa' || user.pass != '111';
  var check = false
  if(!check){
    res.redirect("/baibai-group-logs/dist/index.html")
  }else{
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    res.send(401);
  }

})




app.get('/send_group_msg',(reqp, resp) => {
  var user = basicAuth(reqp);
  // var check = !user || !user.name || !user.pass || user.name != 'aaa' || user.pass != '111';
  var check = false
  if (check) {
    resp.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    resp.send(401);
  }else{
    var querydata = reqp.query;
    var res=querydata.d;
    var groupid = parseInt(querydata.gid);
    resp.set("Access-Control-Allow-Origin", "*");
    if(res.trim().length>0){
      var options = {
        host: '192.168.17.52',
        port: PORT,
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
  }
})

if (!fs.existsSync(UPLOAD_TMP_URL)) {
  mkdirsSync(UPLOAD_TMP_URL);
}
var upload = multer({dest: UPLOAD_TMP_URL});

app.post('/send_group_multipart_data', upload.any(), (req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  // console.log('============')
  // console.log(req.body)
  // console.log(req.files[0]);  // 上传的文件信息
  if (!fs.existsSync(UPLOAD_URL)) {
    mkdirsSync(UPLOAD_URL);
  }
  var des_file = UPLOAD_URL + req.files[0].originalname;
  fs.readFile( req.files[0].path, (err, data) => {
    fs.writeFile(des_file, data, (err) => {
      if( err ){
        console.log('===== UPLOAD FILE ERROR =====')
        console.log( err );
      }else{
        response = {
          message:'File uploaded successfully',
          filename:req.files[0].originalname
        };
        console.log( response );
        res.end( JSON.stringify( response ) );
      }
    })
  })
})

app.get('/set_port', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  let { p } = req.query
  if(ports.has(p)) {
    PORT = p
    res.send('{"result":"ok"}')
    return
  }
  res.send('{"result":"error"}')
})

app.get('/get_ports', (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.send(JSON.stringify({
    ports: Array.from(ports),
    port: PORT
  }))
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
  var url = `http://192.168.17.52:${PORT}/`+path;
  let query = qs.stringify(req.query)
  if(query) {
    url = `${url}?${query}`
  }
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

app.get('/f1/*',function(req,res){
  handlef1(req,res);
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
  res.set("Access-Control-Allow-Origin", "*");
  res.send(JSON.stringify(r));
})

app.get('/x1',function(req,res){
  var r = "var x = 1"
  res.set('Content-Type','text/javascript')
  res.send(r);
})

app.get('/blive',function(req,res){
  var querydata = req.query;
  var roomid =  querydata.rid;
  var username = querydata.un;
  var message = querydata.d;
  var userid;
  if(roomid==39277){
    userid = 357474405;
  }else{

  }
  if(userid){
    var replyData = username+":"+message;
    var options = {
      host: '192.168.17.52',
      port: 25334,
      path: '/send_private_msg?user_id=' + userid + '&message=' + encodeURIComponent(replyData),
      method: 'GET',
      headers: {}
    };
    var reqq = http.request(options);
    reqq.on('error', function (err) {
      console.log('req err:');
      console.log(err);
    });
    reqq.end();
  }
  res.send('ok');
})


