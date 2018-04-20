const fs = require('fs')
// const gm = require('gm')
// let imageMagick = gm.subClass({ imageMagick : true });

const checkMaxWidth = (ctx, str, maxWidth) => {
  let start = 0, splitArr = []
  for(let i = 1; i < str.length; i++){
    if(ctx.measureText(str.substring(start, i)).width > maxWidth){
      splitArr.push(str.substring(start, i - 1))
      start = i - 1
    }
  }
  splitArr.push(str.substring(start))
  console.log('---')
  console.log(splitArr)
  return splitArr
}

module.exports = function(obj, __dir){
  let Canvas = require('canvas')
    , Image = Canvas.Image
    , canvas = new Canvas(400, 2000)
    , ctx = canvas.getContext('2d');
  ctx.font = '20px DFGirl';
  ctx.fillStyle = 'rgba(0,0,58,0.7)';
  ctx.fillRect(0, 0, 400, 2000)

  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  let title = 'Title'
  ctx.fillText(title, (400 - ctx.measureText(title).width)/2, 30)

  let titleDesc = 'Enchant Scroll'
  ctx.font = '12px DFGirl';
  ctx.fillText(titleDesc, (400 - ctx.measureText(titleDesc).width)/2, 43)

  ctx.font = '20px DFGirl';

  let desc = obj.OptionDesc.split('\\n'), formatArr = []
  const MAX_WIDTH = 350
  desc.forEach(str => {
    // console.log(str)
    if(ctx.measureText(str).width < MAX_WIDTH) {
      formatArr.push(str)
    } else {
      formatArr = formatArr.concat(checkMaxWidth(ctx, str, MAX_WIDTH))
    }
  })
  console.log(formatArr)

  var imgData = canvas.toDataURL()
  var base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
  var dataBuffer = new Buffer(base64Data, 'base64');
  fs.writeFile("image.png", dataBuffer, function(err) {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！");
    }
  });
}