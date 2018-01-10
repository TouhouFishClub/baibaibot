var info={};

const wait = time => new Promise(resolve => setTimeout(() => resolve(), time))

function lottoryReply(content,userName,Ncallback){
  var callback=function(response){
    let strArr = response.split('\n'), callbackArr = []
    callbackArr.push(strArr.reduce((pre, cur) => {
      if(pre.length + cur.length < 250)
        return `${pre}\n${cur}`
      else {
        callbackArr.push(pre)
        return cur
      }
    }))
    callbackArr.forEach(async (ele, idx) => {
      await wait(idx * 500)
      Ncallback(ele)
    })
  }
  if(content==""){
    if(info.going){
      callback('抽奖正在进行中');
    }else{
      info={};
      info.start=new Date();
      info.going=1;
      var ret = "抽奖将在1分钟后开始\n请每位选手选一个100-999的幸运数字\n输入格式为“*”+三位数.比如“*123”\n";
      ret = ret + "中奖的幸运儿为与‘所有人幸运数字之和的立方根取小数点后3位有效数字’最接近的人\n";
      ret = ret + "比如ABC3人抽奖,A的幸运数字为321,B的幸运数字为654,C的幸运数字为987\n";
      ret = ret + "那么321+654+987=1962,³√1962=12.518904727821093\n";
      ret = ret + "取小数点后3位有效数字为518,与518最接近的人为B,差距为136,中奖的幸运儿就是B\n";
      ret = ret + "如果两个人差距相同,则两个人同时中奖,那请你们两个继续抽奖吧";
      ret = ret + "抽奖将在1分钟后开始\n请各位幸运儿抓紧时间报名\n祝好运";
      console.log(ret.length)
      callback(ret);
      setTimeout(function(){
        getlottory(callback);
      },60000)
    }
  }else if(content.length==3){
    if(info.going){
      var num = parseInt(content);
      if(num>=100&&num<=999){
        var last=info[userName];
        info[userName]=num;
        var ret = userName+'报名成功,当前幸运数字为'+num+"\n";
        if(last){
          ret = ret + "\n由于重复报名，已覆盖掉之前的幸运数字:"+last;
        }
        callback(ret)
      }else{
        callback(userName+"输入有误,请重新输入");
      }
    }else{
      callback('抽奖还未开始');
    }
  }
}

function getlottory(callback){
  console.log(info);
  var ret = "报名选手共"+(Object.keys(info).length-2)+"人：\n";
  var sum = 0;
  for(var p in info){
    if(p!="start"&&p!="going") {
      var num = info[p];
      ret = ret + p + "：" + num + "\n";
      sum = sum + num;
    }
  }
  var sqr = Math.pow(sum,1/3);
  ret = ret + "报名选手幸运数字之和为："+sum+"\n";
  ret = ret + "³√"+sum+"="+sqr+"\n";
  var n1 = sqr-Math.floor(sqr);
  while(n1<=100){
    n1=n1*10;
  }
  n1=Math.floor(n1);
  ret = ret + "取小数点后3位有效数字为"+n1+"\n";
  var min = 9999;
  var minp = "";
  for(var p in info){
    if(p!="start"&&p!="going"){
      var ab = Math.abs(info[p]-n1);
      if(ab<min){
        min=ab;
        minp = p;
      }else if(min==ab){
        minp = minp + "&" + p;
      }
      ret = ret + p + "和" + n1 + "的差距为"+ ab + "\n";
    }

  }
  ret = ret + "\n中奖幸运儿是："+ minp+",恭喜！";
  info={};
  console.log(ret);
  callback(ret);
}


module.exports={
  lottoryReply,
  getlottory
}