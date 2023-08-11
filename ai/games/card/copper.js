var fs = require('fs');

var cache = {};
const {IMAGE_DATA,RECORD_DATA} = require('../../../baibaiConfigs');

function copperReply(content,gid,qq,callback,nextfolder,port){

    if(port==23334){
        var cooldown = 60000 * 30;
        var maxtimes = 5;
        var imgtype='image';
        if(content.substring(2)=="3"){
            imgtype='cardimage'
        }
        var now = new Date().getTime();
        if (cache[qq]) {
            var then = cache[qq].ts;
            var cc = cache[qq].c;
            if (now - then < cooldown) {
                if (cc >= maxtimes) {
                    callback('【' + '[CQ:at,qq='+qq+']' + '】的炼铜技能CD中!恢复时间：' + new Date(then + cooldown).toLocaleString());
                    return;
                } else {
                    cache[qq] = {ts: now, c: cc + 1};
                }
            } else {
                cache[qq] = {ts: now, c: 1};
            }
        } else {
            cache[qq] = {ts: now, c: 1};
        }
    }




  if(!nextfolder){
    nextfolder='/';
  }
  var sets = parseInt(content.substring(2,3));
  if(!sets){
    sets=2;
  }
  fs.readdir(IMAGE_DATA+'/copper'+sets+nextfolder,function(err,files){
    var len = files.length;
    var rdfile = files[Math.floor(Math.random()*len)];
    var fileStat = fs.lstatSync(IMAGE_DATA+'/copper'+sets+nextfolder+rdfile);
    if(fileStat.isDirectory()){
      copperReply(content,gid,qq,callback,nextfolder+rdfile+'/')
    }else{
      if(rdfile.endsWith(".txt")){
        copperReply(content,gid,qq,callback,nextfolder)
      }else{
        var ret = '[CQ:image,file=send/copper'+sets+nextfolder+ rdfile + ']';
        callback(ret);
      }
    }
  })
}


module.exports={
  copperReply
}
