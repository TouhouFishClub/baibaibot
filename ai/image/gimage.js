var gm = require('gm')
var request = require("request");
var fs = require("fs");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../cq/sendImage');

function handleGaReply(content,gid,qq,callback){
  content = content.trim();
  if(content.length==2){
    generateGaImage(content+" "+content,callback);
  }
}

function generateGaImage(utext,callback){
  var img1 = new imageMagick("static/mali.jpg");
  img1.autoOrient()
    .fontSize(25)
    .fill('blue')
    .font('./static/dfgw.ttf')

  img1.fontSize(62).fill('black')
  img1.drawText(480,110,utext,'NorthWest')
  img1.write("1112.jpg",function(err){
    console.log(222);
    console.log(err);
  })
  sendGmImage(img1,callback,1);

}


module.exports={
  handleGaReply
}