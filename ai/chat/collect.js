var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';


function saveChat(gid,uid,name,content,port){
  if(gid=='568281876'){
    return;
  }
  var now = new Date();
  var data = {'_id':now,gid:gid,uid:uid,n:name,d:content,ts:now.getTime(),port:port};
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo erro4r:!!!!!!!!!');
    }else{
      var cl_chat = db.collection('cl_chat');
      cl_chat.save(data);
      db.close();
    }

  });
}

function getChat(gid,ts,callback,order,qq,keyword){
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo erro5re:!!!!!!!!!');
      console.log(err)
    }else {
      var cl_chat = db.collection('cl_chat');
      var query = {gid: parseInt(gid)};
      if(qq!=null){
        query.uid=parseInt(qq);
      }

      if (parseInt(ts) > 0) {
        if (order) {
          query._id = {'$gt': new Date(parseInt(ts))};
          if(keyword&&keyword.length>1){
            query.d=new RegExp(keyword);
            query._id['$lt']=new Date(parseInt(ts)+86400000);
          }
        } else {
          query._id = {'$lt': new Date(parseInt(ts))};
          if(keyword&&keyword.length>1){
            query.d=new RegExp(keyword);
            query._id['$gt']=new Date(parseInt(ts)-86400000);
          }
        }
      }else{
        if(keyword&&keyword.length>1){
          query.d=new RegExp(keyword);
          query._id = {'$gt': new Date(new Date().getTime()-86400000)};
        }
      }
      console.log(query);
      var wr = cl_chat.find(query).limit(50);
      if (order) {
        wr.sort({ts: 1})
      }
      wr.toArray(function (err, arr) {
        callback(arr);
      })
      db.close();
    }
  });
}

function getImage(ts,set,callback){
  MongoClient.connect(mongourl, function(err, db) {
    if(err){
      console.log('mongo erro5re:!!!!!!!!!');
      console.log(err)
    }else {
      var cl_stu = db.collection('cl_stu_'+set);
      var query = {gid: parseInt(gid)};
      var head = '[CQ:image,file=send/save/';

      if (parseInt(ts) > 0) {
        query._id={'$lt':head+ts};
      }else{
        query._id={'$lt':head+3};
      }
      console.log(query);
      var wr = cl_stu.find(query).limit(100);
      wr.toArray(function (err, arr) {
        callback(arr);
      })
      db.close();
    }
  });
}




module.exports={
  saveChat,
  getChat,
  getImage
}