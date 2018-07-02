const {banUserInGroup} = require('../cq/cache');

var memory={};
function replayReply(content,userName,groupuin,callback,qq){
  content=content.trim();
  if(memory[groupuin]){
    var lst = memory[groupuin];
    console.log(lst);
    var lastcontent = lst.l;
    if(content==lastcontent){
      var um = lst.m;
      var c = lst.c;
      var list = lst.lx;
      list.push(qq);
      if(!um){
        if(c>5){
          var banqq = list[Math.floor(list.length*Math.random())];
          banUserInGroup(banqq,groupuin,60);
        }
        if(c>0.9+Math.random()*3){
          memory[groupuin]={l:content,c:c+1,m:true,lx:list};
          callback(content,true);
        }else{
          memory[groupuin]={l:content,c:c+1,m:um,lx:list};
        }
      }else{
        memory[groupuin]={l:content,c:c+1,m:um,lx:list};
      }
    }else{
      memory[groupuin]={l:content,c:1,m:false,lx:[qq]};
    }
  }else{
    memory[groupuin]={l:content,c:1,m:false,lx:[qq]}
  }
}

module.exports={
  replayReply
}