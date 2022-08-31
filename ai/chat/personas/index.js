const fs = require('fs')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../../../baibaiConfigs').mongourl;
const nodejieba = require("nodejieba")
const nodeHtmlToImage = require('node-html-to-image')

let client

const analysisChatData = data => {
	let obj = {}
	data.forEach(msg => {
		if(msg.d){
			let filterCQ = msg.d.split('[CQ:').map((x, i) => i ? x.split(']')[1]: x).filter(x => x.trim())
			filterCQ.forEach(txt => {
				let splitEn = Array.from(txt.matchAll(/[a-zA-Z0-9]+/g)).map(x => x[0])
				splitEn.forEach(en => {
					if(obj[en]) {
						obj[en] = obj[en] + 1
					} else {
						obj[en] = 1
					}
					txt = txt.split(en).join('')
				})
				nodejieba.cut(txt).forEach(c => {
					if(obj[c]) {
						obj[c] = obj[c] + 1
					} else {
						obj[c] = 1
					}
				})
			})
		}
	})
	return obj
}

const fetchGroupData = async groupId => {
	let groupData = await client.db('db_bot').collection('cl_chat').find({
		_id: { $gt: new Date(Date.now() - 1000*60*60*6) },
		gid: groupId
	}).toArray()
	console.log(`===> group data length: ${groupData.length}`)
	return analysisChatData(groupData)
}

const renderChatPersonas = async (groupId, callback) => {
	if(!client) {
		try {
			client = await MongoClient.connect(MONGO_URL)
		} catch (e) {
			console.log('MONGO ERROR FOR PERSONAS MODULE!!')
			console.log(e)
		}
	}

	let obj = await fetchGroupData(groupId)
	console.log(obj)
	return

	let echart = fs.readFileSync(path.join(__dirname, 'echart.min.js'), 'utf-8')
	let echartWordcloud = fs.readFileSync(path.join(__dirname, 'echart-wordcloud.js'), 'utf-8')

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
    }
  </style>
</head>
<body>
<div id='main'></div>
<script>
  var chart = echarts.init(document.getElementById('main'));
  var keywords = {
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

renderChatPersonas(205700800)