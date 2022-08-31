const fs = require('fs')
const path = require('path')
// const nodejieba = require("nodejieba")
const nodeHtmlToImage = require('node-html-to-image')

const renderChatPersonas = (callback) => {
	let echart = fs.readFileSync(path.join(__dirname, 'echart.min.js'), 'utf-8')
	let echartWordcloud = fs.readFileSync(path.join(__dirname, 'echart-wordcloud.js'), 'utf-8')
	let keyWords = {
		"visualMap": 22199,
		"continuous": 10288,
		"contoller": 620,
		"series": 274470,
		"gauge": 12311,
		"detail": 1206,
		"piecewise": 4885,
		"textStyle": 32294,
		"markPoint": 18574,
		"pie": 38929,
		"roseType": 969,
		"label": 37517,
	}

	nodeHtmlToImage({
		output: './image.png',
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
		#main {
			color: #fff;
			font-size: 30px;
			border: 1px solid #f00;
		}
		#output {
			color: #fff;
			font-size: 30px;
			border: 1px solid #f00;
		}
  </style>
</head>
<body>
<div id='output'>22222222</div>
<div id='main'>11223</div>
<script>
  var chart = echarts.init(document.getElementById('main'));
  var keywords = ${JSON.stringify(keyWords)}

  var data = [];
  for (var name in keywords) {
    data.push({
      name: name,
      value: Math.sqrt(keywords[name])
    })
  }

  var maskImage = new Image();

  var option = {
    series: [{
      type: 'wordCloud',
      sizeRange: [4, 150],
      rotationRange: [0, 0],
      gridSize: 0,
      shape: 'pentagon',
      drawOutOfBound: false,
      keepAspect: true,
      textStyle: {
        fontWeight: 'bold',
        color: function () {
          return 'rgb(' + [
            Math.round(Math.random() * 200) + 50,
            Math.round(Math.random() * 50),
            Math.round(Math.random() * 50) + 50
          ].join(',') + ')';
        }
      },
      emphasis: {
        textStyle: {
          color: '#528'
        }
      },
      data: data.sort(function (a, b) {
        return b.value - a.value;
      })
    }]
  };
	chart.setOption(option);
	document.querySelector('#output').innerHTML = 'SUCCESS'
</script>
</body>
</html>
		`
	})
		.then(() => {
			console.log(`保存timetable.png成功！`)
		})
}

renderChatPersonas()