var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.52:27050/db_bot';
var path = require('path');
var fs = require('fs');


var udb;
var cl_setu;
var cl_suser;
var cl_chat;


initDB();
function initDB(){
    MongoClient.connect(mongourl, function(err, db) {
        udb=db;
        cl_user = db.collection('cl_user');
        cl_suser = db.collection('cl_suser');
        cl_chat = db.collection('cl_chat');
        cl_setu = db.collection('cl_setu');
    });
}


function buy(content,qq,gid,name,callback){
    content = content.trim();
    var op = content.substring(0,1);
    var ns = content.substring(1).trim();
    var n1 = ns.indexOf(" ");
    if(n1>0){
        var sid = parseInt(ns.substring(0,n1).trim());
        var num = parseInt(ns.substring(n1+1).trim());
        if(num<1){
            callback('s')
            return;
        }
        cl_suser.findOne({'_id':qq},function(err,user){
           console.log(user);
           if(!user){
               var init = {'_id':qq,gid:gid,name:name,stock:{},ts:new Date(),gold:10000};
               user = init;
               cl_suser.save(init);
           }else{

           }
           cl_setu.findOne({'_id':sid},function(err,setuObj){
               if(!setuObj){
                   callback('id error');
               }else{
                   if(setuObj.price){
                       setuObj.price=100.00;
                       setuObj.stock=10000;
                   }else{

                   }
                   if(op=='b'){
                       if(user.gold>=(setuObj.price*num*1.01)&&setuObj.stock>=num){
                           user.gold = user.gold-setuObj.price*num*1.01;
                           setuObj.stock = setuObj.stock-num;
                           setuObj.price = setuObj.price * (1+num/100);
                       }else{
                           callback('购买失败')
                       }
                   }else if(op=='s'){

                   }


               }
           })

        });

    }
}

setTimeout(function(){
    buy('s 12345 1',11111,22222,'name',function(){})
},500)

module.exports={
    buy
}
