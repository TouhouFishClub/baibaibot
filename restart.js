const express = require('express')
const app = express();
const http = require('http')
const fs = require('fs')
const path = require('path')


var bodyParser = require('body-parser');
app.use(bodyParser.json())
var request = require("request");
app.use(express.static(path.join(__dirname, 'public')));

var exec = require('child_process').exec;



app.listen('10089', () => {
  console.log('server started')
  console.log('http://localhost:10086')
})

app.get('/restart',function(req,res){
  var cmdStr = './restart.sh';
  exec(cmdStr, function(err,stdout,stderr){
    if(err) {
      console.log('get weather api error:'+stderr);
    } else {

    }
  });
  res.send('restarting');
})















