var gaodekey = "8837ad43007732f0da74a2aeb719cc3a";
var http = require('http');
function getloc(place,callback){
  var host = "restapi.amap.com";
  var path = "/v3/geocode/geo?address="+encodeURIComponent(place)+"&key="+gaodekey;
  httpget(host,path,function(datastr){
    try {
      var data = JSON.parse(datastr);
      var status = data.status;
      if (status == 1) {
        var count = data.count;
        if (count == 1) {
          var geo = data.geocodes[0];
          var addr = geo.formatted_address;
          var loc = geo.location;
          var city = geo.city;
          console.log(geo);
          var ret = {loc: loc, addr: addr, city: city};
          callback(ret);
        }
      }
    }catch (e){
      console.log(e);
    }
  })
}

function httpget(host,path,callback){
  var options = {
    hostname: host,
    port: 80,
    path: path,
    method: 'GET'
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        callback(resdata);
      });
    }else{

    }
  });
  req.end();
}

function route(type,from,to,callback){
  getloc(from,function(geof){
    getloc(to,function(geot){
      var cityf = geof.city;
      var cityt = geot.city;
      var addrf = geof.addr;
      var addrt = geot.addr;
      if(cityf==cityt){
        var locf = geof.loc;
        var loct = geot.loc;
        var host = "restapi.amap.com";
        var path = "/v3/direction/transit/integrated?origin="+locf+"&destination="+loct+"&city="+encodeURIComponent(cityf)+"&key="+gaodekey;
        httpget(host,path,function(resdata){
          try{
            var data = JSON.parse(resdata);
            var status = data.status;
            if(status==1){
              var distance = data.route.distance;
              var taxi_cost = data.route.taxi_cost;
              var transits = data.route.transits;
              var ret = addrf+'--'+addrt+'\n总路程：'+distance+'m,打车费用：'+taxi_cost+'\n';
              for(var i=0;i<transits.length;i++){
                ret = ret + '方案'+(i+1)+':'
                ret = ret + parsetransits(transits[i])+'\n';
              }
              if(ret.length>250){
                ret = ret.substring(0,250)+'....';
              }
              callback(ret.trim());
            }
          }catch (e){
            console.log(e);
          }
        })
      }else{
        callback(addrf+'------'+addrt+'\n直接瞬移过去不就到了喵');
      }
    })
  })
}

function parsetransits(transitsData){
  var dur = transitsData.duration;
  var walk = transitsData.walking_distance;
  var cost = transitsData.cost;
  var segments = transitsData.segments
  var ret = '预计用时：'+Math.round(dur/60)+'分,步行'+walk+'m,费用：￥'+cost+'\n';
  for(var k=0;k<segments.length;k++){
    var bus = segments[k].bus.buslines;
    var busnamestr='';
    var start = '';
    var end = '';
    for(var i=0;i<bus.length;i++){
      var busdata = bus[i];
      start = busdata.departure_stop.name;
      end = busdata.arrival_stop.name;
      var busname = busdata.name;
      var n = busname.indexOf('(');
      if(n>0){
        busname = busname.substring(0,n);
      }
      busnamestr = busnamestr+"/"+busname;
    }
    if(busnamestr.length>2){
      ret = ret + busnamestr.substring(1) + '('+start+'--'+end+')\n';
    }
  }
  return ret;
}

module.exports={
  route,
  getloc
}