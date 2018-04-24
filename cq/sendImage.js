var fs = require('fs');

function sendGmImage(gmObj,words='',callback,order){
  var imgname2 = new Date().getTime()+"";
  var now = new Date();
  var year = now.getFullYear();
  var mon = now.getMonth()<9?('0'+(now.getMonth()+1)):now.getMonth();
  var dat = now.getDate()<10?('0'+now.getDate()):now.getDate();
  var folder = ""+year+mon+dat;
  var head = '../coolq-data/cq/data/image/send/card/';
  if(!fs.existsSync(head+folder)){
    var mr=fs.mkdirSync(head+folder);
    console.log(mr)
  }
  gmObj.write(head+folder+"/"+imgname2+".jpg",function(err){
    var imgname = 'send/card/'+folder+"/"+imgname2+".jpg";
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