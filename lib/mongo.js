var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var path = require('path');
const {reply} = require(path.join(__dirname, '../baibai2'))

saveTxt = function(ask,answer,name,groupName,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_txt = db.collection('cl_txt');
    ask = ask.trim();
    answer = answer.trim();
    var query = {'_id':ask};
    cl_txt.findOne(query, function(err, data) {
      if(data){
        if(data.lock){
          callback('记住 "'+ask+'" 了哇');
        }else{
          save(ask,answer,callback,cl_txt,name,groupName,db);
        }
      }else{
        save(ask,answer,callback,cl_txt,name,groupName,db);
      }
    });
  });
}

function save(ask,answer,callback,cl_txt,name,groupName,db){
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
  db.close();
}

var mem={};
answer = function(ask,name,groupName,callback,groupid,from){
  console.log(reply);
  var Ncallback = function(ret){
    var first = ret.substring(0,1);
    if(first=='`'||first=='·'||first=='ˋ'||first=="'"||first=="‘"||first=="，"){
      reply(ret.substring(1),name,callback,groupid,from,groupName,name);
    }else{
      callback(ret);
    }
  }
  if(ask.length>0){
    MongoClient.connect(mongourl, function(err, db) {
      var cl_txt = db.collection('cl_txt');
      var query = {'_id':ask};
      cl_txt.findOne(query, function(err, data) {
        if(data){
          if(data.g==groupName){
            var d=data.d;
            var thend = mem[name];
            var now = new Date().getTime();
            if(thend){
              var then = thend.ts;
              var tc = thend.c;
              if(now-then>60000){
                mem[name]={ts:now,c:1};
                Ncallback(data.d);
              }else if(now-then>2000*tc-1000){
                mem[name]={ts:now,c:tc+1};
                Ncallback(data.d);
              }else{
                //
              }
            }else{
              mem[name]={ts:now,c:1};
              Ncallback(data.d);
            }
            console.log(name,mem[name]);
          }
        }
        db.close();
      });
    });
  }
}

var map={};
function savea(content,name,groupName,callback){
  var cl_qa = db.collection('cl_qa');
  var query = {'_id':content};
  cl_qa.findOne(query, function(err, data) {
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

}


module.exports = {
  saveTxt,
  answer
};


