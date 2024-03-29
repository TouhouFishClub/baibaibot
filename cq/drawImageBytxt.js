var gm = require('gm')
var request = require("request");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage, renderGmImage} = require('./sendImage');



function drawTxtImage(words,txt,callback,options = {}){
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
  var len = ua.length, lh = 21
  switch(options.font) {
    case 'dfgw.ttf':
      lh = 21
      break
    case 'STXIHEI.TTF':
      lh = 31
      break
    default:
      lh = 21
  }
  var img1 = new imageMagick("static/blank.png");
  img1.resize(maxwd*19+29, len*lh+29,'!') //加('!')强行把图片缩放成对应尺寸150*150！
    .autoOrient()
    .fontSize(20)
    .fill(options.color || 'blue')
    /*
    dfgw.ttf 默认 华康少女字体
    STXIHEI.TTF 华文细黑
    */
    .font(`./static/${options.font || 'dfgw.ttf'}`)
    .drawText(0,0,uw,'NorthWest');
  sendGmImage(img1,words,callback);
}

async function renderTxtImage(txt, options = {}){
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
  var len = ua.length, lh = 21
  switch(options.font) {
    case 'dfgw.ttf':
      lh = 21
      break
    case 'STXIHEI.TTF':
      lh = 31
      break
    default:
      lh = 21
  }
  var img1 = new imageMagick("static/blank.png");
  img1.resize(maxwd*19+29, len*lh+29,'!') //加('!')强行把图片缩放成对应尺寸150*150！
    .autoOrient()
    .fontSize(20)
    .fill(options.color || 'blue')
    /*
    dfgw.ttf 默认 华康少女字体
    STXIHEI.TTF 华文细黑
    */
    .font(`./static/${options.font || 'dfgw.ttf'}`)
    .drawText(0,0,uw,'NorthWest');
	return await renderGmImage(img1)
}

module.exports={
  drawTxtImage,
	renderTxtImage
}