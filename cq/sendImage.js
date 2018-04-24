const fs = require('fs')
const path = require('path')
const { IMAGE_DATA } = require(path.join(__dirname, '../baibaiConfigs.js'))

function sendGmImage(gmObj,words='',callback,order){
  var imgname2 = new Date().getTime()+"";
  var now = new Date();
  var year = now.getFullYear();
  var mon = now.getMonth()<9?('0'+(now.getMonth()+1)):now.getMonth();
  var dat = now.getDate()<10?('0'+now.getDate()):now.getDate();
  var folder = ""+year+mon+dat;
  var head = '../coolq-data/cq/data/image/send/';
  if(!fs.existsSync(head+folder)){
    fs.mkdirSync(head+folder);
  }
  if(!fs.existsSync(head+folder+"/card")){
    fs.mkdirSync(head+folder+"/card");
  }
  gmObj.write(head+folder+"/card/"+imgname2+".jpg",function(err){
    var imgname = "send/"+folder+"/card/"+imgname2+".jpg";
    var ret;
    if(order==1){//words behind
      ret = '[CQ:image,file='+imgname+']'+words;
    }else{
      ret = words+'[CQ:image,file='+imgname+']';
    }
    callback(ret);
  });
}

const sendImageMsgBuffer = (imgBuffer, imgName, dir, callback, msg = '', order = 'IF') => {
  fs.writeFile(path.join(IMAGE_DATA, dir, `${imgName}.png`), imgBuffer, err => {
    if(err){
      console.log(err)
    }else{
      console.log(`保存${imgName}.png成功！`)
      let imgMsg = `[CQ:image,file='${path.join(dir, `${imgName}.png`)}']`, mixMsg = ''
      switch(order){
        case 'IF':
          mixMsg = `${imgMsg}${msg.length ? `\n${msg}` : ''}`
          break
        case 'MF':
          mixMsg = `${msg.length ? `${msg}\n` : ''}${imgMsg}`
          break
      }
      callback(mixMsg)
    }
  })
}

module.exports = {
  sendGmImage,
  sendImageMsgBuffer
}