var memory={};
function replayReply(content,userName,groupuin,callback){
  content=content.trim();
  if(memory[groupuin]){
    var lst = memory[groupuin];
    var lastcontent = lst.l;
    if(content==lastcontent){
      var um = lst.m;
      if(!um){
        var c = lst.c;
        if(c>2){
          memory[groupuin]={l:content,c:c+1,m:true};
          callback(content,true);
        }else{
          memory[groupuin]={l:content,c:c+1,m:um};
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