var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../baibaiConfigs').mongourl;



function play(content,userName,groupName,callback){
  MongoClient.connect(mongourl, function(err, db) {
    var cl_user = db.collection('cl_user');
    var query = {'_id':userName};
    var now = new Date();
    var dur = Math.floor(Math.random()*666666+123456);
    var endtime = new Date(now.getTime()+dur);
    cl_user.findOne(query, function(err, data) {
      if(data){
        var end = data.end;
        if(now.getTime()>end.getTime()){
          var sub = now.getTime()-end.getTime();
          var add = Math.floor(sub/60000);
          var newhp = (data.hp+add)>(100*lv)?(100*lv):(data.hp+add);
          var newmp = (data.mp+add)>(100*lv)?(100*lv):(data.mp+add);
          var newtp = (data.tp+add)>(100*lv)?(100*lv):(data.tp+add);
          cl_user.updateOne(query,{'$set':{start:now,end:endtime,hp:newhp,mp:newmp,tp:newtp}});
          playstart();
        }else{
          //nowplay();
        }
      }else{
        var init = {'_id':userName,hp:100,mp:100,tp:100,gold:100,lv:1,str:9,int:9,agi:9,love:0,start:now,end:endtime,item:[]};
        cl_user.insertOne(init);
        data=init;
        playstart();
      }
    });
  });
}

function playstart(data,userName,endtime){
  var eventts=data.eventts;
  var now = new Date();
  if(eventts){
    var eventdur = now.getTime()-eventts.getTime();
    if(eventdur>60000){
      newevent();
    }else{
      nowevent();
    }
  }else{
    newevent();
  }

}

function nowplay(){

}

function newevent(){
  var nextEvent = Math.floor(Math.random()*99999+12345);
  var nexttime = new Date(new Date().getTime()+nextEvent);
  setTimeout(function(){

  })
}