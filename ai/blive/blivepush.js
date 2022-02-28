const http = require('http')
const fs = require('fs')
const path = require('path')
var request = require("request");


function initroom(){
  var roomid = 39277
  var url = "https://api.live.bilibili.com/room/v1/Danmu/getConf?room_id="+roomid;
  request({
    url: url,
    method: "GET"
  }, function(error, response, body){
    if(error&&error.code){
      console.log('pipe error catched!')
      console.log(error);
    }else{
      var data = eval('('+body+')');
      var server = data.data.host_server_list[0]
      console.log(server);
      var token = data.data.token;
      var wssurl = "wss://"+server.host+":"+server.wss_port+"/sub";
      var auth = {
        "uid":0,
        "roomid":roomid,
        "protover":2,
        "platform":"web",
        "clientver":"1.8.2",
        "type":2,
        "key":token
      }
      initBLiveWS(wssurl,auth);
    }
  })
}

initroom();


function initBLiveWS(wssurl,auth){
  var WebSocketClient = require('websocket').client;

  var client = new WebSocketClient();

  client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
  });

  client.on('connect', function(connection) {
    wsonline = true;
    console.log('WebSocket Client Connected');
    console.log(auth)
    setTimeout(function(){
      connection.send(JSON.stringify(auth));
    },2000)
    connection.on('error', function(error) {
      console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function(r,x) {
      console.log(r,x);
      wsonline=false;
      console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        console.log(message.utf8Data)
      }
    });
  });
  client.connect(wssurl);
}

