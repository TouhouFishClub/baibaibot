const EORZEA_TIME_CONST = 3600/175;
const {weatherData} = require("./weatherData")


function handleFF14weatherReply(content,callback){
  var n = content.indexOf("天气");
  if(n==2){
    var place = content.substring(0,2);
    var placeid = 0;
    if(place.indexOf("风")>=0){
      placeid=91;
    }else if(place.indexOf("冰")>=0){
      placeid=94;
    }else if(place.indexOf("火")>=0){
      placeid=96;
    }else if(place.indexOf("水")>=0){
      placeid=100;
    }
    var after = content.substring(4).trim();
    var num = 0;
    if(after==""){
      num = 0;
    }else if(after.startsWith("+")){
      num = parseInt(after.substring(1));
    }else if(after.startsWith("-")){
      num = 0-parseInt(after.substring(1));
    }else{
      num = after;
    }

    if(placeid>0){
      var arr = generateWeatherReport(placeid,num);
      arr.reverse();
      var ret = "";
      var now = new Date();
      for(var i=0;i<arr.length;i++){
        var ts = arr[i].ts;
        var then = new Date(ts);
        var tsstr = arr[i].tsstr;
        if(now.getTime()>ts&&arr[i+1]&&now.getTime()<arr[i+1].ts){
          tsstr = "现在";
        }
        var sub = Math.floor((now.getTime() + 3600000*8)/86400000)-Math.floor((then.getTime() + 3600000*8)/86400000)
        if(sub<0){
          tsstr = (-sub) + "天后" + tsstr;
        }else if(sub>0){
          tsstr = sub + "天前" + tsstr;
        }
        ret = ret + "【"+tsstr + " : "+ arr[i].weather + "】";
      }
      callback(ret);
    }
  }
}



function calrate(lt){
  var bell = Math.floor(lt / 175);
  var increment = Math.floor(bell + 8 - (bell % 8)) % 24;
  var total_days = Math.floor(lt / 4200);
  var calc_base = total_days * 100 + increment;
  var ab = calc_base * 2048;
  var lb = ab % 4294967296;
  var step1 = xor(lb,calc_base);
  var step2 = xor(Math.floor(step1/256),step1);
  var ret = step2 % 100;
  return ret;
}

function getlt(ts){
  var tssec = ts/1000;
  var et = tssec * EORZEA_TIME_CONST;
  var lt = Math.floor(et/28800)*28800/EORZEA_TIME_CONST;
  return lt;
}



function xor(a,b){
  var ret = 0;
  for(var i=0;i<50;i++){
    var x1 = a%2;
    var x2 = b%2;
    var r = x1^x2;
    ret = ret + r * Math.pow(2,i);
    a = Math.floor(a/2);
    b = Math.floor(b/2);
    if(a==0&&b==0){
      break;
    }
  }
  return ret;
}

const placeRate =  {
  91: [[30, 2], [60, 6], [90, 8], [100, 15]],
  94: [[10, 2],
    [28, 4],
    [46, 14],
    [64, 15],
    [82, 9],
    [100, 16]],
  96: [[10, 2],
    [28, 14],
    [46, 9],
    [64, 16],
    [82, 49],
    [100, 15]],
  100: [[12, 2], [34, 8], [56, 17], [78, 10], [100, 15]]
}


function generateWeatherReport(place,num){
  var pweather = "";
  if(isNaN(num)){
    pweather = num;
    num = 30;
  }
  var lt = getlt(new Date().getTime()+9000000+16800000*num);
  var llt = lt;
  var retarr = [];
  var count=0;
  while((pweather!=""&&count<380)||(pweather==""&&retarr.length<12)){
    count++;
    var thenlt = getlt((llt - 1)*1000);
    llt = thenlt;
    var timestr = new Date(thenlt*1000).toLocaleTimeString()
    var rateArr = placeRate[place];
    var weatherRate = calrate(thenlt);
    var weatherNum = -1;
    for(var k=0;k<rateArr.length;k++){
      if(weatherRate<rateArr[k][0]){
        weatherNum = rateArr[k][1];
        break;
      }
    }
    var weatherObj = weatherData[weatherNum];
    var weather = weatherObj.zh?weatherObj.zh:weatherObj.ja;
    if(pweather==""||pweather==weather){
      retarr.push({ts:thenlt*1000,tsstr:timestr,weather:weather});
    }
  }
  if(retarr.length>12){
    retarr = retarr.slice(retarr.length-12);
  }
  return retarr;
}

module.exports={
  generateWeatherReport,
  handleFF14weatherReply
}


