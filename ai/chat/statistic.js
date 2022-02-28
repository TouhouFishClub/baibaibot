var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongourl;



var mem = {};
function s1(){
  var gid = 616147379;
  var qq = 357474405;
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo errorf:!!!!!!!!!');
      console.log(err);
    }else {
      var cl_chat = db.collection('cl_chat');
      var query = {gid: parseInt(gid)};
      var then = new Date();
      then.setHours(0);
      then.setMinutes(0);
      then.setSeconds(1);
      query._id = {'$gt': then};
      console.log(query);
      cl_chat.find(query).toArray(function (err, arr) {
        mem[gid] = arr;
        console.log(arr.length);
        s2(gid, qq);
      })
    }
  });
}

function s2(gid,qq){
  var chata = mem[gid];
  var l1,l2,l3;
  for(var i=0;i<chata.length;i++){
    var d = chata[i].d;
    var uid = chata[i].uid;

    if(uid==qq){

    }
  }
}


module.exports={
  s1
}