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
    if(placeid>0){
      var arr = generateWeatherReport(placeid);
      arr.reverse();
      var ret = "";
      var now = new Date().getTime();
      for(var i=0;i<arr.length;i++){
        var ts = arr[i].ts;
        var tsstr = arr[i].tsstr;
        if(now>ts&&now<arr[i+1].ts){
          tsstr = "现在";
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


function generateWeatherReport(place){
  var lt = getlt(new Date().getTime()+9000000);
  var llt = lt;
  var retarr = [];
  for(var i=0;i<12;i++){
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
    var weather = weatherObj.zh?weatherObj.zh:weatherObj.ja
    retarr.push({ts:thenlt*1000,tsstr:timestr,weather:weather});
  }
  return retarr;
}

module.exports={
  generateWeatherReport,
  handleFF14weatherReply
}


