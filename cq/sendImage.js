const fs = require('fs')
const path = require('path')
const { IMAGE_DATA } = require(path.join(__dirname, '../baibaiConfigs.js'))

function sendGmImage(gmObj,callback){
  var imgname2 = new Date().getTime()+"";
  gmObj.write('../coolq-data/cq/data/image/send/card/'+imgname2+".jpg",function(err){
    callback("send/card/"+imgname2+".jpg");
    // callback("[CQ:image,file='send/card/"+imgname2+".jpg+']");
  });
}

const sendImageMsgBuffer = (imgBuffer, imgName, dir, callback, msg = '', order = 'IF') => {
  fs.writeFile(path.join(IMAGE_DATA, dir, `${imgName}.png`), imgBuffer, err => {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！")
    }
  })
}

module.exports = {
  sendGmImage,
  sendImageMsgBuffer
}