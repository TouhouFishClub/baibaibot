var http =require('http');

var last='357474405';

function handlePrivateMsg(msgObj){
  var content = msgObj.message;
  var userid = msgObj.user_id;
  var res=content;
  var callbackid;
  if(userid=='3004768431'){
    callbackid=last;
  }else{
    callbackid=3004768431;
    last = userid;
  }
  var callback = function(res){
    if(res.trim().length>0){
      setTimeout(function(){
        var options = {
          host: '192.168.17.52',
          port: 23334,
          path: '/send_private_msg?user_id='+callbackid+'&message='+encodeURIComponent(res),
          method: 'GET',
          headers: {

          }
        };
        console.log("priv:"+userid+":"+content+":"+res);
        var req = http.request(options);
        req.on('error', function(err) {
          console.log('req err:');
          console.log(err);
        });
        req.end();
      },1000);
    }
  }
  callback(res);
}


module.exports={
  handlePrivateMsg
}