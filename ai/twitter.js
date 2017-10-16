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
      var ret = tw.text+"\n"+tw.created_at
      callback(ret);
    }else{
      console.log(error);
    }
  });
}

function stream(){
  var stream = client.stream('statuses/filter', {track: 'javascript'});
  stream.on('data', function(event) {
    console.log(event && event.text);
  });

  stream.on('error', function(error) {
    throw error;
  });

// You can also get the stream in a callback if you prefer.
  client.stream('statuses/filter', {track: 'javascript'}, function(stream) {
    stream.on('data', function(event) {
      console.log(event && event.text);
    });

    stream.on('error', function(error) {
      throw error;
    });
  });

}



function init(){
  console.log(111);
}


module.exports={
  init,
  getKancollStaffTweet
}