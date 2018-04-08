var https=require('https');
var http = require('http');
function weatherReply(city,userId,callback){
  var options = {
    hostname: 'wthrcdn.etouch.cn',
    port: 80,
    path: '/weather_mini?city='+encodeURIComponent(city),
    method: 'GET'
  };
  console.log(options);
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
    res.on('error',function(error){
      console.log(error);
    })
  });
  req.end();
}


var failed = 0;
function getWeatherByCity(city,userId,callback){
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
      failed = 0;
      var reply = false;
      var n = resdata.indexOf("(");
      if(n>0){
        var arr = eval(resdata.substring(n));
        var ret = "";
        if(arr.length>0){
          var cityref = arr[0].ref;
          if(cityref){
            var ca = cityref.split("~");
            var citycode = ca[0];
            ret = citycode;
            reply = true;
            getWeatherByCityCode(city,ret,userId,callback);
          }
        }
      }
      if(reply == false){
        ret = '"'+city+'"' + ' 是哪里？'+userId+' 带我去玩哇';
        callback(ret);
      }
    });
    res.on('error',function(error){
      console.log(error);
    })
  });
  req.setTimeout(8000,function(){
    req.end();
    failed = failed+1;
    ret = '"'+city+'"' + ' 是哪里？'+userId+' 带我去玩哇!';
    if(failed>2){
      callback(ret);
    }else{
      getWeatherByCity(city,userId,callback)
    }
  });
  req.end();
}

function getWeatherByCityCode(city,cityCode,userId,callback){
  var options = {
    hostname: 'www.weather.com.cn',
    port: 80,
    path: '/weather/'+cityCode+'.shtml',
    method: 'GET'
  };
  var req = http.request(options, function (res) {
    var resdata = "";
    res.on('data', function (chunk) {
      resdata += chunk;
    });
    res.on('end', function () {
      failed = 0;
      var t1 = resdata.indexOf('crumbs fl');
      var t2 = resdata.indexOf('clearfix cnav');
      if(t1<0||t2<0){
        ret = '"'+city+'"' + ' 是哪里？'+userId+' 带我去玩哇';
        callback(ret);
      }else{
        var th = resdata.substring(t1,t2);
        var title = '';
        var isinner = 0;
        for (var i = 0; i < th.length; i++) {
          if (isinner == 0 && th[i] == ">") {
            isinner = 1;
          } else if (isinner == 1 && th[i] == "<") {
            isinner = 0;
          } else if (isinner) {
            if(th[i]==" "||th[i]=="\n"||th[i]=="\t"||th[i]=="\r"){

            }else{
              title=title+th[i];
            }
          }
        }
        title = title.replace(/>/g,'-');
        var startstr = '<h1>';
        var n1 = resdata.indexOf('t clearfix');
        var s = resdata.substring(n1-20);
        var n = 1;
        var all='';
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
          all=all+ret+"\n";
          s = s.substring(n+2);
          n = s.indexOf(startstr);
          c++;
        }

        getAqiByCitycode(title,all.trim(),cityCode,userId,callback);
      }
    });
    res.on('error',function(error){
      console.log(error);
      callback('爆炸啦喵');
    })
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.setTimeout(10000,function(){
    req.end();
    failed = failed + 1;
    if(failed>1){
      ret = '"'+city+'"' + ' 是哪里？'+userId+' 带我去玩哇!';
      callback(ret);
    }else{
      getWeatherByCityCode(city,cityCode,userId,callback);
    }
  });
  req.end();
}


function getAqiByCitycode(title,str,cityCode,userId,callback){
  var options = {
    hostname: 'd1.weather.com.cn',
    port: 80,
    path: '/aqi_all/'+cityCode+'.html',
    headers:{
      Referer:'http://www.weather.com.cn/air/'
    },
    method: 'GET'
  };
  var req = http.request(options, function (res) {
    var resdata = "";
    res.on('data', function (chunk) {
      resdata += chunk;
    });
    res.on('end', function () {
      var code = res.statusCode;
      if(code != 200){
        var ret = title + "\n\n"+str;
        callback(ret);
      }else{
        aqidata = eval(resdata.substring(10));
        var list = aqidata.data;
        var aqi;
        for(var i=0;i<list.length;i++){
          if(list[list.length-i-1].t1!=''){
            aqi = list[list.length-i-1].t1;
            break;
          }
        }
        var ret = title + "\n空气质量指数："+aqi+"\n\n"+str;
        callback(ret);
      }
    });
    res.on('error',function(error){
      console.log(error);
      callback('爆炸啦喵');
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.setTimeout(10000,function(){
    req.end();
    var ret = title + "\n\n"+str;
    callback(ret);
  });
  req.end();
}



function getinner(s){
  var isinner=0;
  var rn = 0;
  var ret = "";
  for(var i=0;i<s.length;i++){
    if(isinner==0&&s[i]==">"){
      isinner=1;
    }else if(isinner==1&&s[i]=="<"){
      isinner=0;
    }else if(isinner){
      if(s[i]==" "||s[i]=="\n"){
        if(rn==0){
          ret=ret+s[i];
        }
        rn=1;
      }else{
        ret=ret+s[i];
        rn=0;
      }
    }
  }
  return ret;
}







module.exports={
  getWeatherByCity,
  getWeatherByCityCode,
  weatherReply
}
