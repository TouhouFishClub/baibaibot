const fs = require("fs-extra");
const path = require("path-extra");
const mysql = require('mysql2')
const {IMAGE_DATA} = require("../../../baibaiConfigs");
const nodeHtmlToImage = require("node-html-to-image");

let mysqlPool

const createMysqlPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'chat_records'
    },
    fs.readJsonSync(path.join(__dirname, '.secret.json'))
  ))
  mysqlPool = pool.promise();
}
const broadcast = async (callback, server = `ylx`) => {

  const [row, fields] = await mysqlPool.query(`select * from ${server == 'ylx' ? 'mabi_chat_records': 'mabi_chat_records_yate'} order by date desc limit 500;`)
  let chats = row.map(x => x.chat)


}


const renderGroupCountChart = async (chatObj, server, callback) => {
  // console.log(chatObj)

  let output = path.join(IMAGE_DATA, 'other', `${server}_count_img.png`)
  // let output = path.join(`${server}.png`)

  nodeHtmlToImage({
    output,
    html: `
			<html>
			<head>
				<meta charSet="utf-8">
				<script>
					${echart}
				</script>
				<script>
					${echartWordcloud}
				</script>
				<style>
					html, body, #main {
						width: 100%;
						height: 100%;
						margin: 0;
						background-color: #0a0905;
					}
				</style>
			</head>
			<body>
			<div id='main'></div>
			<script>
				var chart = echarts.init(document.getElementById('main'));
				var keywords = ${JSON.stringify(chatObj)}
			
				var data = [];
				for (var name in keywords) {
					data.push({
						name: name,
						value: Math.sqrt(keywords[name])
					})
				}
			
				var option = {
					series: [{
						type: 'wordCloud',
						width: '100%',
						height: '100%',
						sizeRange: [2, 60],
						rotationRange: [0, 0],
						// rotationRange: [-90, 90],
						// rotationStep: 15,
						gridSize: 0,
						shape: 'circle',
						drawOutOfBound: false,
						keepAspect: true,
						textStyle: {
							fontWeight: 'bold',
							color: function () {
								// var c = Math.round(Math.random() * 200) + 50;
								return 'rgb(' + [
									// Math.round(Math.random() * 200) + 50,
									// Math.round(Math.random() * 50),
									// Math.round(Math.random() * 50) + 50
									Math.round(Math.random() * 150) + 100,
									Math.round(Math.random() * 150) + 100,
									Math.round(Math.random() * 150) + 100
									// 255,
									// 255,
									// c
								].join(',') + ')';
							}
						},
						emphasis: {
							textStyle: {
								color: '#fff'
							}
						},
						data: data.sort(function (a, b) {
							return b.value - a.value;
						})
					}]
				};
				chart.setOption(option);
			</script>
			</body>
			</html>
		`
  })
    .then(() => {
      console.log(`保存${server}_count_img.png成功！`)
      let imgMsg = `[CQ:image,file=${join('send', 'other', `${server}_count_img.png`)}]`
      personasLimit[server] = Date.now() + 30 * 60 * 1000
      callback(imgMsg)
    })
}