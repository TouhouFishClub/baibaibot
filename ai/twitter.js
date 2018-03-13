var Twitter = require('twitter');
var http = require('http');
var client;
var errcount = 0;
var zgroups;
var zcallback;

function getKancollStaffTweet(content,UserName,callback){
  var skip=0;
  if(content!=""){
    if(parseInt(content)&&parseInt(content)<20&&parseInt(content)>0){
      skip=parseInt(content);
    }
  }
  client.get('statuses/user_timeline.json', {screen_name: 'KanColle_STAFF'}, function(error, tweets, response) {
    console.log('get tweets')
    if (!error) {
      var tw = tweets[skip];
      console.log(tw);
      var ret = (tw.user?(tw.user.description?tw.user.description:tw.texttw.full_text):tw.text)+"\n"+new Date(tw.created_at).toLocaleString();
      callback(ret);
    }else{
      console.log(error);
    }
  });
}

function stream(groups,callback) {
  zgroups = groups;
  zcallback = callback;
}

function pushTwitterMsg(twitterid,ret,type){
  if(type==2){
    var callback = function(groupid,res){
      if(res.trim().length>0){
        setTimeout(function(){
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
        },1000);
      }
    }
    if(twitterid=='294025417'){
      callback(205700800,ret);
      callback(616147379,ret);

    }
    if(twitterid=='3833285893'){
      callback(205700800,ret);
      callback(568281876,ret);
    }
    if(twitterid=='856385582401966080'){
      callback(205700800,ret);
    }
  }else{
    const {getQQQ,getGroupList} = require('../baibai');
    var groups = getGroupList();
    var qqq = getQQQ();
    var gn = group.name;
    var gid = group.gid;
    if(twitterid=='294025417'){
      if(gn.indexOf('沙丁鱼')>=0||gn.indexOf('ウル')>=0){
        console.log(gn,gid);
        qqq.sendGroupMsg(gid,ret);
      }
    }
    if(twitterid=='3833285893'){
      if(gn.indexOf('沙丁鱼')>=0||gn.indexOf('喵')>=0){
        console.log(gn,gid);
        qqq.sendGroupMsg(gid,ret);
      }
    }
    if(twitterid=='856385582401966080'){
      if(gn.indexOf('沙丁鱼')>=0){
        console.log(gn,gid);
        qqq.sendGroupMsg(gid,ret);
      }
    }
  }

}


function startstream(){
  client.stream('statuses/filter', {follow: '294025417,3833285893'}, function(stream) {
    console.log('will start stream');
    stream.on('data', function(event) {
      console.log('got event:');
      errcount=0;
      if(!event.in_reply_to_status_id&&!event.retweeted_status&&!event.quoted_status&&!event.in_reply_to_user_id){
        console.log(event);
        var text = event.text;
        if(event.extended_tweet){
          if(event.extended_tweet.full_text){
            text = event.extended_tweet.full_text;
          }
        }
        var ts = new Date(event.created_at);
        var tsstr = ts.toLocaleString();
        var ret = text+"\n"+tsstr;
        var now = new Date();
        var twitterscrname=event.user.id;
        if(now.getTime()-ts.getTime()<60000){
          pushTwitterMsg(twitterscrname,ret,2);
        }
      }
    });
    stream.on('error', function(error) {
      console.log(error);
      errcount++;
      if(errcount<5){
        setTimeout(function(){
          streaminit();
        },errcount*60000);
      }
    });
  });

}



function streaminit(){
  client= new Twitter({
    consumer_key: 'AjXqw0Z427tM5KQWX1Us4yV3t',
    consumer_secret: 'FAxsWzw70i94HpfWqYndlzhHHMQDSPWznq6k2GPv39TLs9IPMr',
    access_token_key: '439162276-pFl421iVDgC5z9PauUi4dOMcTnpJ7koQb6RpXvIM',
    access_token_secret: 'aLlLLKRxBaJg9JrkG3ZHq5ns30mANKxYx7cCFZwASkfpC',
    request_options: {
      proxy: 'http://192.168.17.62:3128'
    }
  });
  startstream();
}


module.exports={
  streaminit,
  getKancollStaffTweet,
  stream
}
