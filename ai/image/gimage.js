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
  img1.shade(9,10)
  img1.write("1112.jpg",function(err){
    console.log(222);
    console.log(err);
    sendGmImage(img1,'',callback,1);
  })
}

function generateHealthImage(){
  var img1 = new imageMagick("6.png");
  img1.autoOrient()
  img1.fontSize(50)
  var utext1 = getNowFormatDate();
  img1.drawText(0,100,utext1,'center')
  img1.write("1112.jpg",function(err){

  });
}

function getNowFormatDate() {
  var date = new Date();
  var seperator1 = "-";
  var seperator2 = ":";
  var month = date.getMonth() + 1;
  var strDate = date.getDate();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  var strMin = date.getMinutes();
  if(strMin<=9){
    strMin = "0" + strMin;
  }
  var strHour = date.getMinutes();
  if(strHour<=9){
    strHour = "0" + strHour;
  }
  var strSec = date.getSeconds();
  if(strSec<=9){
    strSec = "0" + strSec;
  }
  var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
    + " " + date.getHours() + seperator2 + date.getMinutes()
    + seperator2 + date.getSeconds();
  return currentdate;
}


generateHealthImage();


module.exports={
  handleGaReply,
  handleMazeReply
}
