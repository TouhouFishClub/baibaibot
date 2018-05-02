var http =require('http');
var crypto = require('crypto');
var fs=require('fs');
var request = require("request");
const {RECORD_DATA} = require('../../baibaiConfigs');
var path = require('path');

const WxVoice = require('wx-voice');
var voice = new WxVoice();

function qvoice(){

}

module.exports={
  qvoice
}