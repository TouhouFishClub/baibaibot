var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var util = require('util');
var URL = require('url');
var fs = require('fs');
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


const {baikeReply} = require('./ai/baidusearch');
const {translateMsg}=require('./ai/translate');
const {money} = require('./ai/money');
const {getloc,route} = require('./ai/map');
const {urlget} = require('./src/utils/httpreq');
const {cal} = require('./ai/calculator')
const {weatherReply,getWeatherByCity,getWeatherByCityCode} = require('./ai/weather');
const xchange = require('./ai/xchange')
const kce = require('./ai/kanColleEquip')

app.get('/test',function(req,res){
  // res.send(xchange('QQid', 'ETH', callback));
  // res.send(xchange('QQid', 'BTC', callback));
  // res.send(xchange('QQid', '1.3比特币-美元', callback));
  // res.send(xchange('QQid', 'USD-LTC', callback));
  // getWeatherByCity('',function(ret){
  //   res.send(ret+"");
  // })
  res.send(kce('QQid', '飞机', callback))
});

var callback = function(res){
  if(res.trim().length>0){
    setTimeout(function(){

      console.log(res)
      console.log('\n=========\n')

    },1000);
  }
}

