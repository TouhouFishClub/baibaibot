const fs = require('fs')
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', '..', 'baibaiConfigs.js'))
const chujue = (content, callback) => {
  const image = fs.readFileSync(path.join(__dirname, './处决.png'));
  const base64Image = new Buffer.from(image).toString('base64');
  const dataURI = 'data:image/jpeg;base64,' + base64Image
  let qq = content

  if(qq.startsWith('[CQ:at')){
    qq = qq.substring(qq.indexOf('qq=') + 3, qq.indexOf(']'))
  }

  if(!(/^\d+$/.test(qq) && qq.length > 4)) {
    console.log('输入错误')
  }

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
    * {
      border: 0;
      padding: 0;
      margin: 0;
    }
    body {
      width: 500px;
      height: 609px;
      position: relative;
    }
    .bg {
      width: 500px;
      height: 609px;
      position: absolute;
      top: 0;
      left: 0;
    }
    .avatar {
      width: 260px;
      height: 260px;
      position: absolute;
      top: 86px;
      left: 123px;
    }
  </style>
</head>
<body>
  <img src="http://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640" class="avatar">
  <img src="${dataURI}" class="bg">
</body>
</html>`
  let output = path.join(IMAGE_DATA, 'other', `chujue.png`)
  nodeHtmlToImage({
    output,
    html
  })
    .then(() => {
      console.log(`保存chujue.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'other', `chujue.png`)}]`
      callback(imgMsg)
    })
}

module.exports = {
  chujue
}