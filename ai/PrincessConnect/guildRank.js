const DB_EXPIRE_TIME = 30 * 60 * 1000
const GLOBAL_EXPIRE_TIME = 60 * 60 * 1000
const GLOBAL_COUNT_LIMIT = 20
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'
const https = require('https')
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
    renderMsg(data.d, 'db', callback, '', params)
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
        renderMsg(dbData, 'db', callback, 'API查询超过限制，目前为数据库缓存', params)
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
      "Referer": "https://kengxxiao.github.io/Kyouka/"
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
      if(JSON.parse(data).data.length){
        renderMsg(JSON.parse(data), 'api', callback, '', params)
        collection.save({
          '_id': `${type}_${searchContent}`,
          'd': JSON.parse(data),
          'expire': Date.now() + DB_EXPIRE_TIME
        })
      } else {
        callback('未找到相关数据')
      }
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();

}

const renderMsg = async (data, source, callback, otherMsg = '', params = {}) => {
  // console.log(data)
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
  msg += `更新时间: ${formatTime(data.ts * 1000)}\n`
  let count = 0
  for(var i = 0; i < data.data.length; i++){
    let ele = Object.assign({'updateTs': data.ts * 1000}, data.data[i])
    let tmp = await findDb(ele.clan_name)
    let dataList = [ele]
    if(tmp) {
      if(tmp.d[tmp.d.length - 1].updateTs != data.ts * 1000){
        dataList = tmp.d.concat([ele])
        await collection.save({
          '_id': ele.clan_name,
          'd': dataList,
        })
      } else {
        dataList = tmp.d
      }
    } else {
      await collection.save({
        '_id': ele.clan_name,
        'd': dataList,
      })
    }
    if(!params.leaderId || params.leaderId == ele.leader_viewer_id){
      if(dataList.length > 1){
        let s1 = dataList[dataList.length - 1]
        let s2 = dataList[dataList.length - 2]
        let obj = calcLoop(parseInt(s1.damage))
        msg += `==============\n`
        msg += `排名： ${s1.rank} ${s1.rank - s2.rank <= 0 ? '↑': '↓'}${Math.abs(s1.rank - s2.rank)}\n`
        msg += `公会： ${s1.clan_name}\n`
        msg += `分数： ${s1.damage} ${s2.damage - s1.damage < 0 ? '↑': '↓'}${Math.abs(s1.damage - s2.damage)}\n`
        msg += `会长： ${s1.leader_name}\n`
        msg += `会长ID： ${s1.leader_viewer_id}\n`
        msg += `上次更新时间： ${formatTime(s2.updateTs)}\n`
        msg += `当前为 ${obj.loop+1} 周目 ${obj.boss+1} 号boss\n剩余血量：${obj.lefthp}\n`
        await collection.save({
          '_id': `leaderId_${ele.leader_viewer_id}`,
          'd': ele.leader_name,
        })
        count ++
      } else {
        let obj = calcLoop(parseInt(ele.damage))
        msg += `==============\n`
        msg += `排名： ${ele.rank}\n`
        msg += `公会： ${ele.clan_name}\n`
        msg += `分数： ${ele.damage}\n`
        msg += `会长： ${ele.leader_name}\n`
        msg += `会长ID： ${ele.leader_viewer_id}\n`
        msg += `当前为 ${obj.loop+1} 周目 ${obj.boss+1} 号boss\n剩余血量：${obj.lefthp}\n`
        await collection.save({
          '_id': `leaderId_${ele.leader_viewer_id}`,
          'd': ele.leader_name,
        })
        count ++
      }
    }
  }
  msg += `count: ${count}`
  callback(msg)
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