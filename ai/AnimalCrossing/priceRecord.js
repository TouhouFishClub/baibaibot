var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
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

function saveDTCPrice(content,qq,gid,callback){
  var cl_animal_dtc = udb.collection('cl_animal_dtc');
  var query = {'_id':qq};
  content = content.toLowerCase().trim();
  var n = content.indexOf("utc+");
  var tz = 16;
  if(n>=0){
    tz = 2*parseInt(content.substring(n+4));
    content = content.substring(0,n);
  }
  if(tz>24||tz<-24){
    tz = 16;
  }

  var now = new Date();
  var fixnow = new Date(now.getTime()+(tz-16)*1800000);
  var day = Math.floor(fixnow.getTime()/86400000);
  var hour = fixnow.getHours();


  var p0=0;
  var p1=0;
  if(content.indexOf("-")>0){
    var pa = content.split("-");
    if(pa.length==2){
      p0 = parseInt(pa[0]);
      p1 = parseInt(pa[1]);
    }
  }else{
    if(hour<12){
      p0=parseInt(content);
    }else{
      p1=parseInt(content);
    }
  }




  cl_animal_dtc.findOne(query, function(err, data) {
    if (err) {
      console.log('mongo error2:!!!!!!!!!');
      console.log(err);
    } else {
      if(data){
        var ngid = true;
        var gidlist = data.gid;
        for(var i=0;i<gidlist.length;i++){
          if(gidlist[i]==gid){
            ngid = false;
          }
        }
        if(ngid){
          gidlist.push(gid);
          data.gid=gidlist;
        }
        var otz = data.tz;
        if(otz!=tz){
          data.tz=tz;
        }
        var dd = data.d;
        if(dd[day]){
          if(p0>0){
            dd[day].p0=p0;
          }
          if(p1>0){
            dd[day].p1=p1;
          }
          data.d=dd;
        }else{
          dd[day]={p0:p0,p1:p1}
          data.d=dd;
        }
        cl_animal_dtc.save(data);
      }else{
        var dd = {};
        dd[day]={p0:p0,p1:p1}
        cl_animal_dtc.save({"_id":qq,gid:[gid],d:dd,tz:tz});
      }

    }
  });
}


module.exports={
  saveDTCPrice
}