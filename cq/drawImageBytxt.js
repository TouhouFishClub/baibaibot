var gm = require('gm')
var request = require("request");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('./sendImage');



function drawTxtImage(words,txt,callback,options){
  var wa = txt.split('\n');
  var maxwd = 0;
  var uwd = 29;
  var uw = "";
  for(var i=0;i<wa.length;i++){
    var lw = wa[i];
    var ud = "";
    while(lw.length>uwd){
      ud = ud + lw.substring(0,uwd)+"\n";
      lw = lw.substring(uwd);
    }
    if(lw.length>0){
      uw = uw + ud +lw+"\n";
    }else{
      uw = uw + ud;
    }
  }
  var ua = uw.split('\n');
  for(var i=0;i<ua.length;i++){
    if(ua[i].length>maxwd){
      maxwd = ua[i].length;
    }
  }
  var len = ua.length;
  var img1 = new imageMagick("static/blank.png");
  img1.resize(maxwd*19+29, len*21+29,'!') //加('!')强行把图片缩放成对应尺寸150*150！
    .autoOrient()
    .fontSize(20)
    .fill(options.color || 'blue')
    .font(`./static/${options.font || 'dfgw.ttf'}`)
    .drawText(0,0,uw,'NorthWest');
  sendGmImage(img1,words,callback);
}

module.exports={
  drawTxtImage
}