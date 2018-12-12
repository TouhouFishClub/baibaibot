var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';


function saveChat(gid,uid,name,content){
  if(gid=='568281876'){
    return;
  }
  var now = new Date();
  var data = {'_id':now,gid:gid,uid:uid,n:name,d:content,ts:now.getTime()};
  MongoClient.connect(mongourl, function(err, db) {
    var cl_chat = db.collection('cl_chat');
    cl_chat.save(data);
  });
}

function getChat(gid,ts,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_chat = db.collection('cl_chat');
    var query = {gid:parseInt(gid)};
    if(parseInt(ts)>0){
      query._id={'$lt':new Date(parseInt(ts))};
    }
    console.log(query);
    cl_chat.find(query).limit(50).toArray(function(err,arr){
      callback(arr);
    })
  });
}



module.exports={
  saveChat,
  getChat
}