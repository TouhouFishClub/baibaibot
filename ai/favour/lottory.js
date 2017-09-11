var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';

function start(groupName,groupuin,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_lottory = db.collection('cl_lottory');
    var now = new Date();
    var no = Math.floor(now/3600000);
    var id = groupName+"_"+no;
    var left = 3600000-now.getTime()%3600000;
    var future = new Date(now.getTime()+left);
    var query = {'_id':id};
    cl_lottory.findOne(query, function(err, data) {
      if(data){

      }else{
        cl_lottory.save({'_id':id,u:{},ts:now,uin:groupuin,future:future});
        callback('百百大乐透第'+no+'期将于'+future.toLocaleString()+'开奖');
        setTimeout(function(){
          runlottory(id);
        },left);
      }
    });
  });
}

function add(userName,groupName,number,callback){
  MongoClient.connect(mongourl, function(err, db) {
    cl_lottory.findOne({'_id':id}, function(err, data) {
      if(data){
        if(data.u[userName]){
          var cl_user = db.collection('cl_user');
          var query = {'_id':userName};
          cl_user.findOne(query, function(err, data) {
            if(data){

            }else{
              init = {'_id':userName,hp:100,mp:100,tp:100,gold:100,lv:1,str:9,int:9,agi:9,love:0}
              data = init;
            }
            var cl_lottory = db.collection('cl_lottory');
            var now = new Date();
            var no = Math.floor(now/3600000);
            var id = groupName+"_"+no;
          });
        }else{

        }
      }else{

      }
    });
  });
}
















