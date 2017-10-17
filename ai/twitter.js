var Twitter = require('twitter');

var client = new Twitter({
  consumer_key: 'AjXqw0Z427tM5KQWX1Us4yV3t',
  consumer_secret: 'FAxsWzw70i94HpfWqYndlzhHHMQDSPWznq6k2GPv39TLs9IPMr',
  access_token_key: '439162276-pFl421iVDgC5z9PauUi4dOMcTnpJ7koQb6RpXvIM',
  access_token_secret: 'aLlLLKRxBaJg9JrkG3ZHq5ns30mANKxYx7cCFZwASkfpC',
  request_options: {
    proxy: 'http://192.168.17.62:3128'
  }
});



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
      var ret = tw.text+"\n"+new Date(tw.created_at).toLocaleString();
      callback(ret);
    }else{
      console.log(error);
    }
  });
}

function stream(groups,callback){

  client.stream('statuses/filter', {follow: '294025417'}, function(stream) {
    console.log('will start stream');
    console.log("groups：");

    var pushlist = [];
    for (let g of groups) {
      if(g.name.indexOf('咸鱼')>0){
        pushlist.push(g.gid);
      }
    }
    console.log(pushlist);
    stream.on('data', function(event) {
      var text = event.text;
      var tsstr = new Date(event.created_at).toLocaleString();
      var ret = text+"\n"+tsstr;
      for(var i=0;i<pushlist.length;i++){
        callback(pushlist[i],ret);
      }
      console.log(ret);
    });
    stream.on('error', function(error) {
      console.log(error);
    });
  });

}



function init(){
  console.log(111);
}


module.exports={
  init,
  getKancollStaffTweet,
  stream
}