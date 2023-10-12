const http = require('http')
const path = require("path-extra");

const nodeHtmlToImage = require('node-html-to-image')
const { IMAGE_DATA, myip } = require(path.join(__dirname, '..', '..', '..', 'baibaiConfigs.js'))
const font2base64 = require('node-font2base64')

const Corp_Bold = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'Corp-Bold.otf'))

const optionsetHtmlImage = (obj, wheres, callback) => {
  let output = path.join(IMAGE_DATA, 'mabi', `${obj.ID}.png`)
  /* 预处理属性 */
  let desc = obj.OptionDesc.split('\\n'), objArr = []
  const MAX_WIDTH = 350
  desc.forEach(str => {
    // console.log(str)
    str = str.trim()
    let buff = true
    if(/^\[.*\]$/.test(str)){
      buff = false
      str = str.substring(1, str.length - 1)
    }
    objArr.push({text: str, buff: buff})
  })
  let isPersonal = objArr.filter(x => x.text.match(/专用/) && !x.buff).length

  nodeHtmlToImage({
    output,
    html: `
<!DOCTYPE html>
<html lang="en">
  <head>
  	<meta charset="UTF-8">
    <title></title>
    <style>
			* {
				border: 0;
				padding: 0;
				margin: 0;
			}
    	@font-face {
        font-family: 'Corp_Bold';
        src: url(${Corp_Bold}) format('opentype');
      }
    	body {
    		width: 400px;
      	min-height: 20px;
				box-sizing: border-box;
    		font-family: Corp_Bold;
    		overflow: hidden;
    		background: rgba(0,0,0,0.5);
    	}
    	.main-container {
    		padding: 30px 12px;
    		font-size: 20px;
    		color: #fff;
    	}
    	.main-container .title{
    		font-size: 20px;
    	}
    	.main-container .title-desc{
    		font-size: 12px;
    	}
    	.main-container .text-box{
    	  position: relative;
    	  border: 1px solid rgba(204,204,204,1);
    	  border-radius: 10px;
    	  padding: 50px 25px 10px;
    	  margin-top: 20px;
    	}
    	.main-container .text-box .label{
    	  display: block;
    	  color: rgba(238,78,7,1);
    	  line-height: 28px;
    	  background: #000;
    	  padding: 0 5px;
    	  position: absolute;
    	  top: -14px;
    	  left: 30px;
    	}
    	.main-container .text-box .buff-item{
    	  line-height: 25px;
    	}
    	.main-container .text-box .buff-item.buff{
    	  color: rgba(16,131,255,1);
    	}
    	.main-container .text-box .buff-item.debuff{
    	  color: rgba(251,0,7,1);
    	}
    </style>
  </head>
  <body>
  	<div class="main-container">
  	  <div class="title">${isPersonal ? '专用魔法释放卷' : '魔法释放卷轴'}</div>
  	  <div class="title-desc">${isPersonal ? 'Personal Enchant Scroll' : 'Enchant Scroll'}</div>
  	  <div class="text-box">
  	    <div class="label">道具属性</div>
  	    <div class="name">${obj.LocalName}${obj.LocalName2 == obj.LocalName ? '' : ` / ${obj.LocalName2}`}(${obj.Usage}:等级${obj.Level})</div>
  	    ${objArr.map(item => `
  	      <div class="buff-item ${item.buff ? 'buff': 'debuff'}">${item.text}</div>
  	    `).join('')}
      </div>
		</div>
  </body>
</html>
`
  })
    .then(() => {
      console.log(`保存ba_raid.png成功！`)
      let imgMsg = `[CQ:image,file=${path.join('send', 'other', `ba_raid.png`)}]`
      callback(imgMsg)
    })
}

module.exports = {
  optionsetHtmlImage
}