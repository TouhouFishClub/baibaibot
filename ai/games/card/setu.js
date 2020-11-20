var http = require('http');
var https = require('https');
var request = require('request');
var fs = require('fs');

var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var path = require('path');
var fs = require('fs');


var udb;
var cl_user;
var cl_chat;
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
function runsetu(content,gid,qq,callback,port){
  var cooldown = 60000 * 10;
  var maxtimes = 2;
  if(port!=23334){
    cooldown = 60000 * 10;
    maxtimes = 10;
  }
  var imgtype='image';
  if(port==24334){
      imgtype='cardimage'
  }else if(port==25334){
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
    cache[gid]=1;
  }else{
    cache[gid]=cache[gid]+1;
  }
  if(cache[gid]==10||(cache[gid]%100)==99){
    callback('炼铜引擎1:【炼铜】\n炼铜引擎2:【炼铜2】\n炼铜引擎3:【炼铜3】\n');
  }



  var apikey;
  if(Math.random()<0.5){
      apikey = loliconapikey;
  }else{
      apikey = loliconapikey2;
  }
  var url = 'http://api.lolicon.app/setu/?apikey='+apikey;

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
        console.log(data);
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
                                method: "GET"
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
