var https=require('https');
var http = require('http');
var timer = 0;
var path = require('path');
var fs = require('fs');
var request = require('request');
const {IMAGE_DATA} = require('../baibaiConfigs');
const {cm,combine} = require(path.join(__dirname, '/coin/market.js'))
const {getStock} = require(path.join(__dirname, '/coin/stock.js'))

pushTask();
var ws;
function setPushWs(revws){
  console.log('set puuuuuuuuuuuuuuuush');
  ws = revws
}


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
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.setTimeout(5000,function(){
    req.end();
    callback(0);
  });
  req.end();
}


function pushToGroup(type) {
  if (type == 2) {
    var groupid = 221698514;
    var callback = function (res, blank) {

      var msg = res.trim();
      var port = 25334;
      if (res.trim().length > 0) {
          res = res.replace(/CQ:image,file=sen/i, "CQ:image,file=/home/flan/baibai/coolq-data/cq/data/image/sen")
          var bdy = {"user_id": 357474405, message: res};
          var sendBody = {
            "action": "send_msg",
            "params": {
              "message_type": "group",
              "group_id": groupid,
              "message": res
            }
          }
          console.log('will send wsssssssssssssss');
          console.log(sendBody);
          console.log(ws);
          if(ws){
            ws.send(JSON.stringify(sendBody));
          }
          // console.log("send:" + res);
          // request({
          //     headers:{
          //         "Content-Type":"application/json"
          //     },
          //     method: "POST",
          //     url: 'http://'+require('../baibaiConfigs').myip+':'+25334+'/send_private_msg',
          //     body: JSON.stringify(bdy)
          // }, function(error, response, body) {
          //     if (error && error.code) {
          //         console.log('pipe error catched!')
          //         console.log(error);
          //     } else {
          //         console.log('ok1');
          //     }
          // });
      }
    }
    var now = new Date();
    if (now.getMinutes() > 25 && now.getMinutes() < 35) {
      combine(callback);
      if (now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() == 15) {
        getStock(callback);
      }
    } else {
      combine(callback);
    }
  }
}








function getPrice(callback){
  failed=0;
  getCoinMarket(callback,false);
}

function getCoinMarket(callback,withproxy, isInterface = false){
  var now = new Date();
  console.log('will get conmarket:'+withproxy);
  var options = {
    hostname: "api.coinmarketcap.com",
    port: 443,
    path: '/v1/ticker/?convert=CNY&limit=30',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  if(withproxy){
    options.agent=agent;
  }
  //options.agent=agent;
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        var data = eval(resdata);
        var ret = "数字货币行情(CoinMarket)："+now.toLocaleString()+"\n";
        var n={"btc":1,"ltc":1,"eth":1,"etc":1,"xrp":1,"eos":1,"bch":1,"qtum":1,"dash":1,"neo":1,"ada":1}
        if(isInterface){
          ret = []
        }
        for(var i=0;i<data.length;i++){
          var pd = data[i];
          var symbol=pd.symbol;
          if(n[symbol.toLowerCase()]){
            var price_usd=parseFloat(pd.price_usd);
            var price_cny=parseFloat(pd.price_cny);
            //var rate = price_cny/price_usd;
            if(isInterface){
              ret.push({
                type: symbol,
                usd: price_usd.toFixed(2),
                cny: price_cny.toFixed(2),
                c1h: pd.percent_change_1h,
                c1d: pd.percent_change_24h
              })
            } else {
              ret = ret + symbol + ":$"+price_usd.toFixed(2)+"   \t￥"+price_cny.toFixed(2)+"\n";
            }
          }
        }
        callback(ret);
      });
      res.on('error',function(){

      })
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
    failed = failed + 1;
    if(failed>2){
      callback('CoinMarket BOOM!');
    }else{
      getCoinMarket(callback,true);
    }
  });
  req.setTimeout(5000,function(){
    failed = failed + 1;
    if(failed>2){
      callback('CoinMarket BOOM!');
    }else{
      getCoinMarket(callback,true);
    }
  });
  req.end();
}


module.exports={
  pushToGroup,
  pushTask,
  getPrice,
  getBitFlyer,
  getCoinMarket,
  setPushWs
}
