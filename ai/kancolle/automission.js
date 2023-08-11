var fs = require('fs');
var https = require('https');
var request = require('request');
var token = 'fd945ffb03b735797c2c03dc10db64dc20a37dc6';
var ua = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';
var urlhead = 'http://203.104.209.199'

var shipidlist2='3213%2C3220%2C13599%2C13614';
var shipidlist6='13241%2C13180%2C13065%2C2939';
var shipidlist21='2987%2C1%2C1411%2C15740%2C5723';
function missionStart(deckid,messionid){
  var body = 'api_token='+token+'&api_verno=1&api_mission_id='+messionid+'&api_deck_id='+deckid+'&api_mission='+Math.floor(Math.random()*50)+'&api_serial_cid='+Math.floor(new Date().getTime()/10000)+""+Math.floor(Math.random()*1000000000000)
  var url = urlhead+'/kcsapi/api_req_mission/start';
  request({
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'User-Agent': ua
    },
    url: url,
    method:'POST',
    body:body
  }, function(error, response, bodyres) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      console.log(bodyres);
    }
  });
}

function charge(idlist){
  var body = 'api_token='+token+'&api_verno=1&api_kind=3&api_id_items='+idlist+'&api_onslot=1';
  var url = urlhead+'/kcsapi/api_req_hokyu/charge';
  request({
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'User-Agent': ua
    },
    url: url,
    method:'POST',
    body:body
  }, function(error, response, bodyres) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      console.log(bodyres);
    }
  });
}

function missionresult(deckid){
  var body = 'api_token='+token+'&api_verno=1&api_deck_id='+deckid;
  var url = urlhead+'/kcsapi/api_req_mission/result';
  request({
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'User-Agent': ua
    },
    url: url,
    method:'POST',
    body:body
  }, function(error, response, bodyres) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      console.log(bodyres);
    }
  });
}

function run2(){
  if(new Date().getHours()<9||new Date().getHours()>14){
    setTimeout(function() {
      charge(shipidlist2);
      setTimeout(function () {
        missionStart(2, 2);
        setTimeout(function () {
          missionresult(2);
          setTimeout(function () {
            charge(shipidlist2);
            run()
          }, 10000 + Math.floor(Math.random() * 10000))
        }, 1800000 + Math.floor(Math.random() * 60000))
      }, 10000 + Math.floor(Math.random() * 10000))
    },10000)
  }else{
    setTimeout(function(){
      run2()
    },30000)
  }
}

function run6(){
  if(new Date().getHours()<9||new Date().getHours()>14){
    setTimeout(function(){
      charge(shipidlist6);
      setTimeout(function(){
        missionStart(3,6);
        setTimeout(function(){
          missionresult(3);
          setTimeout(function(){
            charge(shipidlist6);
            run()
          },10000+Math.floor(Math.random()*10000))
        },2400000+Math.floor(Math.random()*60000))
      },10000+Math.floor(Math.random()*10000))
    },10000);
  }else{
    setTimeout(function(){
      run6()
    },30000)
  }
}

function run21(){
  if(new Date().getHours()<9||new Date().getHours()>14){
    setTimeout(function() {
      charge(shipidlist21);
      setTimeout(function () {
        missionStart(4, 21);
        setTimeout(function () {
          missionresult(4);
          setTimeout(function () {
            charge(shipidlist21);
            run()
          }, 10000 + Math.floor(Math.random() * 10000))
        }, 8400000 + Math.floor(Math.random() * 60000))
      }, 10000 + Math.floor(Math.random() * 10000))
    },10000);
  }else{
    setTimeout(function(){
      run21()
    },30000)
  }
}

function login(x){
  if(x>5){
    return;
  }
  var body = 'login_id=a26214311%40gmail.com&password=sbddmjvbw1&mode=1'
  var url = 'https://ooi.moe/';
  request({
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'User-Agent': ua,
      'referer':'https://ooi.moe/'
    },
    url: url,
    method:'POST',
    body:body
  }, function(error, response, bodyres) {
    if (error && error.code) {
      console.log('pipe error catched!')
      console.log(error);
    } else {
      var headers = response.headers;
      var cookie = headers['set-cookie'];
      request({
        headers:{
          'Content-Type':'application/x-www-form-urlencoded',
          'User-Agent': ua,
          'Cookie':cookie
        },
        url: 'https://ooi.moe/kancolle',
        method:'GET'
      }, function(error, response, bodyres) {
        if (error && error.code) {
          console.log('pipe error catched!')
          console.log(error);
        } else {
          var n = bodyres.indexOf('api_token=')
          var s1 = bodyres.substring(n+10);
          var n1 = s1.indexOf('&');
          var tk = s1.substring(0,n1);
          if(n>0&&n1>0){
            token=tk;
          }else{
            login(x+1)
          }
        }
      });
    }
  });
}


function go(){
  login(0);
  setTimeout(function(){
    setTimeout(function(){
      run2()
    },10000+Math.floor(Math.random()*10000))
    setTimeout(function(){
      run6()
    },30000+Math.floor(Math.random()*10000))
    setTimeout(function(){
      run21()
    },50000+Math.floor(Math.random()*10000))
  },30000)
}

go()









