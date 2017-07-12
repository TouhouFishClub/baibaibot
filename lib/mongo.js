var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

export const saveTxt = function(ask,answer,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_txt = db.collection('cl_txt');
    data = {'_id':ask,d:answer};
    cl_txt.save(data);
    callback('记住'+ask+'了哇');
  });
}

export const answer = function(ask,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_txt = db.collection('cl_txt');
    var query = {'_id':ask};
    cl_vfy.findOne(query, function(err, data) {
      if(data){
        callback(data.d);
      }
    });
  });
}


