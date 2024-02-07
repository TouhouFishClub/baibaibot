const http = require('http')

const PACKET_LIST = [
  { time: '2024-2-7 11:28:0', item: '测试红包推送' },

  { time: '2024-2-8 10:0:0', item: '支票2330000（策划君的大红包）' },
  { time: '2024-2-8 14:0:0', item: '至尊全技能修炼药水(1天)' },
  { time: '2024-2-8 18:0:0', item: '美容点*5' },
  { time: '2024-2-8 22:0:0', item: '紫黑闪（金属）' },

  { time: '2024-2-9 10:0:0', item: '转生秘药' },
  { time: '2024-2-9 14:0:0', item: '华丽半神之翼' },
  { time: '2024-2-9 18:0:0', item: '彩虹染色套装(金属固染)' },
  { time: '2024-2-9 22:0:0', item: '黄金经验果实（500%）x2' },

  { time: '2024-2-10 10:0:0', item: '忘却的秘药' },
  { time: '2024-2-10 14:0:0', item: '至尊全技能修炼药水(1天)' },
  { time: '2024-2-10 18:0:0', item: '尔格高级强化礼包1' },
  { time: '2024-2-10 22:0:0', item: '增幅的技能修炼印章（35）' },

  { time: '2024-2-11 10:0:0', item: '宠物转生秘药' },
  { time: '2024-2-11 14:0:0', item: '组合卡复活券（30天）' },
  { time: '2024-2-11 18:0:0', item: '尔格高级强化礼包2' },
  { time: '2024-2-11 22:0:0', item: '红黑闪染(1固染+2普染)' },

  { time: '2024-2-12 10:0:0', item: '白色闪染(1固染+2普染)' },
  { time: '2024-2-12 14:0:0', item: '无尽冬日雪绒花翅膀' },
  { time: '2024-2-12 18:0:0', item: '古代黄金结晶' },
  { time: '2024-2-12 22:0:0', item: '暖心蝴蝶结尾巴' },

  { time: '2024-2-13 10:0:0', item: '五尾狐尾巴' },
  { time: '2024-2-13 14:0:0', item: '免费修理箱套装' },
  { time: '2024-2-13 18:0:0', item: '彩虹染色套装(普通固染)' },
  { time: '2024-2-13 22:0:0', item: '贝特林任务精英通行证箱子' },

  { time: '2024-2-14 10:0:0', item: '贝特林任务精英通行证 -背水之阵' },
  { time: '2024-2-14 14:0:0', item: '紫黑闪(普通)' },
  { time: '2024-2-14 18:0:0', item: '冷酷的雪绒花翅膀' },
  { time: '2024-2-14 22:0:0', item: '皇家学院校服-夏季款(男生用)' },

  { time: '2024-2-15 10:0:0', item: '开学英伦大衣(男式)' },
  { time: '2024-2-15 14:0:0', item: '迪恩药水' },
  { time: '2024-2-15 18:0:0', item: '幸运蓝色改造石' },
  { time: '2024-2-15 22:0:0', item: '无限制地下城通行证' },

  { time: '2024-2-16 10:0:0', item: '尔格中级强化礼包' },
  { time: '2024-2-16 14:0:0', item: '开学英伦大衣(女式)' },
  { time: '2024-2-16 18:0:0', item: '金鸡蛋' },
  { time: '2024-2-16 22:0:0', item: '粉白闪(金属)' },

  { time: '2024-2-17 10:0:0', item: '福格斯免费修理券' },
  { time: '2024-2-17 14:0:0', item: '褐棕闪染(1固染+ 2普染)' },
  { time: '2024-2-17 18:0:0', item: 'AP药水(100点)' },
  { time: '2024-2-17 22:0:0', item: '圣洁之羽翼' },

  { time: '2024-2-18 10:0:0', item: '支票2330000（策划君的大红包）' },
  { time: '2024-2-18 14:0:0', item: '高级宝石粉' },
  { time: '2024-2-18 18:0:0', item: '组合卡期限解除券' },
  { time: '2024-2-18 22:0:0', item: '美容点*5' },

  { time: '2042-2-18 22:0:0', item: '活动结束' },
]

let AUTO_SEND_GROUPS = {

}

const mabinogi_red_packet_list = callback => {
  console.log(AUTO_SEND_GROUPS)
  console.log(JSON.stringify(AUTO_SEND_GROUPS))
  callback(JSON.stringify(AUTO_SEND_GROUPS))
}

const addZero = (num) => {
  return num < 10? `0${num}` : num
}

const mabinogi_red_packet = (callback, auto = false) => {
  let tar
  for(let i = 0; i < PACKET_LIST.length; i ++){
    tar = PACKET_LIST[i]
    if(Date.now() < new Date(tar.time).getTime()) {
      break
    }
  }
  let ts = ~~((new Date(tar.time) - Date.now())/ 1000)
  if(auto && ts > 2000) {
    callback()
  } else {
    callback(`${~~(ts / 60)}分${addZero(~~(ts % 60))}秒后红包开启，下次活动奖励：${tar.item}`)
  }
}

const mabinogi_red_packet_set = (groupId, port, callback) => {
  AUTO_SEND_GROUPS[groupId] = {
    groupId,
    port
  }
  callback('已开启活动提示')
}

const mabinogi_red_packet_remove = (groupId, port, callback) => {
  delete AUTO_SEND_GROUPS[groupId]
  callback('已关闭活动提示')
}

const getNextPacketTimeLeft = () => {
  for(let i = 0; i < PACKET_LIST.length; i ++){
    let tar = PACKET_LIST[i]
    if(Date.now() + 5 * 60 * 1000 < new Date(tar.time).getTime()) {
      return new Date(tar.time).getTime() - Date.now()
    }
  }
}

const startTimeout = () => {
  let timeLeft = getNextPacketTimeLeft()
  console.log(`\n\n\n\n ===\n${timeLeft}\n===\n\n\n\n`)
  setTimeout(() => {
    mabinogi_red_packet(res => {
      if(res.trim().length > 0){
        if(Object.values(AUTO_SEND_GROUPS).length) {
          Object.values(AUTO_SEND_GROUPS).forEach(info => {
            let options = {
              host: require('../../baibaiConfigs').myip,
              port: info.port,
              path: `/send_group_msg?group_id=${info.groupId}&message=${encodeURIComponent(`G21BOSS自动报时\n\n${res}`)}`,
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
    }, true)
    startTimeout()
  }, timeLeft)
}

startTimeout()

module.exports = {
  mabinogi_red_packet,
  mabinogi_red_packet_list,
  mabinogi_red_packet_set,
  mabinogi_red_packet_remove,
}
