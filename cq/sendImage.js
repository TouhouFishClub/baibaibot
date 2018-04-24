var fs = require('fs');

function sendGmImage(gmObj,callback){
  var imgname2 = new Date().getTime()+"";
  gmObj.write('../coolq-data/cq/data/image/send/card/'+imgname2+".jpg",function(err){
    callback("send/card/"+imgname2+".jpg");
  });
}

module.exports={
  sendGmImage,
  sendImageBuffer
}

function sendImageBuffer(buf){

}