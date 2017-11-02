var Axios = require('axios');
const surl = 'http://localhost:23334/';


function banuser(content,userName,callback) {
  var time;
  if(content==""){
    time=Math.floor(Math.random()*6000);
  }else{
    time = parseInt(content);
  }
  Axios.get(surl+'set_group_ban?group_id=205700800&user_id=705886109&duration='+time, {
    timeout: 6000,
    headers: {}
  }).then(function(response){
    setTimeout(function(){
      Axios.get(surl+'set_group_ban?group_id=205700800&user_id=705886109&duration=0');
    },time)
  }).catch(error => {
    console.log(error)
  })
}

module.exports={
  banuser
}