var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var util = require('util');
var URL = require('url');
var fs = require('fs');
app.use(express.static('./static'));

const {relogin} = require('./baibai');

app.listen(10086,function(){

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


const {baikeReply} = require('./ai/baidusearch');
const {translateMsg}=require('./ai/translate');
const {money} = require('./ai/money');
const {getloc,route} = require('./ai/map');
const {urlget} = require('./src/utils/httpreq');
const {cal} = require('./ai/calculator')
const {weatherReply,getWeatherByCity,getWeatherByCityCode} = require('./ai/weather');


app.get('/test',function(req,res){
  getWeatherByCity('商丘',function(ret){
    res.send(ret+"");
  })
});

