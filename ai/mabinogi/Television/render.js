const path = require("path-extra");
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))

/*
* option = {
*   title: 'TITLE',
*   output: outputDir,
*   columns: [
*     {
*       label: 'label',
*       key: 'key',
*       width?: 123,
*       format?: fn()
*     }
*   ]
* }
*/
const render = async (data, option) => {

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  <style>
		@font-face {
			font-family: 'HANYIWENHEI';
			src: url(${HANYIWENHEI}) format('truetype');
		}
    * {
      border: 0;
      padding: 0;
      margin: 0;
      line-height: 1.4;
    }
    body {
      width: 1183px;
      min-height: 20px;
      padding: 20px;
      box-sizing: border-box;
			font-family: HANYIWENHEI;
			background: #D6D2C9;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      ${option.title}
    </div>
  </div>
  <table>
    <colgroup>
      ${option.columns.map(col => `<col${col.width ? ` width="${col.width}"` : ''}>`).join('')}
    </colgroup>
    <thead>
      <tr>
        ${option.columns.map(col => `<th>${col.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(item => `
        <tr>
          ${option.columns.map(col => `<td>${item[col.key]}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`
  await nodeHtmlToImage({
    output: option.output,
    html
  })
  console.log('保存图片成功')
}

module.exports = {
  render
}