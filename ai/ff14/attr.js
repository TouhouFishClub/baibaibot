function calAttr(content,qq,callback){
  if(content.startsWith("直击")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor((num-380)/3300*55*10)/10;
    var next = Math.ceil((rate+0.1)*100/100/55*3300+380)
    callback('直击率:'+rate+"%"+"\n直击伤害:125%\n下一个阈值:"+next);
  }else if(content.startsWith("暴击")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor(((num-380)/3300*20+5)*10)/10;
    var cx = Math.floor((num-380)/3300*200 +1400)/10;
    var next = Math.ceil((rate-4.9)/20*3300+380);
    callback('暴击率:'+rate+"%"+"\n暴击伤害:"+cx+"%\n下一个阈值:"+next);
  }else if(content.startsWith("速度")||content.startsWith("技速")||content.startsWith("咏速")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor(130*(num - 380)/ 3300 + 1000);
    var cx = Math.floor(( 2000 - rate ) * 2500 / 10000)/100;
    var nextspeed = 2000-(cx-0.01)*100*10000/2500
    var next = Math.ceil((nextspeed-1000)*3300/130+380)
    callback('速度:'+rate+""+"\n2.5sGCD:"+cx+"\n下一个阈值:"+next);
  }else if(content.startsWith("信念")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor(130*(num - 340)/ 3300 + 1000)/10;
    var next = Math.ceil((rate-99.9)*10*3300/130+340);
    callback('信念收益:'+rate+"%"+"\n下一个阈值:"+next);
  }else{

  }
}

module.exports={
  calAttr
}