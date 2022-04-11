const http = require('http')
const qs = require('qs')

const addZero = num => num < 10 ? ('0' + num) : num

const DateToStr = date => `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(date.getDate())} ${addZero(date.getHours())}:${addZero(date.getMinutes())}:${addZero(date.getSeconds())}`

const fixStrLength = (targetLength, str) => {
  let sl =  str.replace(/[^\u0000-\u00ff]/g, "aa").length
  if (sl < targetLength) {
    return `${str}${new Array(targetLength - sl).fill(' ').join('')}`
  }
  return str
}

const fetchData = ( page ) =>
  new Promise((resolve, reject) => {
    const options = {
      host: 'mabinogimirai.natapp1.cc',
      port: 80,
      path: '/News/baiEggNewsData',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
    const obj = {
      player: '',
      // token: '', //Mirai's 全数据
      content: '',
      page,
      server: "潘妮",
      start: '2022-03-30 11:30:00',
      end: DateToStr(new Date())
    }
    const req = http.request(options, res => {
      res.setEncoding('utf8')
      let resData = ''
      res.on('data', chunk => {
        resData += chunk
      });
      res.on('end', () => {
        // console.log(resData)
        resolve(JSON.parse(resData))
      })
    })
    req.on('error', err => {
      console.log('=== request error ===')
      reject(err)
    });
    req.write(qs.stringify(obj))
    req.end()
  })

const fetchAllData = async () => {
  let page = 1, flag = true, res = []
  while(flag) {
    let data = await fetchData(page)
    if(data && data.length) {
      res = res.concat(data)
      page ++
      flag = false
    } else {
      flag = false
    }
  }
  return res
}

const fixNumber = number => number < 100 ? ` ${number < 10 ? ` ${number}` : `${number}`}` : `${number}`

const statistics = async () => {
  let timeLeftTs = new Date('2022-3-30 11:30:00').getTime()
  let data = await fetchAllData()
  let SRankMap = new Map(), count = 0, targetUser = []
  data.filter(x => new Date(x.createTime).getTime() > timeLeftTs).forEach((list, index) => {
    let { item, createTime, player } = list
    if(item == '闪耀舞台小猫特效(面部装扮栏专用)'){
      targetUser.push(list)
    }
    if(SRankMap.get(item)) {
      SRankMap.set(item, {
        count : SRankMap.get(item).count + 1,
        last: index,
        lastTime: createTime,
        lastUser: player
      })
    } else {
      SRankMap.set(item, {
        count : 1,
        last: index,
        lastTime: createTime,
        lastUser: player
      })
    }
    count ++
  })

  let out = []

  SRankMap.forEach((info, name) => {
    out.push({
      name,
      count: info.count,
      rareStr: (info.count / count * 100).toFixed(2),
      last: count - info.last,
      lastTime: info.lastTime,
      lastUser: fixStrLength(12, info.lastUser)
    })
    console.log(`概率: ${(info.count / count * 100).toFixed(2)}%\t次数: ${fixNumber(info.count)}\t最后一次上电视: ${fixNumber(count - info.last)}次前\t${name}`)
  })

  out.sort((a, b) => b.count - a.count)
  console.log('==== 按出率 ===')
  out.forEach(item => {
    console.log(`概率: ${item.rareStr}%\t次数: ${fixNumber(item.count)}\t最后电视: ${fixNumber(item.last)}次前(${item.lastTime} | ${item.lastUser})\t${item.name}`)
  })
  out.sort((a, b) => b.last - a.last)
  console.log('==== 按最后上电视 ===')
  out.forEach(item => {
    console.log(`概率: ${item.rareStr}%\t次数: ${fixNumber(item.count)}\t最后电视: ${fixNumber(item.last)}次前(${item.lastTime} | ${item.lastUser})\t${item.name}`)
  })
  console.log('==== 闪耀舞台小猫特效(面部装扮栏专用) ====')
  console.log(targetUser.map(x => `${x.createTime}\t${fixStrLength(12, x.player)}`).join('\n'))
}

// fetchData(2)
statistics()
