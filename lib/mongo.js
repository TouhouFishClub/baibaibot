var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

saveTxt = function(ask,answer,name,groupName,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_txt = db.collection('cl_txt');
    ask = ask.trim();
    answer = answer.trim();
    if(ask.length>0){
      if(answer==""){
        cl_txt.remove({'_id':ask});
        callback('忘记 "'+ask+'" 了哇');
      }else{
        data = {'_id':ask,d:answer,n:name,g:groupName};
        cl_txt.save(data);
        callback('记住 "'+ask+'" 了哇');
      }
    }
  });
}

answer = function(ask,name,groupName,callback){
  if(name){
    if(name.indexOf('百百')<0){
      ask=ask.trim();
    }
  }
  if(ask.length>0){
    MongoClient.connect(mongourl, function(err, db) {
      var cl_txt = db.collection('cl_txt');
      var query = {'_id':ask};
      cl_txt.findOne(query, function(err, data) {
        if(data){
          callback(data.d);
        }
      });
    });
  }
}

module.exports = {
  saveTxt,
  answer
};


