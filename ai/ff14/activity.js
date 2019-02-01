var http = require('http');

function runFF14activity(){
  springActivity();
}


var timer = 0;
function springActivity(){
  var now = new Date();
  if(now.getFullYear()==2019&&now.getMonth()==1&&now.getDate()<=11){
    var left = 3600000*14 - new Date().getTime()%86400000;
    if(left<0){
      left = left + 86400000;
    }
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
  var res = "领新春箱子啦,各位光战们可别忘了哦\nhttp://act.ff.sdo.com/20190129NewYear/index.html#page2\n";
  var groupid = 635084427
  var options = {
    host: '192.168.17.52',
    port: 23334,
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

