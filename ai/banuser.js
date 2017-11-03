var Axios = require('axios');
const surl = 'http://localhost:23334/';


function banuser(content,userName,callback) {
  var time;
  if(content==""){
    time=Math.floor(Math.random()*3600);
  }else{
    time = parseInt(content);
    if(!time){
      time=Math.floor(Math.random()*3600);
    }
  }
  banUserbyName(userName,time);
  console.log(userName);
  setTimeout(function(){
    banUserbyName(userName,0);
  },time+1000);
}

var qmap={};

function banUserbyName(name,seconds){
  if(qmap.c){
    if(qmap[name]){
      console.log(qmap[name]);
      Axios.get(surl+'set_group_ban?group_id=205700800&user_id='+qmap[name].qq+'&duration='+seconds);
    }else{

    }
  }else{
    Axios.get(surl+'get_group_member_list?group_id=205700800', {
      timeout: 6000,
      headers: {}
    }).then(function(response){
      var data=response.data;
      var list = data.data;
      if(list){
        qmap.c=1;
        for(var i=0;i<list.length;i++){
          var user = list[i];
          var name = user.nickname;
          var card = user.card;
          var qq = user.user_id;
          if(card.length>0){
            qmap[card]={name:name,card:card,qq:qq};
          }else{
            qmap[name]={name:name,card:card,qq:qq};
          }
        }
        if(qmap[name]){
          console.log(qmap[name]);
          Axios.get(surl+'set_group_ban?group_id=205700800&user_id='+qmap[name].qq+'&duration='+seconds);
        }else{

        }
      }
    }).catch(error => {
      console.log(error)
    })
  }
}



module.exports={
  banuser,
  banUserbyName
}