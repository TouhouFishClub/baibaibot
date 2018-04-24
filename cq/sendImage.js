var fs = require('fs');

function sendGmImage(gmObj,words='',callback,order){
  var imgname2 = new Date().getTime()+"";
  var now = new Date();
  var year = now.getFullYear();
  var mon = now.getMonth()<9?('0'+(now.getMonth()+1)):now.getMonth();
  var dat = now.getDate()<10?('0'+now.getDate()):now.getDate();
  var folder = ""+year+mon+dat;
  var head = '../coolq-data/cq/data/image/send/';
  if(!fs.existsSync(head+folder)){
    fs.mkdirSync(head+folder);
  }
  if(!fs.existsSync(head+folder+"/card")){
    fs.mkdirSync(head+folder+"/card");
  }
  gmObj.write(head+folder+"/card/"+imgname2+".jpg",function(err){
    var imgname = folder+"/card/"+imgname2+".jpg";
    var ret;
    if(order==1){//words behind
      ret = '[CQ:image,file='+imgname+']'+words;
    }else{
      ret = words+'[CQ:image,file='+imgname+']';
    }
    callback(ret);
  });
}

module.exports={
  sendGmImage,
  sendImageBuffer
}

function sendImageBuffer(buf){

}