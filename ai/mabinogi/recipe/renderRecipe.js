const fs = require('fs')
const path = require('path')
const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))

let imgHash = {}

const analysisImgSrc = htmlData =>
  htmlData.split("src='img/").map((domSplit, index) => {
    if (index) {
      let sp = domSplit.split("'")
      let imageSrc = sp.shift()
      if (!imgHash[imageSrc] && fs.existsSync(path.join(__dirname, 'img', imageSrc))) {
        let image = fs.readFileSync(path.join(__dirname, 'img', imageSrc));
        let base64Image = new Buffer.from(image).toString('base64');
        imgHash[imageSrc] = 'data:image/jpeg;base64,' + base64Image
      } else {
        console.log('== error image ==')
        imgHash[imageSrc] = ''
      }
      return `src='${imgHash[imageSrc]}'${sp.join("'")}`
    } else {
      return domSplit
    }
  }).join('')


const renderRecipeImage = (html, name, callback, msg = '', order = 'IF') => {
  let output = path.join(IMAGE_DATA, 'mabi_recipe', `${name}.png`)
  // let output = path.join(`${name}.png`)
  nodeHtmlToImage({
    output,
    html: `
<html>
  <head>
    <title></title>
    <style type="text/css">
      body {
        color: gold;
        scrollbar-face-color: #000;
        scrollbar-highlight-color: #000;
        scrollbar-arrow-color: gold;
        scrollbar-shadow-color: gold;
        scrollbar-3dlight-color: #FFF;
        scrollbar-base-color: gold;
        scrollbar-dark-shadow-color: gold;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        -khtml-user-select: none;
        user-select: none;
        width: 921px;
        background-color: #000;
      }
      .Overall {
        width: 911px;
        border: 5px solid gold;
        /*position: relative;*/
        margin：auto;
        text-align: center
      }
      /*.ItemList {*/
      /*  position: absolute;*/
      /*  width: 0;*/
      /*  height: 9px;*/
      /*  top: -5;*/
      /*  right: 911;*/
      /*  border: 1px solid gold;*/
      /*  overflow: auto;*/
      /*  background-color: #000*/
      /*}*/
  
      .MainBody {
        /*position: absolute;*/
        width: 899px;
        /*height: 568px;*/
        margin: 1px;
        border: 5px solid gold;
        overflow: hidden;
        font-size: 12px;
        text-shadow: #000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0;
      }
  
      #List Table {
        border: 1px solid #000
      }
  
      .MainTd {
        background-color: #888;
        animation: MainRun 1s infinite;
        -webkit-animation: MainRun 1s infinite
      }
  
      .ListTd {
        border: 1px solid #000;
        color: black;
        background-color: gold;
        text-shadow: #FFF 1px 0 0, #FFF 0 1px 0, #FFF -1px 0 0, #FFF 0 -1px 0;
        -webkit-text-shadow: #FFF 1px 0 0, #FFF 0 1px 0, #FFF -1px 0 0, #FFF 0 -1px 0;
        -moz-text-shadow: #FFF 1px 0 0, #FFF 0 1px 0, #FFF -1px 0 0, #FFF 0 -1px 0
      }
      
      .EffectTd {
        text-shadow: #DDD 1px 0 0, #DDD 0 1px 0, #DDD -1px 0 0, #DDD 0 -1px 0;
        -webkit-text-shadow: #DDD 1px 0 0, #DDD 0 1px 0, #DDD -1px 0 0, #DDD 0 -1px 0;
        -moz-text-shadow: #DDD 1px 0 0, #DDD 0 1px 0, #DDD -1px 0 0, #DDD 0 -1px 0
      }
      
      /*#ItemLists td, #MaterialLists td, #Skill td {*/
      /*  border: 1px solid #000*/
      /*}*/
      
      /*#ItemLists td:hover, #Skill td:hover {*/
      /*  border: 1px solid gold*/
      /*}*/
      
      td {
        padding: 1px
      }
      
      /*.Skill {*/
      /*  position: absolute;*/
      /*  width: 378px;*/
      /*  height: 574px;*/
      /*  bottom: -5;*/
      /*  left: 1;*/
      /*  border: 5px solid gold;*/
      /*  overflow: hidden;*/
      /*  font-size: 15px;*/
      /*  background-color: black;*/
      /*  text-shadow: #000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0;*/
      /*  -webkit-text-shadow: #000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0;*/
      /*  -moz-text-shadow: #000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0*/
      /*}*/
    </style>
  </head>
  <body style="text-align:center;">
    <h1>${name}</h1>
    <div class="Overall">
      <div class="MainBody" id="MainBody">${analysisImgSrc(html)}</div>
    </div>
  </body>
</html>
`
  })
    .then(() => {
      console.log(`保存${name}.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_recipe', `${name}.png`)}]`, mixMsg = ''
      switch(order){
        case 'IF':
          mixMsg = `${imgMsg}${msg.length ? `\n${msg}` : ''}`
          break
        case 'MF':
          mixMsg = `${msg.length ? `${msg}\n` : ''}${imgMsg}`
          break
      }
      callback(mixMsg)
    })
}

module.exports = {
  renderRecipeImage
}
