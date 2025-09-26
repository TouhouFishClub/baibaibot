var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../baibaiConfigs').mongourl
var path = require('path');
var request = require("request");
var fs = require('fs');


var udb;
var dbConnectionFailed = false;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    if(err) {
      console.error('MongoDB connection failed:', err);
      dbConnectionFailed = true;
      udb = null;
    } else {
      console.log('MongoDB connected successfully');
      udb = db;
      dbConnectionFailed = false;
    }
  });
}



let saveImage = function(url){
  var now = new Date();
  var rd = Math.floor(Math.random()*8888+1000);
  var filename = "../coolq-data/cq/data/image/send/save/"+now.getTime()+rd+".png";
  var req = request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }
  }).pipe(fs.createWriteStream(filename));
  req.on('close',function(){
    console.log(filename);
  });
  var image = '[CQ:image,file=send/save/'+now.getTime()+rd+'.png]';
  return image;
}


function searchss(answer,groupid,callback){
    var cl_txt = udb.collection('cl_txt');
    var query = {'_id':{"$gt":groupid+"_","$lt":groupid+"~"}};
    if(answer.length>0){
      query._id["$regex"]=new RegExp(answer);
    }
    cl_txt.find(query).limit(15).toArray(function(err,list){
      if(err){
        console.log('db err'+err);
      }else{
        var ret = "已记录词条\n";
        var frontlength = (groupid+"").length+1;
        for(var i=0;i<list.length;i++){
          ret = ret + list[i]._id.substring(frontlength)+"\n";
        }
        callback(ret.trim())
      }
    });
}


saveTxt = function(ask,answer,name,groupName,callback,from,groupid){

  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo error1:!!!!!!!!!')
      console.log(err);
    }else {
      if(ask.trim()=="ss"){
        searchss(answer,groupid,callback);
        return;
      }
      var cl_txt = db.collection('cl_txt');
      ask = ask.trim();
      /* 增加banids */
      let banIds = [], banall = false
      if(answer.indexOf('--banall') >= 0) {
        let sp = answer.split('--banall')
        banall = true
        answer = sp[0]
      } else if(answer.indexOf('--ban') >= 0) {
        let sp = answer.split('--ban')
        answer = sp[0]
        if(sp[1].length) {
          let str = sp[1].trim()
          let bans = str.replace(/[， ]/g, ',').split(',').map(x => x.trim())
          banIds = bans.map(x => {
            x = x.trim()
            if(x.startsWith('qq=')){
              return x.substring(x.indexOf('qq=') + 3, x.indexOf(']'))
            } else {
              return x
            }
          }).filter(id => id.match(/^\d+$/))
        }
      }
      answer = answer.trim();

      var ra = "";
      var s1 = answer;
      var n = s1.indexOf("[CQ:image");
      var imglist = [];
      while (n >= 0) {
        var n1 = s1.indexOf(']');
        var head = s1.substring(0, n);
        var tail = s1.substring(n1 + 1);
        var image = s1.substring(n, n1 + 1);
        var n2 = image.indexOf("https://gchat.qpic.cn");
        var n22 = image.indexOf("http://gchat.qpic.cn");
        var n222 = image.indexOf("https://multimedia.nt.qq.com.cn");
        if(n22>=0&&n2<0){
          n2=n22;
        }
        if(n222>=0&&n2<0){
          n2=n222;
        }
        if (n2 > 0) {
          var n3 = image.indexOf("?");
          var url = image.substring(n2, n1);
          url = url.split(',')[0]
          url = url.replace(/&amp;/g, '&')
          image = saveImage(url);
          imglist.push(image);
        }
        s1 = tail;
        n = s1.indexOf("[CQ:image");
        ra = ra + head + image;
      }
      ra = ra + s1;
      if(ask.startsWith("图")&&ask.length==2&&imglist.length>0){
        var sets = ask.substring(1,2);
        var seti = parseInt(sets);
        if(seti>1&&seti<6){
          var cl_stu = db.collection('cl_stu_'+sets);
          for(var i=0;i<imglist.length;i++){
            var img = imglist[i];
            cl_stu.save({'_id':img,ts:new Date()})
          }

          callback('图' +seti+ '添加成功');
        }
      }else{
        var query = {'_id': groupid+"_"+ask};
        cl_txt.findOne(query, function (err, data) {
          if(err){
            console.log('mongo erro3r:!!!!!!!!!');
          }else {
            if (data) {
              if(data.banall && from != data.f) {
                callback(`你不能操作这个词条哦~`)
                return
              }
              if(data.ban && new Set(data.ban).has(from)) {
                callback(`你不能操作这个词条哦~`)
                return
              }
              if (data.lock) {
                if (from == 0) {
                  save(ask, ra, callback, cl_txt, name, groupName, db, from, groupid, new Set(banIds), banall);
                } else {
                  callback('记住 "' + ask + '" 了哇');
                }
              } else {
                save(ask, ra, callback, cl_txt, name, groupName, db, from, groupid, new Set(banIds), banall);
              }
            } else {
              save(ask, ra, callback, cl_txt, name, groupName, db, from, groupid, new Set(banIds), banall);
            }
          }
        });
      }


    }
  });
}

