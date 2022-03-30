const http = require('http')
const qs = require('qs')

const fetchData = ( page ) =>
  new Promise((resolve, reject) => {
    const options = {
      host: 'mabinogimirai.natapp1.cc',
      port: 80,
      path: '/News/eggData',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
    const obj = {
      player: '',
      token: '', //Mirai's 全数据
      content: '',
      page,
      // server: ''
    }
    const req = http.request(options, res => {
      res.setEncoding('utf8')
      let resData = ''
      res.on('data', chunk => {
        resData += chunk
      });
      res.on('end', () => {
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
  let SRankMap = new Map(), count = 0
  data.filter(x => new Date(x.createTime).getTime() > timeLeftTs).reverse().forEach((list, index) => {
    let { item } = list
    if(SRankMap.get(item)) {
      SRankMap.set(item, {
        count : SRankMap.get(item).count + 1,
        last: index
      })
    } else {
      SRankMap.set(item, {
        count : 1,
        last: index
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
      last: count - info.last
    })
    console.log(`概率: ${(info.count / count * 100).toFixed(2)}%\t次数: ${fixNumber(info.count)}\t最后一次上电视: ${fixNumber(count - info.last)}次前\t${name}`)
  })

  out.sort((a, b) => b.count - a.count)
  console.log('==== 按出率 ===')
  out.forEach(item => {
    console.log(`概率: ${item.rareStr}%\t次数: ${fixNumber(item.count)}\t最后一次上电视: ${fixNumber(item.last)}次前\t\t${item.name}`)
  })
  out.sort((a, b) => b.last - a.last)
  console.log('==== 按最后上电视 ===')
  out.forEach(item => {
    console.log(`概率: ${item.rareStr}%\t次数: ${fixNumber(item.count)}\t最后一次上电视: ${fixNumber(item.last)}次前\t\t${item.name}`)
  })
}

statistics()
