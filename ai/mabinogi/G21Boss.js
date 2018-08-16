/*
G21新boss时刻表（龙在世界之树上下，树精在遗忘海滩左右）
----------工作日----------
树妖 10-12 14-16 18-19 20-21 22-23
龙 12-14 16-18 19-20 21-22 23-24

----------周末------------
树妖 10-11 12-13 14-15 16-17 18-19 20-21 22-23
龙 11-12 13-14 15-16 17-18 19-20 21-22 23-24
*/
const http = require('http')
const workList = {
  "Mokkurkalfi": {
    "workTime": {
      "normal": [
        {
          "start": 10,
          "end": 12
        },
        {
          "start": 14,
          "end": 16
        },
        {
          "start": 18,
          "end": 19
        },
        {
          "start": 20,
          "end": 21
        },
        {
          "start": 22,
          "end": 23
        }
      ],
      "weekend": [
        {
          "start": 10,
          "end": 11
        },
        {
          "start": 12,
          "end": 13
        },
        {
          "start": 14,
          "end": 15
        },
        {
          "start": 16,
          "end": 17
        },
        {
          "start": 18,
          "end": 19
        },
        {
          "start": 20,
          "end": 21
        },
        {
          "start": 22,
          "end": 23
        },
      ]
    },
    "name": "莫库尔卡皮（树妖）",
    "where": "遗忘海滩"
  },
  "SylvanDragon": {
    "workTime": {
      "normal": [
        {
          "start": 12,
          "end": 14
        },
        {
          "start": 16,
          "end": 18
        },
        {
          "start": 19,
          "end": 20
        },
        {
          "start": 21,
          "end": 22
        },
        {
          "start": 23,
          "end": 24
        },
      ],
      "weekend": [
        {
          "start": 11,
          "end": 12
        },
        {
          "start": 13,
          "end": 14
        },
        {
          "start": 15,
          "end": 16
        },
        {
          "start": 17,
          "end": 18
        },
        {
          "start": 19,
          "end": 20
        },
        {
          "start": 21,
          "end": 22
        },
        {
          "start": 23,
          "end": 24
        },
      ]
    },
    "name": "希尔班龙",
    "where": "世界之树"
  }
}

const G21Boss = (callback, showNextTime = false) => {
  let now = new Date(),
    nowTime = now.getHours(),
    text = '',
    textArr = []
  Object.keys(workList).forEach(ele => {
    // console.log(ele)
    let mText = checkBossShow(nowTime, ele, showNextTime)
    if(mText !== ''){
      textArr.push(`${workList[ele].name}${mText}出现地点：${workList[ele].where}`)
    }
  })
  if(textArr.length == 0){
    textArr.push('当前没有boss出现')
  }
  callback(textArr.join('\n'))
}
const checkBossShow = (hour, monsterName, showNextTime = false) => {
  let now = new Date(),
    getWeek = now.getDay(),
    timeType = (getWeek == 6 || getWeek == 0) ? 'weekend': 'normal',
    worklist = workList[monsterName].workTime[timeType]
  // console.log(hour)
  let text = '', nextWork = -1
  worklist.forEach((time, index) => {
    if(time.start > hour && time.end > hour && nextWork == -1){
      nextWork = index
    }
    if(hour >= time.start && hour < time.end){
      text = `出现了！！！\n${timeLiftByHour(worklist[index].end)} 后消失\n`
    }
  })
  if(text === '' && showNextTime) {
    let isNextDay = false
    if(nextWork == -1){
      isNextDay = true
      nextWork = 0
      switch(timeType){
        case 5:
          worklist = workList[monsterName].workTime.weekend
          break
        case 0:
          worklist = workList[monsterName].workTime.normal
          break
      }
    }
    text = `未出现\n下次出现还有 ${timeLiftByHour(worklist[nextWork].start, isNextDay)}\n`
  }
  return text
}

const timeLiftByHour = (endHour, isNextDay = false) => {
  // console.log(`endHour:${endHour}isNextDay：${isNextDay}`)
  let now = new Date(),
    dateFix = isNextDay ? (now.getHours() > 22 ? now.getDate() + 1 : now.getDate()) : now.getDate(),
    endTime = new Date(now.getFullYear(), now.getMonth(), dateFix, endHour, 0, 0),
    left = ~~((endTime - now)/1000)
  return `${(left / 3600) > 1 ? ~~(left / 3600) + ' 小时 ' : ''}${~~(left % 3600 / 60) + ' 分 '}${left % 60 + ' 秒'}`
}

const autoWhiteList = [315902131, 549823679, 138585036]

const startTimeout = () => {
  let timeLeft = 3610000 - new Date().getTime() % 3600000
  setTimeout(() => {
    G21Boss(res => {
      if(res.trim().length > 0){
        if(autoWhiteList.length && new Date().getHours() >= 10) {
          autoWhiteList.forEach(groupId => {
            let options = {
              host: '192.168.17.52',
              port: 23334,
              path: `/send_group_msg?group_id=${groupId}&message=${encodeURIComponent(res)}`,
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
  G21Boss
}
