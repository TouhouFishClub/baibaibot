var fs = require('fs');

function copperReply(content,gid,qq,callback,nextfolder){
  if(!nextfolder){
    nextfolder='/';
  }
  var sets = parseInt(content.substring(2,3));
  if(!sets){
    sets=2;
  }
  fs.readdir('../coolq-data/cq/data/image/send/copper'+sets+nextfolder,function(err,files){
    var len = files.length;
    var rdfile = files[Math.floor(Math.random()*len)];
    var fileStat = fs.lstatSync('../coolq-data/cq/data/image/send/copper'+sets+nextfolder+rdfile);
    if(fileStat.isDirectory()){
      copperReply(content,gid,qq,callback,nextfolder+rdfile+'/')
    }else{
      if(rdfile.endsWith(".txt")){
        copperReply(content,gid,qq,callback,nextfolder)
      }else{
        var ret = '【】\n[CQ:image,file=send/copper'+sets+nextfolder+ rdfile + ']';
        callback(ret);
      }
    }
  })
}


module.exports={
  copperReply
}
