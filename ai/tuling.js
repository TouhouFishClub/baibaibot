var https=require('https');
var http = require('http');
var crypto = require('crypto');
const tulingApiKey = "9cca8707060f4432800730b2ddfb029b";
const tulingApiKey2 = "77cb8ddbbd4c48eb8eba9009ae769169";
const tulingApiKey3 = "8509c38c2cec4f9aa107ee56341a4179";
const tulingApiKey4 = "3d4fef8b895249468047a05196666cf7";
const tulingApiKey5 = "1e2460c2c13143b5becda32deab42742";

const {baiduVoice} = require('../ai/voice/baiduvoice')
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var limit = {};

var crypto = require('crypto');
var appid = 1107054322;
var appkey = 'Yw6WKnq3It2cnUqn';


var bosonnlp = require('bosonnlp');
var nlp = new bosonnlp.BosonNLP('A6Dvxzs0.25388.G_wPyy4DDLw-');

var tulingkeyindex=0;
var tulingkeyarr=[
  tulingApiKey,
  tulingApiKey2,
  tulingApiKey3,
  tulingApiKey4,
  tulingApiKey5
]

function tulingMsg3(userid,content,callback,groupid){
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
  body.userInfo.apiKey=tulingkeyarr[tulingkeyindex];
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
      if(ret!='哇'){
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
      }
      callback(ret);
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
    if(ret.indexOf('请求次数超限制')>=0){
      console.log(data);
      tulingkeyindex=tulingkeyindex+1;
      if(tulingkeyindex>=tulingkeyarr.length){
        tulingkeyindex=0;
      }
      return ''
    }
    return ret.trim();
  }catch(e){
    console.log(e);
    console.log(data);
    return '';
  }
}


function tulingMsg(userid,content,callback,groupid){

  getQAIresponse(userid,content,callback,groupid);

  // tulingMsg0(userid,content,callback,groupid);
}



function tulingMsg0(userid,content,callback,groupid){




  var options = {
    hostname: 'open.turingapi.com',
    port: 80,
    path: '/v1/openapi',
    method: 'POST',
    headers:{
      'Content-Type':'application/json;charset=UTF-8',
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
    }
  };
  var md5=crypto.createHash("md5");
  md5.update(groupid+"");
  var md5str=md5.digest('hex').toLowerCase();
  var openid = "";
  for(var i=0;i<md5str.length;i++){
    if(i==8||i==12||i==16||i==20){
      openid=openid+"-";
    }
    openid=openid+md5str[i];
  }

  var body = {"user_info":{"open_id":openid},"robot_id":"206427"};
  body.input_text=content;
  console.log(body);
  var req = http.request(options, function (res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      try{
        var ret = '';
        var data = eval('('+resdata+')');
        var code = data.code;
        if(code==200){
          var result = data.result;
          if(result){
            var datas = result.datas;
            if(datas){
              for(var i=0;i<datas.length;i++){
                ret = ret + datas[i].value+"\n";
              }
            }
          }
        }
        ret = ret.trim();
        if(ret!='哇'){
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
        }
        callback(ret);
      }catch(e){

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










var mem={};

function saveLike(qq,add,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_like = db.collection('cl_like');
    var query = {'_id':qq};
    var now = new Date();
    cl_like.findOne(query, function(err, data) {
      if(err){
        console.log('mongo errorc:!!!!!!!!!');
        console.log(err);
      }else {
        if (!data) {
          cl_like.save({'_id': qq, d: add, lv: 1, ts: now})
          callback(0);
        } else {
          var old = data.d;
          var newlike = old + add;
          var newlv = Math.floor(Math.sqrt(newlike + 10) - 2);
          data.d = newlike;
          data.ts = now;
          var cbret = 0;
          if (newlv - data.lv == 1) {
            data.lv = newlv;
            cbret = newlv;
          }
          cl_like.save(data);
          callback(cbret);
        }
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
        callback('百百对【'+name+'】'+'的好感度为'+data.lv+"级.\n让百百开心会使百百对你的好感度提升哦,让我难过的话百百会变得讨厌你的");
        // var exp = '('+Math.floor(data.d*10) + "/" + Math.floor(((data.lv+3)*(data.lv+3)-10)*10)+')';
        // if(!mem[qq]){
        //   mem[qq]=now.getTime();
        //   callback('百百对【'+name+'】'+'的好感度为'+data.lv);
        // }else{
        //   // if(now.getTime()-mem[qq]>3600000){
        //   //   mem[qq]=now.getTime();
        //   //   callback('百百对【'+name+'】'+'的好感度为'+data.lv+exp);
        //   // }else{
        //
        //   // }
        // }
      }
    });
  });
}
















function getQAIresponse(userid,content,callback,groupid){
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

  if(content.toUpperCase().indexOf('CQ:')>=0){
    return;
  }





  var now = new Date();
  var tss = Math.floor(now.getTime()/1000) ;
  var nonce = 987654154;
  var session_id = groupid
  var body = {
    app_id:appid+"",
    session:session_id+"",
    question:content,
    time_stamp:tss+"",
    nonce_str:nonce+""
  }
  var param = signParam(body);

  var options = {
    host: 'api.ai.qq.com',
    port: 443,
    path: '/fcgi-bin/nlp/nlp_textchat?'+param,
    method: 'GET',
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      if(data.ret==0){
        var ret = data.data.answer;
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
            callback('啊呜，百百好像反应不过来了哇哇哇哇哇！');
          }
        });
        callback(ret)
      }else{

      }
      console.log(resdata);
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.write(JSON.stringify(body));
  req.end();
}

function signParam(data){
  var keys = Object.keys(data);
  var str = "";
  var rstr = "";
  keys.sort();
  for(var i=0;i<keys.length;i++){
    rstr = rstr + keys[i] + "=" + encodeURIComponent(data[keys[i]]) + "&";
    str = str + keys[i] + "=" + encodeURIComponent(data[keys[i]]).replace(/%20/g,'+') + "&";
  }

  str = str + "app_key="+appkey;
  console.log(str);
  var md5=crypto.createHash("md5");
  md5.update(str);
  var md5str=md5.digest('hex').toUpperCase();
  return rstr+"&sign="+md5str;
}













module.exports={
  tulingMsg,
  getLike,
  getQAIresponse
}
