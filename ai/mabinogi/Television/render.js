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
      /*width: 1183px;*/
      min-height: 20px;
      box-sizing: border-box;
			/*background: #D6D2C9;*/
			background: #1C1C1C
    }
    .header {
      padding-top: 20px;
      padding-left: 95px;
      padding-right: 95px;
    }
    .header .title {
			font-family: HANYIWENHEI;
      /*color: #49445A;*/
      color: #eee;
      font-size: 36px;
      line-height: 90px;
    }
    table {
      font-size: 20px;
      border-collapse: collapse;
      font-family: sans-serif;
			width: 100%;
    }
    thead {
      /*background: #49445A;*/
      background: #434857;
      /*color: #D6D2C9;*/
      color: #eee;
    }
    tbody {
      /*color: #49445A;*/
      color: #eee;
    }
    tbody > tr:nth-child(2n) {
      /*background: #CAC5BF;*/
      background: #393e4a;
    }
    th,
    td {
      line-height: 40px;
      text-align: center;
      white-space: nowrap;
      box-sizing: content-box;
    }
    thead th,
    tbody td {
      padding-left: 25px;
      padding-right: 25px;
    }
    tbody td {
      text-align: left;
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
          ${option.columns.map(col => `<td>${col.format ? col.format(item[col.key]) : item[col.key]}</td>`).join('')}
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