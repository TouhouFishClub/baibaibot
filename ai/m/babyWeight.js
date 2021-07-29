var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_baby';
var udb;
initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
  });
}


function saveBabyData(weight,height,head,backup,callback){
  var cl_baby_info=udb.collection("cl_baby_info");
  var now = new Date();
  var data = {'_id':now.getTime(),weight:weight,height:height,head:head,backup:backup,ts:now};
  cl_baby_info.save(data,function(){
    callback('ok');
  })
}

function getBabyData(callback){
  var cl_baby_info=udb.collection("cl_baby_info");
  cl_baby_info.find().toArray(function(error,list){
    callback(list);
  })
}

module.exports={
  saveBabyData,
  getBabyData
}