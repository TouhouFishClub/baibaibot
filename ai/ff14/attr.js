function calAttr(content,qq,callback){
  if(content.startsWith("直击")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor((num-380)/3300*55*10)/10;
    var next = Math.ceil((rate+0.1)*100/100/55*3300+380);
    var lastnum = Math.ceil((rate)*100/100/55*3300+380);
    var nextrate = rate+0.1;
    var nowwin = Math.round((rate*1.25+(100-rate))*100000)/100000;
    var nextwin = Math.round((nextrate*1.25+(100-nextrate))*100000)/100000;;
    var each = Math.round((nextwin-nowwin)/nowwin/(next-lastnum)*10000000)/1000;
    var add = Math.round((nowwin-100)*10000/(lastnum-380))/100;
    callback('直击率:'+rate+"%"+"\n直击伤害:125%\n上一个阈值:"+lastnum+"下一个阈值:"+next+"\n直击收益:"+nowwin+"%\n直击每点收益:"+add+"\n直击每点增益:"+each);
  }else if(content.startsWith("暴击")){
    var left = content.substring(2).trim();
    var num = parseInt(left);
    var rate = Math.floor(((num-380)/3300*20+5)*10)/10;
    var cx = Math.floor((num-380)/3300*200 +1400)/10;
    var next = Math.ceil((rate-4.9)/20*3300+380);
    var lastnum = Math.ceil((rate-5)/20*3300+380);
    var nextrate = rate+0.1;
    var nextcx = Math.floor((next-380)/3300*200 +1400)/10;
    var nowwin = Math.round((rate*cx/100+(100-rate))*100000)/100000;
    var nextwin = Math.round((nextrate*nextcx/100+(100-nextrate))*100000)/100000;;
    var each = Math.round((nextwin-nowwin)/nowwin/(next-lastnum)*10000000)/1000;
    var add = Math.round((nowwin-100)*10000/(lastnum-380))/100;
    callback('暴击率:'+rate+"%"+"\n暴击伤害:"+cx+"%\n上一个阈值:"+lastnum+"\n下一个阈值:"+next+"\n暴击收益:"+nowwin+"%\n暴击每点收益:"+add+"\n暴击每点增益:"+each);
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
    var lastnum = Math.ceil((rate-100)*10*3300/130+340);
    var nextrate = Math.floor(130*(next - 340)/ 3300 + 1000)/10;
    var nowwin = rate;
    var nextwin = nextrate;
    var each = Math.round((nextwin-nowwin)/nowwin/(next-lastnum)*10000000)/1000;
    var add = Math.round((nowwin-100)*10000/(lastnum-380))/100;
    callback('信念收益:'+rate+"%"+"\n上一个阈值:"+lastnum+"\n下一个阈值:"+next+"\n信念收益:"+nowwin+"%\n信念每点收益:"+add+"\n信念每点增益:"+each);
  }else{

  }
}

module.exports={
  calAttr
}