function save(ask,answer,callback,cl_txt,name,groupName,db,from,groupid,banIdSet,banall){
  if(286295903 == from && ask.indexOf('石膏') > -1){
    callback(`你不能操作这个词条哦~`)
    return
  }
  if(256760434 == from && ask.indexOf('妖姨') > -1){
    callback(`你不能操作这个词条哦~`)
    return
  }
  if(799018865 == from && ask.indexOf('阿斯达克') > -1){
    callback(`你不能操作这个词条哦~`)
    return
  }
  if(ask.length>0){
    if(answer==""){
      if(1007753332 == from) {
        callback('服务器维护中，不能删除任何词条')
        return
      }
      cl_txt.remove({'_id':groupid+"_"+ask});
      callback('忘记 "'+ask+'" 了哇');
    }else{
      var data = {'_id':groupid+"_"+ask,d:answer,n:name,g:groupName,gid:groupid,f:from,ask_count:0};
      if(banall) {
        data.banall = true
      } else {
        data.banall = false
      }
      if(banIdSet.size) {
        data.ban = Array.from(banIdSet).map(x => parseInt(x))
      }
      if(from==0){
        data.lock=1;
        data.all=1;
      }
      if(ask=="rankkey"){
        delete(data["lock"]);
        delete(data["all"]);
      }
      cl_txt.save(data);
      callback('记住 "'+ask+'" 了哇');
    }
  }
  db.close();
}

var mem={};
var {handleSenkaReply} = require('../ai/kancolle/senka2');
answer = function(ask,name,groupName,callback,groupid,from){
  const {reply} = require('../baibai2');
  var Ncallback = function(ret){
    var first = ret.substring(0,1);
    if(first=='`'||first=='·'||first=='ˋ'||first=="'"||first=="'"||first=="，"){
      reply(ret.substring(1),name,callback,groupid,from,groupName,name);
    }else if(ret.startsWith("z8")){
      handleSenkaReply(ret.trim(),groupid,from,callback)
      return;
    }else{
      callback(ret);
    }
  }
  if(ask.length>0&&udb&&!dbConnectionFailed){
    // console.log(`\n\n\n\n===\ngroupid: ${groupid}\nask:${ask}\n===\n\n\n\n`)
    var cl_txt = udb.collection('cl_txt');
    var query = {'_id':groupid+"_"+ask};
    cl_txt.findOneAndUpdate(query, {'$inc': {'ask_count': 1}}, function(err, { value }) {
    // cl_txt.findOne(query, function(err, data) {
      if(err){
        console.log('mongo error2:!!!!!!!!!');
        console.log(err);
        callback(null); // 添加错误情况下的回调
      }else {
        if (value) {
					// console.log('=================')
					// console.log(value)
          if (value.all || value.g == groupName || value.gid == groupid) {
            var thend = mem[name];
            var now = new Date().getTime();
            if (thend) {
              var then = thend.ts;
              var tc = thend.c;
              if (now - then > 60000) {
                mem[name] = {ts: now, c: 1};
                Ncallback(value.d);
              } else if (now - then > 2000 * tc - 1000) {
                mem[name] = {ts: now, c: tc + 1};
                Ncallback(value.d);
              } else {
                // 频率限制情况下也要调用回调
                callback(null);
              }
            } else {
              mem[name] = {ts: now, c: 1};
              Ncallback(value.d);
            }
            console.log(name, mem[name]);
          } else {
            // 权限不匹配时也要调用回调
            callback(null);
          }
        } else {
          callback(null)
        }
      }
    });
  } else {
    // ask长度为0或udb不存在时也要调用回调
    callback(null);
  }
}


var ld = {};
function getMsgCount(port){
  var start = new Date(Math.floor(new Date().getTime()/86400000)*86400000);
  var cl_chat = udb.collection('cl_chat');
  var query = {"_id":{"$gt":start},port:port,n:"百百"};
  cl_chat.count(query,function(err, data){
    ld[port]=data;
  });
  return ld[port]?ld[port]:0;
}

module.exports = {
  saveTxt,
  answer,
  getMsgCount
};


