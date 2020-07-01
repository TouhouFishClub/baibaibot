const DB_EXPIRE_TIME = 60 * 60 * 1000
const GLOBAL_EXPIRE_TIME = 60 * 60 * 1000
const GLOBAL_COUNT_LIMIT = 20
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'
const https = require('https')
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
  expireTs : 9999999999999,
  count: GLOBAL_COUNT_LIMIT,
}

const guildRankSearch = (content, qq, group, callback, params) => {
  if(!client)
    return
  collection = client.collection('cl_pcr_guild_rank')
  if(content == ''){
    help(callback)
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
      default:
        searchDb(content, 'clan', callback, params)
    }
  }
}

const searchDb = async (searchContent, type, callback, params) => {
  let searchKey = `${type}_${searchContent}`
  let data = await findDb(searchKey)
  if(data && data.expire > Date.now() && !params.forceApi){
    renderMsg(data.d, 'db', callback)
  } else {
    searchAPI(searchContent, type, data ? data.d : {}, callback, params)
  }
}

const searchAPI = (searchContent, type, dbData, callback, params) => {
  if(searchLimit.expireTs > Date.now()){
    if(searchLimit.count > 0 || (params && params.ignoreLimit)){
      searchLimit.count -= 1
      getAPIData(searchContent, type, callback)
    } else {
      if(dbData) {
        renderMsg(dbData, 'db', callback, 'API查询超过限制，目前为数据库缓存')
      } else {
        callback(`API查询超过限制，请${formatTime(searchLimit)}后再次查询`)
      }
    }
  } else {
    initLimit()
    getAPIData(searchContent, type, callback)
    searchLimit.count -= 1
  }
}
const getAPIData = (searchContent, type, callback) => {
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
        renderMsg(JSON.parse(data), 'api', callback)
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

const renderMsg = async (data, source, callback, otherMsg = '') => {
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
  for(var i = 0; i < data.data.length; i++){
    let ele = data.data[i]
    let tmp = await findDb(ele.clan_name)
    if(!tmp || tmp.damage == ele.damage){
      msg += `==============\n`
      msg += `排名： ${ele.rank}\n`
      msg += `公会： ${ele.clan_name}\n`
      msg += `分数： ${ele.damage}\n`
      msg += `会长： ${ele.leader_name}\n`
    } else {
      msg += `==============\n`
      msg += `排名： ${ele.rank} ${tmp.rank - ele.rank < 0 ? '↑': '↓'}${Math.abs(tmp.rank - ele.rank)}\n`
      msg += `公会： ${ele.clan_name}\n`
      msg += `分数： ${ele.damage} ${tmp.damage - ele.damage < 0 ? '↑': '↓'}${Math.abs(tmp.damage - ele.damage)}\n`
      msg += `会长： ${ele.leader_name}\n`
      msg += `上次更新时间： ${formatTime(ele.updateTs)}\n`

      await collection.save({
        '_id': ele.clan_name,
        'd': ele,
        'updateTs': data.ts * 1000
      })
    }
  }

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
  callback(`===== 公会战查询 =====\n可使用【bcs 公会名】或者【brs [类型]#[名称/数值]】查询，类型可为公会、会长、排名、分数，例如：【brs 会长#ALG】。\n其中，排名与分数必须为数值，公会和会长可使用字符模式（支持正则表达式）`)
}

const formatTime = ts => `${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`
const addZero = n => n < 10 ? ('0' + n) : n

module.exports = {
  guildRankSearch
}