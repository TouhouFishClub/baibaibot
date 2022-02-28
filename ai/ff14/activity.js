var http = require('http');

function runFF14activity(){
  springActivity();
}


var timer = 0;
function springActivity(){
  var now = new Date();
  if(now.getTime()<1578449758429){
    var left1 = 3600000*14 - new Date().getTime()%86400000;
    if(left1<0){
      left1 = left1 + 86400000;
    }
    var left2 = 3600000*5 - new Date().getTime()%86400000;
    if(left2<0){
      left2 = left2 + 86400000;
    }
    var left = Math.min(left1,left2);
    console.log('will start ff14 spring activity '+ (left/60000).toFixed(0) + 'minutes')
    if(timer==0){
      timer = 1;
      setTimeout(function(){
        alarmBox();
        setTimeout(function () {
          timer = 0;
          springActivity();
        },10000);
      },left)
    }
  }
}

function alarmBox(){
  var res = "提醒签到小助手,该去签到领暗影值啦\nhttp://act.ff.sdo.com/20191225Christmas/index.html#/index\n";
  var groupid = 697381070
  var options = {
    host: require('../../baibaiConfigs').myip,
    port: 25334,
    path: '/send_group_msg?group_id='+groupid+'&message='+encodeURIComponent(res),
    method: 'GET',
    headers: {

    }
  };
  var req = http.request(options);
  req.end();
}

runFF14activity();

module.exports={

}

