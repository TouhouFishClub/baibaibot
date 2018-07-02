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
        if(c>0.9+Math.random()*3){
          memory[groupuin]={l:content,c:c+1,m:true,lx:list};
          callback(content,true);
        }else{
          memory[groupuin]={l:content,c:c+1,m:um,lx:list};
        }
      }else{
        memory[groupuin]={l:content,c:c+1,m:um,lx:list};
      }
      console.log("c:"+c);
      if(list.length>4+Math.random()*2){
        var banqq = list[Math.floor(list.length*Math.random())];
        callback('发现大量复读姬出没！\n下面百百要选择一名复读姬塞上口球\n到底是哪位小朋友这么幸运呢？\n就决定是你了[CQ:at,qq='+banqq+']');
        banUserInGroup(banqq,groupuin,120);
        memory[groupuin].lx=[banqq];
        console.log(banqq,groupuin);
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