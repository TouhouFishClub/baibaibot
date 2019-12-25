var http = require('http');
var https = require('https');
var request = require('request');
var fs = require('fs');

var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var path = require('path');
var fs = require('fs');


var udb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
  });
}



function runsetu(content,gid,qq,callback){
  var url = 'https://api.lolicon.app/setu/';
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
      var data = eval('('+body+')');
      console.log(data);
      var imgdata = data.data[0];
      imgdata._id = imgdata.pid;
      var cl_setu = udb.collection('cl_setu');
      var query = {'_id':imgdata.pid};
      cl_setu.findOne(query, function(err, data) {
        if (err) {
          console.log('mongo error2:!!!!!!!!!');
          console.log(err);
        } else {
          var filename = "../coolq-data/cq/data/image/send/setu/"+imgdata.pid;
          if (data) {
            if(fs.existsSync(filename)){
              var ret = '[CQ:image,file=send/setu/'+imgdata.pid+']';
              callback(ret);
            }else{
              var imgurl = imgdata.url;
              var imgreq = request({
                url: imgurl,
                method: "GET"
              }, function(error, response, body){
                if(error&&error.code){
                  console.log('pipe error catched!')
                  console.log(error);
                }
              }).pipe(fs.createWriteStream(filename));
              imgreq.on('close',function(){
                if(fs.existsSync(filename)) {
                  var ret = '[CQ:image,file=send/setu/' + imgdata.pid + ']';
                  callback(ret);
                }else{
                  fs.readdir('../coolq-data/cq/data/image/send/setu/',function(err,files){
                    var len = files.length;
                    var rdfile = files[Math.floor(Math.random()*len)];
                    var ret = '[CQ:image,file=send/setu/' + rdfile + ']';
                    callback(ret);
                  })
                }
              });
            }
          }else{
            var imgurl = imgdata.url;
            var imgreq = request({
              url: imgurl,
              method: "GET"
            }, function(error, response, body){
              if(error&&error.code){
                console.log('pipe error catched!')
                console.log(error);
              }
            }).pipe(fs.createWriteStream(filename));
            imgreq.on('close',function(){
              if(fs.existsSync(filename)) {
                cl_setu.save(imgdata);
                var ret = '[CQ:image,file=send/setu/' + imgdata.pid + ']';
                callback(ret);
              }else{
                fs.readdir('../coolq-data/cq/data/image/send/setu/',function(err,files){
                  var len = files.length;
                  var rdfile = files[Math.floor(Math.random()*len)];
                  var ret = '[CQ:image,file=send/setu/' + rdfile + ']';
                  callback(ret);
                })
              }
            });
          }
        }
      });
    }
  });
}


module.exports={
  runsetu
}