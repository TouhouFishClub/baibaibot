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
  sendGmImage(img1,'',callback,1);
}

function handleMazeReply(content,gid,qq,callback){
  content = content.trim();
  var ca = content.split('$');
  if(ca.length==2){
    var u1 = ca[0];
    var u2 = ca[1];
    if(u1.length<u2.length&&u2.length<15&&u1.length>=1){
      generateMazeImage(ca[0],ca[1],callback)
    }
  }

}

function generateMazeImage(utext1,utext2,callback){
  var wd = utext2.length*40+100
  var img1 = new imageMagick("static/black.png");
  img1.autoOrient()
//    .stroke("#CCCC99")
//    .strokeWidth(1)
    .fill('blue')
    .resize(wd,200,"!")
    .font('./static/STXIHEI.TTF')

  var st = wd/2 - utext1.length * 20
  var et = wd/2 + utext1.length * 20;

  img1.fontSize(20).fill('#CCCC99')
  img1.drawText(0,-30,utext1,'center')
  img1.fontSize(40).fill('#CCCC99')
  img1.drawLine(st,100,et,100)
  img1.drawText(0,30,utext2,'center')
  img1.write("1112.jpg",function(err){
    console.log(222);
    console.log(err);
  })
  sendGmImage(img1,'',callback,1);

}


generateMazeImage("粉毛兔洞","超级玛丽歼灭战");

module.exports={
  handleGaReply,
  handleMazeReply
}
