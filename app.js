const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')
const qs = require("querystring")
const {handleMsg,handle_msg_D2} = require('./baibai2');
const {getChat,saveChat,getImage} = require('./ai/chat/collect');
const {checkError} = require('./tools/textCheck');
const basicAuth = require('basic-auth');
const {handlef1} = require("./route/f1")
const mkdirsSync = require('./lib/mkdirsSync')
const multer = require('multer')
const UPLOAD_TMP_URL = '../coolq-data/cq/data/image/send/upload_tmp/'
const UPLOAD_URL = '../coolq-data/cq/data/image/send/upload/'
const { myip } = require('./baibaiConfigs')
const { analyzerMessage } = require('./ai/GenshinImpact/GenshinPush')
const { getClient } = require('./mongo/index')
const ports = new Set([
	// 23334,
	24334, // 2号机 3291864216
	25334, // 3号机 1840239061
	26334, // 伊文萌新群专用机
	// 27334, // 5号机 2771362647
	// 28334, // 已停用
	29334,  // 11号机 384901015
	30004, // 比较常用的群绑定的机型 或许会开YUNZAI
	30014, // 几乎是洛奇专用机
	30024, // 原 伊鲁夏综合群专用机 改 洛奇专用机
	30034, // 临时用qq
])
let PORT = 24334

var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '10mb'}))
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

app.ws('/shamrock/', (ws, req) => {
  var path = req.path.substring(1);
  console.log(path);
  ws.on('message', (msg) => {
    console.log(`[WS Message] ${msg}`)
  })
  ws.on('close', () => {
    console.log('ws close')
  })
})


app.listen('10086', () => {
  console.log('server started')
  console.log('http://localhost:10086')
})

const checkAuth = (req, res) => new Promise((resolve, reject) => {
  const user = basicAuth(req)
  if (!user || !user.name || !user.pass || user.name != 'aaa' || user.pass != '111') {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
    res.send(401)
    reject('ERROR AUTH')
  } else {
    resolve('success')
  }
})

app.get('/pushMsg', (req, res) => {
	// console.log('\n\n\n=======')
	// console.log(req)
	// console.log(req.query)
	analyzerMessage(req.query.message)
	// console.log('=======\n\n\n')
	res.send('ok')
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
  // var check = !user || !user.name || !user.pass || user.name != 'aaa' || use r.pass != '111';
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
  var check = !user || !user.name || !user.pass || user.name != 'aaa' || user.pass != '111';
  // var check = false
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
        host: myip,
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
  if(ports.has(parseInt(p))) {
    PORT = parseInt(p)
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

app.get(`/api/*`, (req, res) => {
	// console.log('==============')
	// console.log(req)
	// console.log(res)
	// console.log(req.path)
	// console.log('================')
	groupm(req, res, req.path.substring(5))
})

function groupm(req,res,path){
  res.set("Access-Control-Allow-Origin", "*");
  var url = `http://${myip}:${PORT}/`+path;
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
      host: myip,
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


const {saveBabyData,getBabyData,delBabyData} = require("./ai/m/babyWeight");
app.get('/saveBabyData',function(req,res) {
  var querydata = req.query;
  var weight = parseFloat(querydata.weight);
  var height = parseFloat(querydata.height);
  var head = parseFloat(querydata.head);
  var backup = querydata.backup;
  saveBabyData(weight,height,head,backup,function(ret){
    res.send(ret);
  })
});

app.get('/getBabyData',function(req,res) {
  getBabyData(function(data){
    var ret = {d:data};
    res.send(JSON.stringify(ret));
  })
})

app.get('/delBabyData',function(req,res) {
  var querydata = req.query;
  var id = parseInt(querydata.id);
  delBabyData(id,function(ret){
    res.send(ret);
  })
})


const addZero = num => num < 10 ? ('0' + num) : num
const formatDate = ts => {
	let date = new Date(ts)
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${addZero(date.getHours())}:${addZero(date.getMinutes())}:${addZero(date.getSeconds())}`
}

app.post('/mabi/gachaPush', async (req, res) => {
	const data = req.body  // 获取 data 数组

	// console.log('==== push data ====')
	// console.log(req.body)
	// console.log(data)

	if (!Array.isArray(data)) {  // 校验 data 是否为数组
		res.status(400).send({
			code: 400,
			msg: 'data 必须为数组'
		})
		return
	}

	let client = await getClient(), err = []

	// 校验每条数据是否完整
	for (let i = 0; i < data.length; i++) {
		const {uid, n, g, t, sv, so} = data[i]
		let target = await client.db('db_bot').collection('cl_mabinogi_gacha_info').findOne({alias: g.replace(/[()（）]/g, '')})
		let from = 'unknown'
		if(target && target.info && target.info.length) {
			from = target.info[target.info.length - 1].pool
		}
		if (uid && n && g && t && sv && so) {
			await client.db('db_bot').collection('cl_mabinogi_gacha').save({
				_id: `${so}_${uid}`,
				customId: uid,
				username: n,
				gachaInfo: g,
				ts: t,
				time: formatDate(t),
				from,
				serverId: sv,
				source: so
			})
		} else {
			err.push(data[i])
		}
	}

	if(err.length) {
		res.status(400).send({
			code: 400,
			msg: '数据不完整或重复',
			err
		})
		return
	}

	res.send({
		code: 200,
		msg: '推送成功'
	})
})

