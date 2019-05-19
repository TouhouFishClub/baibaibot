var https=require('https');
var http = require('http');
const tulingApiKey = "9cca8707060f4432800730b2ddfb029b";
const {baiduVoice} = require('../ai/voice/baiduvoice')
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var limit = {};

var bosonnlp = require('bosonnlp');
var nlp = new bosonnlp.BosonNLP('A6Dvxzs0.25388.G_wPyy4DDLw-');



function tulingMsg(userid,content,callback,groupid){
  var then=limit[groupid];
  if(then){
    if(new Date().getTime()-then<3000){
      callback('啊呜，百百好像反应不过来了哇哇哇哇哇！');
      return;
    }
  }
  if(content.indexOf('禁言')>=0){
    return;
  }
  limit[groupid]=new Date().getTime();
  var body={};
  body.userInfo={};
  body.userInfo.apiKey=tulingApiKey;
  body.userInfo.userId=groupid;
  body.reqType=0;
  body.perception={};
  body.perception.inputText={};
  body.perception.inputText.text=content;
  var options = {
    hostname: 'openapi.tuling123.com',
    port: 80,
    path: '/openapi/api/v2',
    method: 'POST',
    headers:{
      'Content-Type':'application/json'
    }
  };
  var req = http.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });

    res.on('end', function () {
      var ret = handleTulingResponse(resdata);
      if(ret.indexOf('TFboys')>0){
        ret = content;
      }
      nlp.sentiment(ret, function (data) {
        try{
        var dd = eval('('+data+')');
        console.log(dd);
        if(dd&&dd[0]&&dd[0][0]){
          var positive = dd[0][0];
          var negative = dd[0][1];
          var addrate = positive-negative;
          saveLike(userid,addrate,function(likeret){
            if(likeret>1){
              callback('百百对您的好感度上升到了'+likeret+',输入【好感度】可查看好感度');
            }
          })
        }
        }catch(e){
        
        }
      });
      if(Math.random()<0.0){
        baiduVoice(ret,callback);
      }else{
        callback(ret);
      }
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.write(JSON.stringify(body));
  req.end();
}
var dup=0;
function handleTulingResponse(resdata){
  try{
    var data = eval("("+resdata+")");
    var code = data.intent.code;
    var ret = '';
    for(var i=0;i<data.results.length;i++){
      var value=data.results[i].values;
      var type = data.results[i].resultType;
      ret = ret + value[type]+"\n";
    }
    if(ret.indexOf('请求次数超限制')>0){
      return '哇'
    }
    return ret.trim();
  }catch(e){
    console.log(e);
    console.log(data);
    return '';
  }

}




var mem={};

function saveLike(qq,add,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_like = db.collection('cl_like');
    var query = {'_id':qq};
    var now = new Date();
    cl_like.findOne(query, function(err, data) {
      if(!data){
        cl_like.save({'_id':qq,d:add,lv:1,ts:now})
        callback(0);
      }else{
        var old = data.d;
        var newlike = old+add;
        var newlv = Math.floor(Math.sqrt(newlike+10)-2);
        data.d=newlike;
        data.ts=now;
        var cbret = 0;
        if(newlv-data.lv==1){
          data.lv=newlv;
          cbret = newlv;
        }
        cl_like.save(data);
        callback(cbret);
      }
    });
  });
}


var mem={};
function getLike(qq,name,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_like = db.collection('cl_like');
    var query = {'_id':qq};
    var now = new Date();
    cl_like.findOne(query, function(err, data) {
      if(!data){
        callback('百百对【'+name+'】'+'的好感度为0');
      }else{
        var exp = '('+Math.floor(data.d*10) + "/" + Math.floor(((data.lv+3)*(data.lv+3)-10)*10)+')';
        if(!mem[qq]){
          mem[qq]=now.getTime();
          callback('百百对【'+name+'】'+'的好感度为'+data.lv+exp);
        }else{
          if(now.getTime()-mem[qq]>3600000){
            mem[qq]=now.getTime();
            callback('百百对【'+name+'】'+'的好感度为'+data.lv+exp);
          }else{
            callback('百百对【'+name+'】'+'的好感度为'+data.lv);
          }
        }
      }
    });
  });
}







module.exports={
  tulingMsg,
  getLike
}
