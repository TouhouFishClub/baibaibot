var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';


function saveChat(gid,uid,name,content){
  var now = new Date();
  var data = {'_id':now,gid:gid,uid:uid,n:name,d:content,ts:now.getTime()};
  MongoClient.connect(mongourl, function(err, db) {
    var cl_chat = db.collection('cl_chat');
    cl_chat.save(data);
  });
}

module.exports={
  saveChat
}