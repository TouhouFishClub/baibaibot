var http = require('http');
var https = require('https');
var request = require('request');
var fs = require('fs');

var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../../baibaiConfigs').mongourl;
var path = require('path');
var fs = require('fs');


var udb;
var cl_user;
var cl_chat;

const ignoreSet = new Set([/*93117357,*/ 727605874, 7469496, 112084723])

initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
    cl_user = db.collection('cl_user');
    cl_chat = db.collection('cl_chat');
  });
}

var loliconapikey = "206321345fb37f224bcf77";
var loliconapikey2 = "283179575f3f8f3adf3600";

var cache = {};
var cacheg = {};
function runsetu(content,gid,qq,callback,port){
	if(ignoreSet.has(gid)) {
		return
	}
  var cooldown = 60000 * 120;
  var maxtimes = 1;
  var groupmax = 3;
  if(port!=23334){
      groupmax = 20;
      cooldown = 60000 * 10;
      maxtimes = 10;
  }
  var imgtype='image';
    if(content.substring(2)=="3"){
        imgtype='cardimage'
    }
  var now = new Date().getTime();
  if (cache[qq]) {
    var then = cache[qq].ts;
    var cc = cache[qq].c;
    if (now - then < cooldown) {
      if (cc >= maxtimes) {
        callback('【' + '[CQ:at,qq='+qq+']' + '】的炼铜技能CD中!恢复时间：' + new Date(then + cooldown).toLocaleString());
        return;
      } else {
        cache[qq] = {ts: now, c: cc + 1};
      }
    } else {
      cache[qq] = {ts: now, c: 1};
    }
  } else {
    cache[qq] = {ts: now, c: 1};
  }

  if(!cache[gid]){
    cache[gid]={num:1,ts:now};
  }else{
    cache[gid].num=cache[gid].num+1;
  }
  if(cache[gid].num>groupmax){
      if(now-cache[gid].ts>cooldown){
          cache[gid]={num:1,ts:now};
      }else{
          callback('【' + '[CQ:at,qq='+qq+']' + '】的炼铜技能CD中!恢复时间：' + new Date(cache[gid].ts + cooldown).toLocaleString());
          return;
      }
  }



  var apikey;
  if(Math.random()<0.5){
      apikey = loliconapikey;
  }else{
      apikey = loliconapikey2;
  }
  var url = 'https://api.lolicon.app/setu/v2?tag=%E8%90%9D%E8%8E%89%7C%E5%B0%91%E5%A5%B3';

    request({
    headers:{
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
    },
    url: url,
  }, function(error, response, body) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
        var data = eval('(' + body + ')');
        if (data.code == 429) {
            fs.readdir('../coolq-data/cq/data/image/send/setu/', function (err, files) {
                var len = files.length;
                var rdfile = files[Math.floor(Math.random() * len)];
                var ret = '' + '[CQ:'+imgtype+',file=send/setu/' + rdfile + ']';
                callback(ret);
            })
        } else {
            var imgdata = data.data[0];
            imgdata._id = imgdata.pid;
            var cl_setu = udb.collection('cl_setu');
            var query = {'_id': imgdata.pid};
            cl_setu.findOne(query, function (err, data) {
                if (err) {
                    console.log('mongo error2:!!!!!!!!!');
                    console.log(err);
                } else {
                    var filename = "../coolq-data/cq/data/image/send/setu/" + imgdata.pid;
                    if (data) {
                        if (fs.existsSync(filename)) {
                            var ret = '[CQ:'+imgtype+',file=send/setu/' + imgdata.pid + ']';
                            callback(ret);
                        } else {
                            var imgurl = imgdata.url;
                            var imgreq = request({
                                url: imgurl,
                                method: "GET",
                                proxy:'http:192.168.17.241:2346'
                            }, function (error, response, body) {
                                if (error && error.code) {
                                    console.log('pipe error catched!')
                                    console.log(error);
                                }
                            }).pipe(fs.createWriteStream(filename));
                            imgreq.on('close', function () {
                                if (fs.existsSync(filename)) {
                                    var ret = '[CQ:'+imgtype+',file=send/setu/' + imgdata.pid + ']';
                                    callback(ret);
                                } else {
                                    fs.readdir('../coolq-data/cq/data/image/send/setu/', function (err, files) {
                                        var len = files.length;
                                        var rdfile = files[Math.floor(Math.random() * len)];
                                        var ret = '' + '[CQ:'+imgtype+',file=send/setu/' + rdfile + ']';
                                        callback(ret);
                                    })
                                }
                            });
                        }
                    } else {
                        var imgurl = imgdata.url;
                        var imgreq = request({
                            url: imgurl,
                            method: "GET"
                        }, function (error, response, body) {
                            if (error && error.code) {
                                console.log('pipe error catched!')
                                console.log(error);
                            }
                        }).pipe(fs.createWriteStream(filename));
                        imgreq.on('close', function () {
                            if (fs.existsSync(filename)) {
                                cl_setu.save(imgdata);
                                var ret = '' + '[CQ:'+imgtype+',file=send/setu/' + imgdata.pid + ']';
                                callback(ret);
                            } else {
                                fs.readdir('../coolq-data/cq/data/image/send/setu/', function (err, files) {
                                    var len = files.length;
                                    var rdfile = files[Math.floor(Math.random() * len)];
                                    var ret = '' + '[CQ:'+imgtype+',file=send/setu/' + rdfile + ']';
                                    callback(ret);
                                })
                            }
                        });
                    }
                }
            });
        }
    }
  });
}


module.exports={
  runsetu
}
