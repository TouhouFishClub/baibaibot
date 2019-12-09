const http = require('http')
const WebSocketClient = require('websocket').client;
const client = new WebSocketClient()
const pushingList = [577587780]
const serverUri = 'wss://ws-ap3.pusher.com/app/1263f38c797817613c6d?protocol=7&client=js&version=4.1.0&flash=false'
const MINIMUM_INTERVAL = 20 * 1000
const MAXIMUM_TIME_STACK = 10 * 60 * 1000
const MAX_SHOW_ITEM = 8
let BossBusStack = []
let isStart = false
let reConnectCount = 0
let latestUpdateTime = 0

module.exports = function(content, qq, callback) {
  if(content == '强制重启'){
    if(qq == 799018865 && client) {
      reConnectCount = 0
      reConnect()
      callback(`[World Flipper] 重启中`)
    }
    return
  }
  console.log('<<<<<================>>>>>>')
  console.log(BossBusStack)
  if(BossBusStack.length > 0) {
    callback(BossBusStack.slice(0, MAX_SHOW_ITEM).map(d => `Time: ${formatTime(d.data.time)}（${Date.now() - d.data.time < 60000 ? '刚刚' : (parseInt((Date.now() - d.data.time) / 1000 / 60) + '分前')}）\nRoom: ${d.data.room}\nBoss: ${d.data.boss}（${BossType(d.data.boss)}）\nDesc: ${d.data.desc || '无'}`).join(`\n==========\n`))
  } else {
    callback('最近没有数据')
  }
}


const startWebSocket = () => {
  if(!isStart) {
    isStart = true
    // var WebSocketClient = require('websocket').client;
    //
    // var client = new WebSocketClient();

    client.on('connectFailed', function(error) {
      console.log(`===== [World Flipper] 连接服务器失败 =====\n${error.toString()}`);
      reConnect()
    });

    client.on('connect', function(connection) {
      console.log('===== [World Flipper] 服务器链接成功 =====');
      connection.on('error', function(error) {
        console.log(`===== [World Flipper] 服务器错误 =====\n${error.toString()}`);
      });
      connection.on('close', function() {
        console.log('===== [World Flipper] 服务器关闭 =====');
        reConnect()
      });
      connection.on('message', function(message) {
        if (message.type === 'utf8') {
          let msg = JSON.parse(message.utf8Data)
          // console.log(msg)
          switch(msg.event){
            case 'item-added':
              let data = JSON.parse(msg.data)
              console.log('===== [World Flipper] 新数据推送 =====')
              pusher({
                time: data.id * 1000,
                room: data.value,
                boss: data.boss_id,
                desc: data.remark
              })
              break
            case 'pusher:connection_established':
              console.log('===== [World Flipper] 资源连接成功 =====')
              break
            case 'pusher_internal:subscription_succeeded':
              console.log('===== [World Flipper] 准备接收数据 =====')
              reConnectCount = 0
              break
          }
        }
      });
      connection.sendUTF('{"event":"pusher:subscribe","data":{"channel":"todo"}}')
    });
    client.connect(serverUri);
  }
}

const reConnect = () => {
  if( ++reConnectCount < 3) {
    console.log('===== [World Flipper] 尝试重连 =====')
    client.connect(serverUri);
  } else {
    console.log('===== [World Flipper] 超过最大重连次数，请手动开启 =====')
  }
}

startWebSocket()

const BossType = bossId =>  {
  switch(bossId) {
    case 'オロチ討伐':
      return '蛇'
    case 'アドミニスター討伐':
      return '光'
    case '白虎討伐':
      return '雷'
    case 'カースアークエギル討伐':
      return '暗'
    case 'ヤドリオー討伐':
      return '水'
    case 'ルインゴーレム討伐':
      return '火'
    case '不死王レシタール討伐':
      return '风'
    case 'ヴィエ・ソラス討伐':
      return '猫头鹰'
  }
}

const formatTime = ts => `${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`
const addZero = n => n < 10 ? ('0' + n) : n

const formatStack = () => {
  BossBusStack = BossBusStack.filter(si => Date.now() - si.time < MAXIMUM_TIME_STACK)
  BossBusStack.sort((a, b) => b.time - a.time)
}

const pusher = data => {
  if(Date.now() - latestUpdateTime > MINIMUM_INTERVAL) {
    latestUpdateTime = Date.now()
    let renderData = `Time: ${formatTime(data.time)}\nRoom: ${data.room}\nBoss: ${data.boss}（${BossType(data.boss)}）\nDesc: ${data.desc || '无'}`
    //TODO： test output
    // console.log(renderData)
    // return

    BossBusStack.push({
      time: Date.now(),
      data: data
    })
    formatStack()
    pushingList.forEach(groupId => {
      let options = {
        host: '192.168.17.52',
        port: 23334,
        path: `/send_group_msg?group_id=${groupId}&message=${encodeURIComponent(renderData)}`,
        method: 'GET',
        headers: {}
      }
      let req = http.request(options);
      req.on('error', function(err) {
        console.log('req err:');
        console.log(err);
      });
      req.end();
    })
  }
}