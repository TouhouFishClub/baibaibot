var Axios = require('axios');

function banuser(content,userName,callback) {
  var time;
  if(content==""){
    time=Math.floor(Math.random()*600);
  }else{
    time = parseInt(content);
  }
  Axios.get('http://54.223.156.168:23334/set_group_ban?group_id=205700800&user_id=705886109&duration='+time, {
    timeout: 6000,
    headers: {}
  }).then(function(response){
    callback('H已被口球'+time+'秒');
  }).catch(error => {
    console.log(error)
  })
}

module.exports={
  banuser
}