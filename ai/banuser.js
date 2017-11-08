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
  var rd = Math.random();
  if(rd<0.4){
    banUserbyName(userName,time);
    setTimeout(function(){
      banUserbyName(userName,0);
    },time+1000);
  }else if(rd<0.7&&qmap.c){
    var namelist = Object.keys(qmap);
    var name = namelist[Math.floor(Math.random()*namelist.length)];
    var user = qmap[name];
    if(user&&user.qq){
      banUserbyQQ(user.qq,time);
    }
  }else{
    var qq=705886109;
    banUserbyQQ(qq,time);
  }
}

var qmap={};

function banUserbyQQ(qq,seconds){
  Axios.get(surl+'set_group_ban?group_id=205700800&user_id='+qq+'&duration='+seconds,{
    timeout: 6000,
    headers: {}
  }).then(function(response){
    setTimeout(function(){
      Axios.get(surl+'set_group_ban?group_id=205700800&user_id='+qq+'&duration='+0);
    },seconds);
  }).catch(error => {
    console.log(error)
  })
}


function banUserbyName(name,seconds){
  console.log(name);
  if(qmap.c){
    if(qmap[name]){
      console.log(qmap[name]);
      Axios.get(surl+'set_group_ban?group_id=205700800&user_id='+qmap[name].qq+'&duration='+seconds);
    }else{
      var qq=0;
      for(var p in qmap){
        if(p.startsWith(name)){
          qq=qmap[p].qq;
          break;
        }
      }
      if(qq>0){
        Axios.get(surl+'set_group_ban?group_id=205700800&user_id='+qq+'&duration='+seconds);
      }
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
          var namec = user.nickname;
          var card = user.card;
          var qq = user.user_id;
          if(card.length>0){
            qmap[card]={name:namec,card:card,qq:qq};
          }else{
            qmap[namec]={name:namec,card:card,qq:qq};
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