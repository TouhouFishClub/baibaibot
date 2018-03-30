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
getDetailByName(1,'伊莎贝尔·克鲁兹','/%E4%BC%8A%E8%8E%8E%E8%B4%9D%E5%B0%94%C2%B7%E5%85%8B%E9%B2%81%E5%85%B',function(){});
//mabi()

