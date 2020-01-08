var fs = require('fs');

function copperReply(content,gid,qq,callback){
  fs.readdir('../coolq-data/cq/data/image/send/copper1/',function(err,files){
    var len = files.length;
    var rdfile = files[Math.floor(Math.random()*len)];
    var ret = '[CQ:image,file=send/copper1/' + rdfile + ']';
    callback(ret);
  })
}

module.exports={
  copperReply
}