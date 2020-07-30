const DB_EXPIRE_TIME = 30 * 60 * 1000
const GLOBAL_EXPIRE_TIME = 60 * 60 * 1000
const GLOBAL_COUNT_LIMIT = 20
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://192.168.1.19:27017/db_bot'
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'
const https = require('https')
const { drawTxtImage } = require('../../cq/drawImageBytxt')
const HP_LIST = [
  [
    6000000,
    8000000,
    10000000 * 1.1,
    12000000 * 1.1,
    20000000 * 1.2
  ],
  [
    6000000 * 1.2,
    8000000 * 1.2,
    10000000 * 1.5,
    12000000 * 1.7,
    20000000 * 2
  ]
]
const POWER = [
  [
    1,
    1,
    1.1,
    1.1,
    1.2
  ],
  [
    1.2,
    1.2,
    1.5,
    1.7,
    2
  ]
]
const RANK_LIST = [60000, 40000, 25000, 15000, 10000, 5000, 2800, 1200, 600, 200, 50, 20, 10, 4, 1]
let globalCount = 10
var qs = require('querystring');

/* init db */
let client, collection
(async () => {
  try {
    client = await MongoClient.connect(MONGO_URL)
  } catch (e) {
    console.log('MONGO ERROR FOR PCR GUILD RANK MODULE!!')
    console.log(e)
  }
})()

let searchLimit = {
  expireTs : 0,
  count: GLOBAL_COUNT_LIMIT,
}

const guildRankSearch = async (content, qq, group, callback, params) => {
  globalCount = 10
  if(!client)
    return
  collection = client.collection('cl_pcr_guild_rank')
  if(content == ''){
    let query = await findDb(`query_${group}`)
    if(query) {
      content = query.d
    } else {
      help(callback)
      return
    }
  }
  if(content == 'help' || content == 'h') {
    help(callback)
    return
  }
  if(content.startsWith('设置')){
    content = content.substr(2)
    await collection.save({
      '_id': `query_${group}`,
      'd': content
    })
  }
  if(content.startsWith('定时')){
    content = content.substr(2).trim()
    if(/^\d+$/.test(content)) {
      callback(`定时成功，${~~(content/60)} 小时 ${content%60} 分钟（${formatTime(Date.now() + content * 60 * 1000)}）后自动查询`)
      setTimeout(() => {
        guildRankSearch('', qq, group, callback, params)
      }, content * 60 * 1000)
    }
    return
  }
  let ci = content.indexOf('#')
  if(ci == 2) {
    switch(content.substr(0, 2)) {
      case '会长':
        searchDb(content.substr(3), 'leader', callback, params)
        break
      case '公会':
      case '工会':
        searchDb(content.substr(3), 'clan', callback, params)
        break
      case '排名':
        ci = content.substr(3)
        if(/^\d+$/.test(ci)){
          searchDb(ci, 'rank', callback, params)
        } else {
          callback('请输入正确的信息')
        }
        break
      case '分数':
        ci = content.substr(3)
        if(/^\d+$/.test(ci)){
          searchDb(ci, 'score', callback, params)
        } else {
          callback('请输入正确的信息')
        }
        break
      case 'ID':
      case 'id':
        ci = content.substr(3)
        if(/^\d+$/.test(ci)){
          let leaderName = await findDb(`leaderId_${ci}`)
          if(leaderName){
            searchDb(leaderName.d, 'leader', callback, Object.assign({leaderId: ci}, params))
          } else {
            callback('未缓存过会长id')
          }
        } else {
          callback('请输入正确的信息')
        }
        break
      default:
        searchDb(content, 'clan', callback, params)
    }
  } else {
    searchDb(content, 'clan', callback, params)
  }
}

const searchDb = async (searchContent, type, callback, params) => {
  let searchKey = `${type}_${searchContent}`
  let data = await findDb(searchKey)
  if(data && data.expire > Date.now() && !params.forceApi){
    formatData(data.d, type, 'db', callback, '', params)
  } else {
    searchAPI(searchContent, type, data ? data.d : {}, callback, params)
  }
}

const searchAPI = (searchContent, type, dbData, callback, params) => {
  if(searchLimit.expireTs > Date.now()){
    if(searchLimit.count > 0 || (params && params.ignoreLimit)){
      searchLimit.count -= 1
      getAPIData(searchContent, type, callback, params)
    } else {
      if(dbData) {
        formatData(dbData, type, 'db', callback, 'API查询超过限制，目前为数据库缓存', params)
      } else {
        callback(`API查询超过限制，请${formatTime(searchLimit)}后再次查询`)
      }
    }
  } else {
    initLimit()
    getAPIData(searchContent, type, callback, params)
    searchLimit.count -= 1
  }
}

