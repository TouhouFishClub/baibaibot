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
const {drawNameCard,getDetailByName} = require('./ai/games/card/draw');
//getDetailByName(1,'Etihw','/Etihw',function(){});
//mabi()
getNameList();

