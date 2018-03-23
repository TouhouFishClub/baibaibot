var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';


function saveSt(userName,id,content,groupid,callback){
  if(!groupid.startsWith("61614")){
    return;
  }
  if(content.startsWith("甲鱼")){
    MongoClient.connect(mongourl, function(err, db) {
      var cl_winter_2018 = db.collection('cl_winter_2018');
      var doc = {'_id':id,gid:groupid,d:content,u:userName,type:1,ts:new Date()};
      cl_winter_2018.save(doc);
      callback('甲鱼+1');
    });
  }else{
    MongoClient.connect(mongourl, function(err, db) {
      var cl_winter_2018 = db.collection('cl_winter_2018');
      var doc = {'_id':id,gid:groupid,d:content,u:userName,type:2,ts:new Date()};
      cl_winter_2018.save(doc);
      callback('咸鱼+1');
    });
  }
}


function searchMedal(content,groupid,callback){
  if(!groupid.startsWith("61614")){
    return;
  }
  MongoClient.connect(mongourl, function(err, db) {
    var cl_winter_2018 = db.collection('cl_winter_2018');
    cl_winter_2018.find().toArray(function(err,arr){
      var ret1 = "";
      var ret2 = "";
      for(var i=0;i<arr.length;i++){
        var data = arr[i];
        if(data.type==1){
          var d=data.d;
          var n = d.indexOf("CQ:image");
          if(n>0){
            var d1 = d.substring(n)
            var n1 = d1.indexOf("https://gchat.qpic");
            var n2 = d1.indexOf("?");
            var url = d1.substring(n1,n2);
            ret1 = ret1 + data.u+"\nQQ:"+data._id+"\n"+url+"\n\n";
          }else{
            ret1 = ret1 + data.u+"\nQQ:"+data._id+"\n\n";
          }
        }else{
          var d=data.d;
          var n = d.indexOf("CQ:image");
          if(n>0){
            var d1 = d.substring(n)
            var n1 = d1.indexOf("https://gchat.qpic");
            var n2 = d1.indexOf("?");
            var url = d1.substring(n1,n2);
            ret2 = ret2 + data.u+"\nQQ:"+data._id+"\n"+url+"\n\n";
          }else{
            ret2 = ret2 + data.u+"\nQQ:"+data._id+"\n\n";
          }
        }
      }
      callback("甲鱼：\n"+ret1);
      callback("咸鱼：\n"+ret2);
    })
  });
}

module.exports={
  saveSt,
  searchMedal
}