var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var fs = require('fs');
var namestart = '000娘';

function getNameList(startname){
  if(!startname){
    startname=namestart;
  }
  if(startname=="p"){
    return;
  }

  var option = {
    host: 'zh.moegirl.org',
    port: 443,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/Category:'+encodeURIComponent('东方正作人物')
  };
  console.log('\n\n=====================================')
  console.log("will fetch from:"+startname);
  console.log(option);
  console.log('=====================================\n\n')
  var req = https.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      console.log(resdata);
      var l1='<li><a href=';
      var s0=resdata;
      var n1 = s0.indexOf('下一页');
      var s1 = s0.substring(n1+10);
      var n2 = s1.indexOf('下一页');
      var s = s0;
      var nextstart = "p";
      while(true){
        fs.writeFileSync("1.txt",s);
        var n = s.indexOf(l1);
        var d = s.substring(0,n);
        if(d.length<500&&d.endsWith('</a></li>\n')){
          var n1 = d.indexOf('"');
          var d1 = d.substring(n1+1);
          var n2 = d1.indexOf('"');
          var href = d1.substring(0,n2);
          var n3 = d.indexOf('>');
          var n4 = d.indexOf('<');
          var name = d.substring(n3+1,n4);
          console.log(href,name);
          saveIndex(href,name);
          nextstart = name;
        }
        s = s.substring(n+l1.length);
        if(n<0){
          break;
        }
      }
      //getNameList(nextstart);
    });
  })
  req.end();
}

function saveIndex(href,name){
  console.log(href,name);
  MongoClient.connect(mongourl, function(err, db) {
    var cl_card = db.collection('cl_card');
    var query = {'_id':name};
    cl_card.findOne(query, function(err, data) {
      if(data){
        console.log('has saved:'+name);
      }else{
        var data = {'_id':name,href:href};
        cl_card.save(data);
      }
      db.close();
    });
  });
}



module.exports={
  getNameList
}