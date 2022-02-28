var https=require('https');
var http = require('http');
var fs = require('fs');
const phantom = require('phantom');
const {baiduocr} = require('../image/baiduocr');

var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongoff14url
var path = require('path');
var request = require("request");
var fs = require('fs');


var udb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
  });
}


function updateCNNameByID(itemid){
  if(itemid%5==0){
    console.log(itemid);
  }
  var options = {
    host: 'cdn.huijiwiki.com',
    port: 80,
    path: '/ff14/api.php?format=json&action=parse&disablelimitreport=true&prop=text&text=%7B%7BItemTooltip%7Cid='+itemid+'%7D%7D',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      if(res.statusCode==200){
        var data = eval('('+resdata+')');
        var text = data.parse.text['*'];
        var n1 = text.indexOf('tooltip-item--name-title');
        var s1 = text.substring(n1);
        var n2 = s1.indexOf('>');
        var s2 = s1.substring(n2+1);
        var n3 = s2.indexOf('<');
        var itemname = s2.substring(0,n3);
        var cl_ff14_item = udb.collection('cl_ff14_item');
        cl_ff14_item.updateOne({'_id':itemid},{'$set':{cn_name:itemname}});
        updateCNNameByID(itemid+1);
      }
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

module.exports={
  updateCNNameByID
}