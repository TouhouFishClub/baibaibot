const path = require("path-extra");
const axios = require('axios');
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const {IMAGE_DATA} = require("../../baibaiConfigs");

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'hk4e_zh-cn.ttf'))

const fetchTCData = (page = 1) => new Promise(resolve => {
  const url = 'https://evt05.tiancity.com/luoqi/51349/home/index.php/lists';
  const data = new URLSearchParams({
    page,
    sign: 1
  });

  axios.post(url, data.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(response => {
      // data =
      //   {
      //     auto_id: '750',
      //     anchor_nickname: '牛排mabinogi',
      //     show_img: '//img6.tiancitycdn.com/luoqi_51349/20220303/img_1646301814_xt.png',
      //     anchor_level: '3',
      //     live_url: 'https://live.bilibili.com/2649023?spm_id_from=333.999.0.0',
      //     is_open: '0',
      //     is_sign: '1'
      //   },
      resolve(response.data.data)
    })
    .catch(error => {
      console.error('Error:', error);
    });
})

const fetchBiliData = roomId => new Promise(resolve => {
  const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${roomId}`;

  axios.get(url)
    .then(response => {
      // room_info = {
      //   uid: 9099105,
      //   room_id: 22543755,
      //   short_id: 0,
      //   title: 'Mabinogi-洛奇 不出货好难受',
      //   cover: 'http://i0.hdslb.com/bfs/live/new_room_cover/94533f4a51284b87d530a06b3a59033466f9f8d3.jpg',
      //   tags: '',
      //   background: '',
      //   description: '',
      //   live_start_time: 1716273568,
      //   live_screen_type: 0,
      //   lock_status: 0,
      //   lock_time: 0,
      //   hidden_status: 0,
      //   hidden_time: 0,
      //   area_id: 663,
      //   area_name: '洛奇',
      //   parent_area_id: 2,
      //   parent_area_name: '网游',
      //   keyframe: 'http://i0.hdslb.com/bfs/live-key-frame/keyframe05211536000022543755ral8ls.jpg',
      //   special_type: 0,
      //   up_session: '506399261518724491',
      //   pk_status: 0,
      //   is_studio: false,
      //   pendants: { frame: { name: '', value: '', desc: '' } },
      //   on_voice_join: 0,
      //   online: 6,
      //   room_type: { '3-21': 0 },
      //   sub_session_key: '506399261518724491sub_time:1716273568',
      //   live_id: 506399261518724500,
      //   live_id_str: '506399261518724491',
      //   official_room_id: 0,
      //   official_room_info: null,
      //   voice_background: ''
      // }
      resolve(response.data.data.room_info)
      // console.log(response.data.data.room_info)
    })
    .catch(error => {
      console.error('Error:', error);
    });
})

const LiveInspect = async (qq, group, content, callback) => {
  if(qq != 799018865) {
    return
  }
  let page = 1, pageCount = 9999, allList = []
  while(page <= pageCount) {
    let {list, count} = await fetchTCData(page)
    allList = allList.concat(list)
    pageCount = count
    page ++
  }
  let infos = []
  for(let i = 0; i < allList.length; i ++) {
    const {anchor_nickname, live_url} = allList[i]
    const roomId = new URL(live_url).pathname.split('/')[1]
    const {title, keyframe, parent_area_name, area_name} = await fetchBiliData(roomId)
    infos.push({
      anchor_nickname,
      roomId,
      title,
      keyframe,
      parent_area_name,
      area_name
    })
  }
  // console.log(infos)
  await render(infos)

  console.log(`保存live-inspect.png成功！`)
  let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `live-inspect.png`)}]`
  callback(imgMsg)
}

const render = async list => {
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
      width: 1300px;
      min-height: 20px;
      box-sizing: border-box;
			background: #1C1C1C
    }
    .container {
      padding-left: 20px;
      padding-top: 20px;
      overflow: hidden;
    }
    .item-box {
      width: 300px;
      box-sizing: border-box;
      padding: 10px;
      border-radius: 10px;
      background-color: #fff;
      float: left;
      margin-right: 20px;
      margin-bottom: 20px;
    }
    .key-frame {
      width: 280px;
      height: auto;
    }
    .key-frame img {
      display: block;
      width: 280px;
      height: auto;
    }
    .info-line {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
    }
    .nickname {
			font-family: HANYIWENHEI;
      font-size: 18px;
      color: #333;
    }
    .area {
			font-family: HANYIWENHEI;
      font-size: 16px;
      color: #666;
    }
    .title {
			font-family: HANYIWENHEI;
      font-size: 16px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
  ${list.map(item => `
    <div class="item-box">
      <div class="key-frame">
        <img src="${item.keyframe}">
      </div>
      <div class="info-line">
        <div class="nickname">${item.anchor_nickname}</div>
        <div class="area">${item.parent_area_name} - ${item.area_name}</div>
      </div>
      <div class="info-line">
        <div class="title">${item.title}</div>
      </div>
    </div>
  `).join('')}
  </div>
</body>
</html>`
  const output = path.join(IMAGE_DATA, 'mabi_other', `live-inspect.png`)
  await nodeHtmlToImage({
    output,
    html
  })
}

module.exports = {
  LiveInspect
}
// fetchBiliData(22543755)
// LiveInspect()