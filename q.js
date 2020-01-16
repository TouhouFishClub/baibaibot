const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')
const basicAuth = require('basic-auth');


var bodyParser = require('body-parser');
app.use(bodyParser.json())
var request = require("request");
app.use(express.static(path.join(__dirname, 'public')));

var exec = require('child_process').exec;

app.listen('10099', () => {
  console.log('server started')
  console.log('http://localhost:10089')
})

app.get('/restart',function(req,res){

  var user = basicAuth(req);
  var check = !user || !user.name || !user.pass || user.name != 'aaa' || user.pass != '111';
  if (check) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    res.send(401);
  }else{
    var cmdStr = './bstart.sh';
    exec(cmdStr, function(err,stdout,stderr){
      if(err) {
        console.log('get weather api error:'+stderr);
      } else {

      }
    });
    res.send('ok3');
  }


})















