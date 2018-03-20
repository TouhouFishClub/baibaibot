var https=require('https');
var http = require('http');
const {getShipRare} = require('./drop_map');
var limit = {};
function getShipReply(content,userName,callback) {
  content=content.trim();
  var first = content.substring(0,1);
  var simulator = 0;
  if(first=="l"||first=="L"){
    simulator = userName;
    content=content.substring(1);
    var then=limit[userName];
    if(then){
      if(new Date().getTime()<then){
        callback(userName+'打捞太快了,休息一会吧\n恢复时间：'+new Date(then).toLocaleTimeString());
        return;
      }
    }
    limit[userName]=new Date().getTime()+30000;
  }
  content=content.trim().toUpperCase();
  if(content==""){
    var ret = "打捞统计/模拟器\n";
    ret = ret + "输入格式【`l地图ID/难度/胜败/地点】\n";
    ret = ret + "如【`l39-7/乙/A/U】39-7乙难度U点A胜\n";
    ret = ret + "可简写,难度默认甲,胜败默认S胜,地点默认BOSS点\n";
    ret = ret + "如【`l37-3】37-3甲难度Boss点S胜\n";
    ret = ret + "前面加l为模拟器如【`ll4-5//S】模拟一次4-5boss点S胜打捞\n";
    callback(ret);
    return;
  }
  var ca = content.split('/');
  if (ca.length < 2) {
    ca.push("甲");
  }
  if (ca.length < 3) {
    ca.push("S");
  }
  map = ca[0];
  map = map.split('-').join('');
  hard = ca[1];
  if(parseInt(map)>40){
    if (hard == "乙") {
      hard = 3;
    } else if (hard == "丙") {
      hard = 2;
    } else if (hard == "丁") {
      hard = 1;
    } else {
      hard = 4;
    }
  }else{
    if (hard == "乙") {
      hard = 2;
    } else if (hard == "丙") {
      hard = 1;
    } else {
      hard = 3;
    }
  }

  rank = ca[2];
  if (rank == "S" || rank == "A" || rank == "B" || rank == "SA" || rank == "SAB") {

  } else {
    rank = "S";
  }
  var host = "db.kcwiki.org";
  if(ca.length==4){
    var point = ca[3];
    var path;
    if(map.length==3){
      path = "/drop/map/"+map+"/"+hard+"/"+point+"-"+rank+".json";
    }else{
      path = "/drop/map/"+map+"/"+point+"-"+rank+".json";
    }
    reply(host,path,simulator,callback);
  }else{
    getlocation(map,function(point){
      var path;
      if(map.length==3){
        path = "/drop/map/"+map+"/"+hard+"/"+point+"-"+rank+".json";
      }else{
        path = "/drop/map/"+map+"/"+point+"-"+rank+".json";
      }
      reply(host,path,simulator,callback);
    })
  }
}

function reply(host,path,simulator,callback){
  httpsget(host,path,0,function(ret){
    var data = eval('('+ret+')');
    var list = data.data;
    if(list){
      var detailkeys = Object.keys(list);
      detailkeys.sort((a, b) => (getShipRare(a)-getShipRare(b)) * -100 + list[b].rate - list[a].rate);
      var res1 = "";
      var res2 = "";
      var res3 = "";
      if(simulator){
        var rd = Math.random()*100;
        var c=0;
        for(var i=0;i<detailkeys.length;i++){
          var detail = list[detailkeys[i]];
          c=c+detail.rate;
          if(c>rd){
            callback(simulator+'捞到了【'+detailkeys[i]+'】');
            break;
          }
        }
      }else{
        for(var i=0;i<detailkeys.length;i++){
          var detail = list[detailkeys[i]];
          if(res1.length<222){
            res1 = res1 + detailkeys[i]+":"+detail.rate+"%\n";
          }else if(res2.length<222){
            res2 = res2 + detailkeys[i]+":"+detail.rate+"%\n";
          }else{
            res3 = res3 + detailkeys[i]+":"+detail.rate+"%\n";
          }
        }
        if(res1.length>0){
          callback(res1);
        }
        if(res2.length>0){
          //setTimeout(function(){callback(res2)},1000);
        }
        if(res3.length>0){
          //setTimeout(function(){callback(res3)},2000);
        }
      }
    }
  });
}

function httpsget(host,path,depth,callback){
  var options = {
    hostname: host,
    port: 443,
    path: path,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  console.log(options);
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(depth<5&&(code==301||code==302)){
      var location = res.headers.location;
      httpsget(host,location,depth+1,callback);
    }else if(code!=200){
      console.log("http:"+code);
    }else{
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        callback(resdata);
      });
    }
  });
  req.end();
}

function getlocation(map,callback){
  var host = "db.kcwiki.org";
  var path = "/drop/map/"+map;
  httpsgetRedirect(host,path,0,function(url){
    var n = url.lastIndexOf("SAB.html");
    var defaultPoint = url.substring(n-2,n-1);
    callback(defaultPoint);
  });
}


function httpsgetRedirect(host,path,depth,callback){
  var options = {
    hostname: host,
    port: 443,
    path: path,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(depth<5&&(code==301||code==302)){
      var location = res.headers.location;
      httpsget(host,location,depth+1,callback);
    }else{
      callback(path);
    }
  });
  req.end();
}

module.exports={
  getShipReply
}
























