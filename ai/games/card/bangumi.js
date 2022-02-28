var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../../baibaiConfigs').mongourl;
var fs = require('fs');
const xml2js = require('xml2js')
var parser = new xml2js.Parser()
function fetchbangumi(id){
  var option = {
    host: 'bangumi.tv',
    port: 80,
    method: 'GET',
    headers:{
      'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
    },
    path: '/character/14329'
  };
  console.log('\n\n=====================================')
  console.log("will fetch from:"+id);
  console.log(option);
  console.log('=====================================\n\n')
  var req = http.request(option, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    if(res.statusCode==200){
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function(){

      });
    }else if(res.statusCode==500){

    }else{
      setTimeout(function(){
        fetchGame(id+1,[],1,"")
      },1000);
    }

  });
  req.end();
}



module.exports={
  fetchbangumi
}