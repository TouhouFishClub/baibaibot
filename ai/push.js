var https=require('https');
var http = require('http');

var timer = 0;
function pushTask(){
  var left = 1800000 - new Date().getTime()%1800000;
  console.log('left:'+left);
  if(timer==0){
    timer = 1;
    setTimeout(function(){
      pushToGroup(2);
      setTimeout(function () {
        timer = 0;
        pushTask();
      },10000);
    },left)
  }
}

var failed=0;
function getCurrency(callback){
  console.log('will get currency');
  var options = {
    hostname: "api.fixer.io",
    port: 80,
    path: '/latest?base=USD',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
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
        var data = eval('('+resdata+')');
        var usd_cny=data.rates.CNY;
        callback(usd_cny);
      });
      res.on('error',function(){

      })
    }else{
      callback(0);
    }
  });
  req.setTimeout(5000,function(){
    req.end();
    callback(0);
  });
  req.end();
}


function pushToGroup(type){
  if(type==2){
    var groupid = 221698514;
    var callback = function(res,blank){
      if(res.trim().length>0){
        setTimeout(function(){
          var options = {
            host: '192.168.17.52',
            port: 23334,
            path: '/send_group_msg?group_id='+groupid+'&message='+encodeURIComponent(res),
            method: 'GET',
            headers: {

            }
          };
          var req = http.request(options);
          req.end();
        },1000);
      }
    }
    getPrice(callback);
    setTimeout(function(){
      getBitFlyer(callback);
    },500);
  }
}



function getBitFlyer(callback,withproxy){
  console.log('will get bitflyer');
  var options = {
    hostname: "api.bitflyer.jp",
    port: 443,
    path: '/v1/ticker?product_code=BTC_JPY',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  if(withproxy){
    options.agent=agent;
  }
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      failed=0;
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        parseBitFlyerRes(resdata,callback);
      });
      res.on('error',function(){

      })
    }else{
      failed = failed + 1;
      if(failed>2){
        callback('bitflyer BOOM!');
      }else{
        getBitFlyer(callback);
      }
    }
  });
  req.setTimeout(5000,function(){
    callback('bitflyer BOOM!');
  });
  req.end();
}

function parseBitFlyerRes(resdata,callback){
  var ret = '';
  try{
    var data = eval('('+resdata+')');
    var btc_jpy = data.best_bid;
    var now = new Date();
    ret = "比特币行情(Bitflyer)："+now.toLocaleString()+"\n";
    ret = ret + "BTC:"+btc_jpy+"円";
  }catch(e){
    console.log(e);
    ret = '';
  }
  callback(ret);
}

function getHT(callback,withproxy){
  console.log('will get bitflyer');
  var options = {
    hostname: "api.huobi.pro",
    port: 443,
    path: '/market/detail/merged?symbol=htusdt',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  if(withproxy){
    options.agent=agent;
  }
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      failed=0;
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        parseHTRes(resdata,callback);
      });
      res.on('error',function(){

      })
    }else{
      failed = failed + 1;
      if(failed>2){
        callback('huobi BOOM!');
      }else{
        getHT(callback);
      }
    }
  });
  req.setTimeout(5000,function(){
    callback('huobi BOOM!');
  });
  req.end();
}

function parseHTRes(resdata,callback){
  var ret = '';
  try{
    var data = eval('('+resdata+')');
    var ch=data.ch;
    var symbol = ch.split(".")[1];
    var price = data.tick.close;
    var now = new Date();
    ret = "火币行情："+now.toLocaleString()+"\n";
    ret = ret + symbol+":"+price.toFixed(8);
  }catch(e){
    console.log(e);
    ret = '';
  }
  callback(ret);

}



function getPrice(callback){
  getCurrency(function(usd_cny){
    //getBifFinex(usd_cny,callback);
    getHT(callback,false);
  })
}

var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://192.168.17.62:3128';
var agent = new HttpsProxyAgent(proxy);

function getBifFinex(usd_cny,callback,withproxy){
  console.log('will get bitfinex:'+withproxy);
  var options = {
    hostname: "api.bitfinex.com",
    port: 443,
    path: '/v2/tickers?symbols=tBTCUSD,tLTCUSD,tETHUSD,tETCUSD,tBCHUSD,tEOSUSD,tXRPUSD,tQTMUSD,tDSHUSD',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  if(withproxy){
    options.agent=agent;
  }
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      failed=0;
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        parseBitFinexRes(resdata,usd_cny,callback);
      });
      res.on('error',function(){

      })
    }else{
      failed = failed + 1;
      if(failed>1){
        callback('bitfinex BOOM!');
      }else{
        getPrice(callback);
      }
    }
  });
  req.setTimeout(5000,function(){
    req.end();
    failed = failed + 1;
    if(failed>2){
      callback('bitfinex BOOM!');
    }else{
      getBifFinex(usd_cny,callback,true);
    }
  });
  req.end();
}

function parseBitFinexRes(resdata,usd_cny,callback){
  var list = eval('('+resdata+')');
  var now = new Date();
  var ret = "数字货币行情(Bitfinex)："+now.toLocaleString()+"\n";
  for(var i=0;i<list.length;i++){
    var p = list[i];
    var name = p[0].substring(1,4);
    var price = p[7];
    ret = ret + name + ":$"+price.toFixed(2)+"   \t￥"+(usd_cny*price).toFixed(2)+"\n";
  }
  ret = ret + "1$="+usd_cny+"1￥";
  callback(ret.trim());
}


module.exports={
  pushToGroup,
  pushTask,
  getPrice,
  getBitFlyer
}
