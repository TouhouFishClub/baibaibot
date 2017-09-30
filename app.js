var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var util = require('util');
var URL = require('url');
var fs = require('fs');
const path = require('path')
const Axios = require('axios')
const opn = require('opn')
app.use(express.static('./static'));

const {relogin} = require('./baibai');

app.listen(10086,function(){
  opn('http://127.0.0.1:10086/test', {app: ['chrome']})
});
app.get('/login',function(req,res){
  fs.unlink('qq-bot.cookie',function(){
    relogin();
    setTimeout(function(){
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type','image/png');
      var rd = new Date().getTime()+".png";
      fs.rename('static/code.png','static/'+rd,function(){
        res.redirect(rd)
      });
    },3000);
  })
});

app.get('/log',function(req,res){
  var logs = fs.readFileSync('./out.log');
  res.setHeader('Content-Type','text/plain');
  res.charset = 'utf-8';
  res.send(logs);
});


// const {baikeReply} = require('./ai/baidusearch');
// const {translateMsg}=require('./ai/translate');
// const {money} = require('./ai/money');
// const {getloc,route} = require('./ai/map');
// const {urlget} = require('./src/utils/httpreq');
// const {cal} = require('./ai/calculator')
// const {weatherReply,getWeatherByCity,getWeatherByCityCode} = require('./ai/weather');
// const xchange = require('./ai/xchange')
// const kce = require('./ai/kanColleEquip')
// const updateAll = require('./mongo/db_kcUpdateAll')
// const {getMapData} = require('./ai/kancolle/kancollemap');
// const {searchsenka} = require('./ai/kancolle/senka');
// const {fixUser,regen} = require('./ai/favour/battle');
// const {regenm} = require('./ai/chess/road');
const kcq = require('./ai/kanColleQuest');


app.get('/test',function(req,res){
  // updateAll()
  // res.send(xchange('QQid', 'etc', callback));
  // res.send(xchange('QQid', 'bcc', callback));
  // res.send(xchange('QQid', 'btc-usd', callback));
  // res.send(xchange('QQid', 'etc-usd', callback));
  // res.send(xchange('QQid', 'BCC', callback));
  // res.send(xchange('QQid', '美元', callback));
  // res.send(xchange('QQid', 'jpy', callback));
  // res.send(xchange('QQid', '日元-jpy', callback));
  // res.send(xchange('QQid', 'ccc', callback));
  // res.send(xchange('QQid', '美元-日元', callback));
  // res.send(xchange('QQid', '20000韩元-日元', callback));
  // res.send(xchange('QQid', '20000韩元-阿联酋迪拉姆', callback));
  // res.send(xchange('QQid', 'jpy', callback));
  // res.send(xchange('QQid', 'USD-LTC', callback));
  // getWeatherByCity('',function(ret){
  //   res.send(ret+"");
  // })
  //res.send(kce('QQid', '飞机+7', callback))
  // res.send(kce('QQid', 'xa', callback))
  //res.send(kce('QQid', 'x0+6', callback))
  // res.send(kce('QQid', '飞机+7', callback))
  // res.send(kce('QQid', 'xa', callback))
  // res.send(kce('QQid', 'x0+6', callback))
  res.send(kcq('QQid', '翔鹤|瑞鹤|南西|北方|第五', callback))
  res.send(kcq('QQid', '以结|强力羁绊舰娘作为|旗舰|舰娘|消灭敌人中枢！|4-3|第1舰队|最初的|初めて|二人です', callback))
  res.send(kcq('QQid', '', callback))
  res.send(kcq('QQid', 'BAKABAKABAKA', callback))
});

app.get('/test2',function(req,res){//这个函数时空专用！^-^
  searchsenka('aaa','8',function(r){
    console.log(r);
    res.send(r);
  })

})

var callback = function(res){
  if(res.trim().length>0){
    setTimeout(function(){

      console.log(res)
      console.log('\n=========\n')

    },1000);
  }
}

