var https=require('https');
var http = require('http');
function weatherReply(city,userId,callback){
  var options = {
    hostname: 'wthrcdn.etouch.cn',
    port: 80,
    path: '/weather_mini?city='+encodeURIComponent(city),
    method: 'GET'
  };
  var req = http.request(options, function (res) {
    var encoding = res.headers['content-encoding'];
    var chunks = [];
    res.on('data', function (chunk) {
      chunks.push(chunk);
    });
    res.on('end', function () {
      var buffer = Buffer.concat(chunks);
      zlib.gunzip(buffer, function(err, decoded) {
        var ret = '';
        var data = eval("("+decoded+")");
        if(data.data){
          var jd = data.data;
          if(jd.city){
            ret = ret + jd.city + " ";
          }
          if(jd.wendu){
            ret = ret + jd.wendu + "℃ ";
          }
          if(jd.aqi){
            ret = ret + "空气质量指数:"+jd.aqi+"\n";
          }
          if(jd.ganmao){
            ret = ret + jd.ganmao+"\n\n";
          }
          if(jd.forecast){
            var ja = jd.forecast;
            for(var i=0;i<ja.length;i++){
              var jdd = ja[i];
              ret = ret + jdd.date+" "+jdd.type+" "+jdd.low+" "+jdd.high+"\n";
            }
          }
          callback(ret);
        }else{
          ret = '"'+city+'"' + ' 是哪里？'+userId+' 带我去玩哇';
          callback(ret);
        }
      });
    });
  });
  req.end();
}

function getWeatherByCity(city,callback){
  var options = {
    hostname: 'toy1.weather.com.cn',
    port: 80,
    path: '/search?cityname='+encodeURIComponent(city)+'&callback=s',
    method: 'GET'
  };
  console.log(options);
  var req = http.request(options, function (res) {
    var resdata = "";
    res.on('data', function (chunk) {
      resdata+=chunk;
    });
    res.on('end', function () {
      if(resdata.startsWith("s(")){
        var arr = eval(resdata.substring(1));
        var ret = "";
        if(arr.length>0){
          var cityref = arr[0].ref;
          if(cityref){
            var ca = cityref.split("~");
            var citycode = ca[0];
            ret = citycode;
            console.log(ret);
            getWeatherByCityCode(ret,callback);
          }
        }
      }
    });
  });
  req.end();
}

function getWeatherByCityCode(cityCode,callback){
  var options = {
    hostname: 'www.weather.com.cn',
    port: 80,
    path: '/weather/'+cityCode+'.shtml',
    method: 'GET'
  };
  console.log(options);
  var req = http.request(options, function (res) {
    var resdata = "";
    res.on('data', function (chunk) {
      resdata += chunk;
    });
    res.on('end', function () {
      var t1 = resdata.indexOf('crumbs fl');
      var t2 = resdata.indexOf('clearfix cnav');
      var th = resdata.substring(t1,t2);
      var title = '';
      var isinner = 0;
      for (var i = 0; i < th.length; i++) {
        if (isinner == 0 && th[i] == ">") {
          isinner = 1;
        } else if (isinner == 1 && th[i] == "<") {
          isinner = 0;
        } else if (isinner) {
          title = title + th[i];
        }
      }
      var startstr = 'sky skyid';
      var n1 = resdata.indexOf(startstr);
      var s = resdata.substring(n1-20);
      var n = 1;
      var all=title+"\n";
      var c = 0;
      while (n > 0&&c<7) {
        var dh = s.substring(0, n);
        var ret = '';
        var isinner=0;
        for(var i=0;i<dh.length;i++){
          if(isinner==0&&dh[i]==">"){
            isinner=1;
          }else if(isinner==1&&dh[i]=="<"){
            isinner=0;
          }else if(isinner){
            if(dh[i]==" "||dh[i]=="\n"){

            }else{
              ret=ret+dh[i];
            }
          }
        }
        ret = ret.trim();
        ret = ret.replace(/&nbsp;/g,'').replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<');
        all=all+ret+"\n";
        s = s.substring(n+10);
        n = s.indexOf(startstr);
        c++;
      }
      callback(all);
    });
  });
  req.end();
}











module.exports={
  getWeatherByCity,
  getWeatherByCityCode,
  weatherReply
}