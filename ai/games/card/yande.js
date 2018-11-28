var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var fs = require('fs');
var request = require('request');
const {checknsfw} = require('./checkNSFW');


var udb;
var cl_ydb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
    cl_ydb = db.collection('cl_ydb');
  });
}

function fetchYande(id,callback){

  var filename = "../coolq-data/cq/data/image/send/ydb/"+id+".png";
  var exist = fs.existsSync(filename);
  if(exist){
    callback('[CQ:image,file=send/ydb/'+id+'.png]');
    return;
  }
  var option = {
    host: 'yande.re',
    port: 443,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/post/show/'+id
  };
  console.log('\n\n=====================================')
  console.log("will fetch from:"+id+":");
  console.log(option);
  console.log('=====================================\n\n')
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    if(res.statusCode==200){
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function(){
        resdata=resdata.toLowerCase();
        var n1 = resdata.indexOf('<div id="note-container">');
        if(n1>0){
          var s1 = resdata.substring(n1+2);
          var n2 = s1.indexOf('alt="');
          var s2 = s1.substring(n2+5);
          var n3 = s2.indexOf('"');
          var alt = s2.substring(0,n3);
          console.log(alt);
          var n4 = s1.indexOf('src="');
          var s4 = s1.substring(n4+5);
          var n5 = s4.indexOf('"');
          var src = s4.substring(0,n5);
          console.log(src);

          var filename = 'public/ydb/'+id;
          var list = alt.split(' ');
          var reqs = request({
            url: src,
            method: "GET",
            headers:{
              'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
            }
          }, function(error, response, body){
            if(error&&error.code){
              console.log('pipe error catched!')
              console.log(error);
            }
          }).pipe(fs.createWriteStream(filename));
          reqs.on('close',function(){
            var imgurl = 'http://192.168.17.52:10086/ydb/'+id;
            checknsfw(imgurl,function(ret){
              if(ret!=0){
                var desfilename = "../coolq-data/cq/data/image/send/ydb/"+id+"";
                fs.rename(filename,desfilename,function(){
                  callback('[CQ:image,file=send/ydb/'+id+']');
                })
              }else{
                callback(0);
              }
            })
          });
        }
      })
    }else{
      callback(0);
    }
  });
  req.on('error', function(err) {
    callback(0);
  });
  req.end();
}


module.exports={
  fetchYande
}
