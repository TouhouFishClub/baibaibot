var express = require('express');
var app = express();
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

app.post('/event',function(req,res){
  console.log(req.query);
  console.log(req.body);
  res.send('ok');
});


// const {baikeReply} = require('./ai/baidusearch');
// const {translateMsg}=require('./ai/translate');
// const {money} = require('./ai/money');
// const {getloc,route} = require('./ai/map');
// const {urlget} = require('./src/utils/httpreq');
// const {cal} = require('./ai/calculator')
//  const {weatherReply,getWeatherByCity,getWeatherByCityCode} = require('./ai/weather');
// const xchange = require('./ai/xchange')
// const kce = require('./ai/kanColleEquip')
// const updateAll = require('./mongo/db_kcUpdateAll')
// const {getMapData} = require('./ai/kancolle/kancollemap');
// const {searchsenka} = require('./ai/kancolle/senka');
// const {fixUser,regen} = require('./ai/favour/battle');
// const {regenm} = require('./ai/chess/road');
// const {streaminit} = require('./ai/twitter');

// const kcq = require('./ai/kanColleQuest');
const roulette = require('./ai/Roulette')


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
  res.send(roulette('QQ1', '俄罗斯轮盘', callback))
  setTimeout(() => {
    res.send(roulette('QQ1', '加入', callback))
  },500)
  setTimeout(() => {
    res.send(roulette('QQ2', '加入', callback))
  },1000)
  setTimeout(() => {
    res.send(roulette('QQ2', '加入', callback))
  },1200)
  setTimeout(() => {
    res.send(roulette('QQ3', '加入', callback))
  },1500)
  setTimeout(() => {
    res.send(roulette('QQ1', '开枪', callback))
    res.send(roulette('QQ2', '开枪', callback))
    res.send(roulette('QQ3', '开枪', callback))
  },3500)
  setTimeout(() => {
    res.send(roulette('QQ1', '开枪', callback))
    res.send(roulette('QQ2', '开枪', callback))
    res.send(roulette('QQ3', '开枪', callback))
  },4000)
  // res.send(kcq('QQid', '以结|强力羁绊舰娘作为|旗舰|舰娘|消灭敌人中枢！|4-3|第1舰队|最初的|初めて|二人です', callback))
  // res.send(kcq('QQid', '', callback))
  // res.send(kcq('QQid', 'BAKABAKABAKA', callback))
});
app.get('/test2',function(req,res){//这个函数时空专用！^-^
  getWeatherByCity('香港','id',function(ret){
    console.log(ret);
    res.send(ret);
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

