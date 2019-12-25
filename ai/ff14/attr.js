function calAttr(content,qq,callback){
  if(content.startsWith("直击")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor((num-380)/3300*55*100)/100;
    var next = Math.ceil((rate+0.01)*100/100/55*3300+380)
    callback('直击率:'+rate+"%"+"\n直击伤害:125%\n下一个阈值:"+next);
  }else if(content.startsWith("暴击")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor(((num-380)/3300*20+5)*100)/100;
    var cx = Math.floor((num-380)/3300*200 +1400)/10;
    var next = Math.ceil((rate-4.99)/20*3300+380);
    callback('暴击率:'+rate+"%"+"\n暴击伤害:"+cx+"%\n下一个阈值:"+next);
  }else{

  }
}

module.exports={
  calAttr
}