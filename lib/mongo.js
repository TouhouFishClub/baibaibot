var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

saveTxt = function(ask,answer,name,groupName,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_txt = db.collection('cl_txt');
    ask = ask.trim();
    answer = answer.trim();
    var query = {'_id':ask};
    cl_txt.findOne(query, function(err, data) {
      if(data){
        if(data.lock){
          callback('由于"'+ask+'"已被锁定,记不住'+ask+'了哇');
        }else{
          save(ask,answer,callback,cl_txt,name,groupName);
        }
      }else{
        save(ask,answer,callback,cl_txt,name,groupName);
      }
    });
  });
}

function save(ask,answer,callback,cl_txt,name,groupName){
  if(ask.length>0){
    if(answer==""){
      cl_txt.remove({'_id':ask});
      callback('忘记 "'+ask+'" 了哇');
    }else{
      var data = {'_id':ask,d:answer,n:name,g:groupName};
      cl_txt.save(data);
      callback('记住 "'+ask+'" 了哇');
    }
  }
}

var mem={};
answer = function(ask,name,groupName,callback){
  if(ask.length>0){
    MongoClient.connect(mongourl, function(err, db) {
      var cl_txt = db.collection('cl_txt');
      var query = {'_id':ask};
      cl_txt.findOne(query, function(err, data) {
        if(data){
          if(data.g==groupName){
            var d=data.d;
            var thend = mem[d];
            if(thend){
              var then = thend.ts;
              var now = new Date().getTime();
              if(now-then>60000){
                mem[d]={ts:now,c:1};
                callback(data.d);
              }else{
                thend.c=thend.c+1;
                if(thend.c>10){

                }else{
                  mem[d]=thend;
                  callback(data.d);
                }
              }
            }else{
              mem[d]={ts:new Date().getTime(),c:1};
              callback(data.d);
            }
          }
        }
      });
    });
  }
}

module.exports = {
  saveTxt,
  answer
};


