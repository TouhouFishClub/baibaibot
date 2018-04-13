var express = require('express');
var app = express();
const {handleMsg,reconnect} = require('./baibai2');

const callback = function(res){
  if(res.trim().length>0){
    setTimeout(function(){

      console.log(res)
      console.log('\n=========\n')

    },1000);
  }
}
const mabi = require('./ai/mabinogi/smuggler')
const {getNameList} = require('./ai/games/card/fetch');
const {drawNameCard,getDetailByName,draw2df} = require('./ai/games/card/draw');
const {fetchbangumi} = require('./ai/games/card/bangumi');
const {searchByUrl} = require('./ai/image/google')
//getDetailByName(1,'Etihw','/Etihw',function(){});
//mabi()
//getNameList();
//fetchGame(2235)
//draw2df(1,2,function(r){console.log(r)});
//searchByUrl();


