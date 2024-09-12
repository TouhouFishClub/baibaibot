const path = require("path-extra");
const axios = require('axios');
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const {IMAGE_DATA} = require("../../baibaiConfigs");
const https = require("https");
const {render} = require('./Television/render')

const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../../baibaiConfigs').mongourl;

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', 'font', 'hk4e_zh-cn.ttf'))

let client
(async () => {
  try {
    client = await MongoClient.connect(MONGO_URL)
  } catch (e) {
    console.log('MONGO ERROR FOR MABI LIVE MODULE!!')
    console.log(e)
  }
})()


function getRedirectUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const { statusCode } = res;

      // 如果状态码是重定向状态码 (3xx)，获取 Location 头部
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        resolve(res.headers.location);
      } else {
        reject(new Error('No redirect or invalid status code'));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const saveFansInfo = async infos => {
  let collection = client.collection('cl_mabinogi_live_fans')
  let day = ~~(Date.now()/86400000)
  for(let i = 0; i < infos.length; i ++) {
    await collection.save({
      '_id': `${infos[i].roomId}_${day}`,
      'roomId': infos[i].roomId,
      'nick_name': infos[i].nick_name,
      'attention': infos[i].attention,
      'update': Date.now()
    })
  }
}

const fetchTCData = (page = 1) => new Promise(resolve => {
  const url = 'https://evt08.tiancity.com/luoqi/2451841/home/index.php/lists';
  const data = new URLSearchParams({
    page,
    sign_type: '全部'
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
      //     nick_name: '牛排mabinogi',
      //     show_img: '//img6.tiancitycdn.com/luoqi_51349/20220303/img_1646301814_xt.png',
      //     anchor_level: '3',
      //     live_address: 'https://live.bilibili.com/2649023?spm_id_from=333.999.0.0',
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
      resolve(response.data.data)
      // console.log(response.data.data.room_info)
    })
    .catch(error => {
      console.error('Error:', error);
    });
})

const formatTime = ts => {
  let d = new Date(ts)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}

const LiveAnalyzer = async(qq, group, content, callback) => {
  if(qq != 799018865) {
    return
  }
  let allData = await client.collection('cl_mabinogi_live_fans').find().toArray()
  let allLiverRoomId = Array.from(new Set(allData.map(x => x.roomId)))
  let reData = []
  for(let i = 0; i < allLiverRoomId.length; i ++) {
    console.log(`==== ${i}/${allLiverRoomId.length} ====`)
    let roomId = allLiverRoomId[i]
    let roomRecord = allData.filter(x => x.roomId == roomId).sort((a, b) => a.update - b.update)
    // {
    //   "_id" : "6411516_19976",
    //   "roomId" : "6411516",
    //   "nick_name" : "奶白蛋卷",
    //   "attention" : 13,
    //   "update" : 1725926411481
    // }

    const {room_info, anchor_info} = await fetchBiliData(roomId)
    const {title, keyframe, parent_area_name, area_name} = room_info
    const nowAttention = anchor_info?.relation_info?.attention || 0
    const add = nowAttention - roomRecord[0].attention


    let out = Object.assign({}, roomRecord[0], {
      nowAttention,
      add,
      addStr: add > 0 ? `+${add}` : add
    })
    reData.push(out)
  }
  if(content === '洛奇涨粉榜') {
    reData.sort((a, b) => b.add - a.add)
  } else {
    reData.sort((a, b) => a.add - b.add)
  }
  const outputDir = path.join(IMAGE_DATA, 'mabi_other', `MabiFans.png`)
  await render(reData.slice(0, 20), {
    title: content,
    output: outputDir,
    columns: [
      {
        label: '直播间id',
        key: 'roomId',
      },
      {
        label: '昵称',
        key: 'nick_name',
      },
      {
        label: '首次统计时间',
        key: 'update',
        format: time => formatTime(new Date(time).getTime())
      },
      {
        label: '现在粉丝',
        key: 'attention',
      },
      {
        label: '粉丝变化',
        key: 'addStr',
      },
    ]
  })

  console.log(`保存MabiFans.png成功！`)
  let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `MabiFans.png`)}]`
  callback(imgMsg)
}

const LiveInspect = async (qq, group, content, callback, auto = false) => {
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
  let yesterday = ~~(Date.now()/86400000) - 1
  for(let i = 0; i < allList.length; i ++) {
    const {nick_name, live_address} = allList[i]
    // console.log(allList[i])
    let roomId = new URL(live_address).pathname.split('/')[1]
    if(!/^\d+$/.test(roomId)) {
      const redirectUrl = await getRedirectUrl(live_address).catch((err) => {
        console.error(err);
      });
      roomId = new URL(redirectUrl).pathname.split('/')[1]
    }
    try{
      const {room_info, anchor_info} = await fetchBiliData(roomId)
      const {title, keyframe, parent_area_name, area_name} = room_info
      let data = {
        attention: anchor_info?.relation_info?.attention || 0,
        biliName: anchor_info?.base_info?.uname || '',
        nick_name,
        roomId,
        title,
        keyframe,
        parent_area_name,
        area_name
      }
      if(!auto) {
        const prevData = await client.collection('cl_mabinogi_live_fans').findOne({_id: `${roomId}_${yesterday}`})
        data.prevAttention = prevData?.attention || -1
      }
      infos.push(data)
    } catch (e) {
      console.log(e)
    }
  }

  // console.log(infos)
  await saveFansInfo(infos)
  if(!auto) {
    await renderTv(infos)

    console.log(`保存live-inspect.png成功！`)
    let imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `live-inspect.png`)}]`
    callback(imgMsg)
  }
}

const renderTv = async list => {
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
      height: 158px;
      background-color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .key-frame img {
      display: block;
      max-width: 100%;
      max-height: 100%;
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
    .fans {
			font-family: HANYIWENHEI;
      font-size: 16px;
      color: #333;
    }
    .fans.hottest {color: #540000;}
    .fans.hotest {color: #602514;}
    .fans.hot {color: #724d2b;}
    .fans.ho {color: #38571b;}
    .fans strong.up {color: #d80000}
    .fans strong.down {color: #008a07}
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
        <div class="nickname">${item.nick_name}</div>
        <div class="area">${item.parent_area_name} - ${item.area_name}</div>
      </div>
      <div class="info-line">
        <div class="nickname">${item.biliName}</div>
      </div>
      <div class="info-line">
        <div class="title">${item.title}</div>
      </div>
      <div class="info-line">
        <div class="fans ${item.attention > 100000 ? 'hottest' : item.attention > 10000 ? 'hotest' : item.attention > 1000 ? 'hot' : item.attention > 100 ? 'ho' : 'normal'}">粉丝数: ${item.attention}${item.prevAttention >= 0 ? ` (${item.attention - item.prevAttention > 0 ? `<strong class="up">+${item.attention - item.prevAttention}</strong>` : `<strong class="down">${item.attention - item.prevAttention}</strong>`})` : ''}</div>
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

const startTimeout = () => {
  let timeLeft = 3610000 - new Date().getTime() % 3600000
  setTimeout(async () => {
    await LiveInspect(799018865, 0, '', () => {}, true)
    console.log('自动统计成功！')
    startTimeout()
  }, timeLeft)
}

startTimeout()
module.exports = {
  LiveInspect,
  LiveAnalyzer
}
// LiveInspect(799018865)