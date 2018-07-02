const {banUserInGroup} = require('../cq/cache');

var memory={};
function replayReply(content,userName,groupuin,callback,qq){
  content=content.trim();
  if(memory[groupuin]){
    var lst = memory[groupuin];
    var lastcontent = lst.l;
    if(content==lastcontent){
      var um = lst.m;
      if(!um){
        var c = lst.c;
        var list = lst.l;
        list.push(qq);
        if(c>0.9+Math.random()*3){
          memory[groupuin]={l:content,c:c+1,m:true,l:list};
          callback(content,true);
        }else{
          memory[groupuin]={l:content,c:c+1,m:um,l:[qq]};
        }
        console.log(lst);
        console.log(list);
        if(c>5){
          var banqq = list[Math.floor(list.length*Math.random())];
          banUserInGroup(banqq,groupuin,60);
        }
      }else{

      }
    }else{
      memory[groupuin]={l:content,c:1,m:false};
    }
  }else{
    memory[groupuin]={l:content,c:1,m:false}
  }
}

module.exports={
  replayReply
}