const getAPIData = (searchContent, type, callback, params) => {
  let path, skey
  switch(type) {
    case 'clan':
      path = '/name/0'
      skey = 'clanName'
      break
    case 'leader':
      path = '/leader/0'
      skey = 'leaderName'
      break
    case 'rank':
      path = `/rank/${searchContent}`
      skey = null
      break
    case 'score':
      path = `/score/${searchContent}`
      skey = null
      break
  }
  let options = {
    host: 'service-kjcbcnmw-1254119946.gz.apigw.tencentcs.com',
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://kengxxiao.github.io/Kyouka/",
      "Custom-Source": "baibaibot"
    }
  }

  let postObj = {}
  if(skey){
    postObj[skey] = searchContent
  }
  let postData = JSON.stringify(postObj)

  // console.log(path)
  // console.log(postObj)
  // console.log(postData)

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    let data = ''
    res.on('data', (chunk) => {
      // console.log(chunk)
      data += chunk
    });
    res.on('end', () => {
      // console.log('=== request data ===')
      // console.log(data)
      let pd = JSON.parse(data)
      if(pd.data && pd.data.length){
        formatData(pd, type, 'api', callback, '', params)
        collection.save({
          '_id': `${type}_${searchContent}`,
          'd': pd,
          'expire': Date.now() + DB_EXPIRE_TIME
        })
      } else {
        callback(`未找到相关数据`)
        console.log('=== pcr request empty ===')
        console.log(data)
      }
    });
    res.on('error', e => {
      console.log('=== pcr request res error ===')
      console.log(e.message)
    })
  });

  req.on('error', (e) => {
    console.log('=== pcr request req error ===')
    console.error(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();

}

const formatData = async (data, type, source, callback, otherMsg = '', params = {}) => {
  if(globalCount -- < 0) {
    callback('出现死循环，请排查问题')
    return
  }
  /* 循环更新缓存 */
  // console.log('>>>> format')
  let outData = []
  for(var i = 0; i < data.data.length; i++){
    let ele = Object.assign({'updateTs': data.ts * 1000}, data.data[i])
    //TODO: 旧版无 leader_id 会造成公会历史存储混淆
    let key = `${ele.clan_name}`
    // let key = `${ele.clan_name}_${ele.leader_viewer_id}`
    let tmp = await findDb(key)
    let dataList = [ele]
    if(tmp) {
      if(tmp.d[tmp.d.length - 1].updateTs != data.ts * 1000){
        dataList = tmp.d.concat([ele])
        await collection.save({
          '_id': key,
          'd': dataList,
        })
      } else {
        dataList = tmp.d
      }
    } else {
      await collection.save({
        '_id': key,
        'd': dataList,
      })
    }
    await collection.save({
      '_id': `leaderId_${ele.leader_viewer_id}`,
      'd': ele.leader_name,
    })
    /*
    * clan_name: string
    * damage: number
    * leader_name: string
    * leader_viewer_id: number
    * member_num: number
    * rank: number
    * history: []
    * loopInfo: {
    *   loop: number
    *   boss: number
    *   lefthp: number
    * }
    * */
    outData.push(
      Object.assign(
        ele,
        {
          history: dataList,
          loopInfo: calcLoop(parseInt(ele.damage))
        }
      )
    )
  }
  if(params.leaderId) {
    let filter = outData.filter(x => x.leader_viewer_id == params.leaderId)
    if(filter.length == 1) {
      outData = filter
    }
  }
  if(outData.length == 1 && !params.getData) {
    outData[0].nearbyRank = await getRank(outData[0].rank, params)
  }

  if(params.getData) {
    if(type == 'rank'){
      let rData = Object.assign({
        'updateTs': data.ts * 1000,
        loopInfo: calcLoop(parseInt(data.data[0].damage))
      }, data.data[0]), rTmp = [rData]
      let rSave = await findDb(`r_${rData.rank}`)
      if(rSave) {
        if(rSave.d[rSave.d.length - 1].updateTs != data.ts * 1000) {
          rTmp = rSave.d.concat([rData])
          await collection.save({
            '_id': `r_${rData.rank}`,
            'd': rTmp,
          })
        } else {
          rTmp = rSave.d
        }
      } else {
        await collection.save({
          '_id': `r_${rData.rank}`,
          'd': rTmp,
        })
      }
      callback(rTmp)
    } else {
      callback(outData)
    }
    return
  }

  // console.log('=============')
  // console.log(JSON.stringify(outData, 2))
  // console.log(outData)
  if(params.drawImage) {
    renderImage(outData, source, callback, otherMsg, params)
  } else {
    renderMsg(outData, source, callback, otherMsg, params)
  }
}

const renderImage = (data, source, callback, otherMsg = '', params = {}) => {

}

const renderMsg = (data, source, callback, otherMsg = '', params = {}) => {
  let msg = ''
  msg += `>>> 工会战查询 <<<\n`
  switch(source){
    case 'db':
      msg += `数据来源： 数据库缓存\n`
      break
    case 'api':
      msg += `数据来源： API接口\n`
      break
  }
  if(otherMsg) {
    msg += `${otherMsg}\n`
  }
  data.forEach(d => {
    msg += `==============\n`
    let his = d.history.slice(-2), hisLength = his.length
    msg += `排名： ${d.rank}`
    msg += hisLength == 2 ? `(${his[1].rank - his[0].rank <= 0 ? '↑': '↓'}${Math.abs(his[1].rank - his[0].rank)})\n` : '\n'
    msg += `公会： ${d.clan_name}\n`
    msg += `分数： ${d.damage}`
    msg += hisLength == 2 ? `(${his[0].damage - his[1].damage <= 0 ? '↑': '↓'}${Math.abs(his[1].damage - his[0].damage)})\n` : '\n'
    msg += `会长： ${d.leader_name}\n`
    msg += `会长ID： ${d.leader_viewer_id}\n`
    msg += `更新时间： ${formatTime(his[hisLength - 1].updateTs)}\n`
    if(hisLength == 2) {
      msg += `上次更新： ${formatTime(his[0].updateTs)}\n`
    }
    msg += `当前为 ${d.loopInfo.loop+1} 周目 ${d.loopInfo.boss+1} 号boss\n剩余血量：${~~d.loopInfo.lefthp}\n`
    if(d.nearbyRank) {
      let { upper, below } = d.nearbyRank, u = upper.slice(-2), b = below.slice(-2)
      msg += '==============\n'
      msg += `更新时间：${formatTime(u[u.length - 1].updateTs)}\n`
      let r1score = u[u.length - 1].damage
      msg += `【${u[u.length - 1].rank}位】 ${r1score} (+${r1score - d.damage})\n`
      msg += `当前为 ${u[u.length - 1].loopInfo.loop+1} 周目 ${u[u.length - 1].loopInfo.boss+1} 号boss\n剩余血量：${~~u[u.length - 1].loopInfo.lefthp}\n`
      msg += '==============\n'
      msg += `更新时间：${formatTime(b[b.length - 1].updateTs)}\n`
      let r2score = b[b.length - 1].damage
      msg += `【${b[b.length - 1].rank}位】 ${r2score} (${r2score - d.damage})\n`
      msg += `当前为 ${b[b.length - 1].loopInfo.loop+1} 周目 ${b[b.length - 1].loopInfo.boss+1} 号boss\n剩余血量：${~~b[b.length - 1].loopInfo.lefthp}\n`
    }
  })
  // callback(msg)
  drawTxtImage('', msg, callback, {color: 'black', font: 'STXIHEI.TTF'})
}

const getRank = async (rank, params) => {
  let r1, r2
  for(let i = 0; i < RANK_LIST.length; i ++){
    if(rank >= RANK_LIST[i]) {
      if(rank == RANK_LIST[i] && i != RANK_LIST.length - 1) {
        r1 = RANK_LIST[i + 1]
      } else {
        r1 = RANK_LIST[i]
      }
      if(i != 0) {
        r2 = RANK_LIST[i - 1]
      } else {
        r2 = RANK_LIST[i]
      }
      break
    }
  }
  let r1Data = await getRankData(r1, params)
  let r2Data = await getRankData(r2, params)
  return new Promise(resolve => {
    resolve({
      upper: r1Data,
      below: r2Data
    })
  })
}

const getRankData = (rank, params) => {
  let h = new Date().getHours(), option = {getData: true}
  if(h === 5) {
    option.forceApi = true
  }
  if(params.forceApi) {
    option.forceApi = true
    option.ignoreLimit = true
  }
  return new Promise(resolve => {
    searchDb(rank, 'rank', data => {
      resolve(data)
    }, option)
  })
}

const initLimit = () => {
  searchLimit = {
    expireTs: Date.now() + GLOBAL_EXPIRE_TIME,
    count: GLOBAL_COUNT_LIMIT
  }
}

const findDb = _id => {
  return collection.findOne({'_id': _id})
}

const help = callback => {
  callback(`===== 公会战查询 =====\n可使用【bcs 公会名】或者【bcs [类型]#[名称/数值]】查询，类型可为公会、会长、排名、分数、ID（会长id，必须模糊查询过以获取会长id），例如：【bcs 会长#ALG】。\n其中，排名与分数必须为数值，公会和会长可使用字符模式（支持正则表达式）`)
}

const formatTime = ts => `${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`

const addZero = n => n < 10 ? ('0' + n) : n

const calcLoop = damage => {
  let loopHp = HP_LIST.map(list => list.reduce((p, e) => p + e)), loop = -1, lh, hplist, powerList
  while(damage >= 0) {
    loop ++
    if(loop < HP_LIST.length - 1){
      lh = loopHp[loop]
    } else {
      lh = loopHp[HP_LIST.length - 1]
    }
    damage -= lh
  }
  if(loop < HP_LIST.length - 1){
    lh = loopHp[loop]
    hplist = HP_LIST[loop]
    powerList = POWER[loop]
  } else {
    lh = loopHp[HP_LIST.length - 1]
    hplist = HP_LIST[HP_LIST.length - 1]
    powerList = POWER[POWER.length - 1]
  }
  return Object.assign({
    loop: loop,
  }, calcBoss(damage + lh, hplist, powerList))
}

const calcBoss = (damage, hplist, powerList) => {
  for(let i = 0; i < hplist.length; i ++){
    if(damage - hplist[i] > 0){
      damage -= hplist[i]
    } else {
      return {
        boss: i,
        lefthp: (hplist[i] - damage) / powerList[i]
      }
    }
  }

}

module.exports = {
  guildRankSearch
}