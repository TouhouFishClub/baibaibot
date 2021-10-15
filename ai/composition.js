const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
const md5 = require("md5")

let client

const composition = async (context, callback) => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR COMPOSITION MODULE!!')
      console.log(e)
    }
  }
  if(context == '查成分') {
    help(callback)
  } else {
    let s = context.substring(1, context.length - 2).trim()
    if(s.startsWith('[CQ:at')){
      let _id = s.substring(s.indexOf('qq=') + 3, s.indexOf(']'))
      let composition = s.substring(s.indexOf(']') + 1)
      if(composition) {
        if(composition.length > 15) {
          callback(`成分太大无法查询`)
          return
        }
        let level = createComposition(_id, composition)
        await saveComposition(_id, composition, level)
        callback(`[CQ:at,qq=${_id}]${composition}浓度为${level}%`)
      } else {
        let allComposition = await searchComposition(_id)
        let format = Object.keys(allComposition).map(key => {
          return {
            key,
            level: allComposition[key]
          }
        })
        format.sort((a, b) => b.level - a.value)
        if(format.length) {
          callback(`[CQ:at,qq=${_id}]有以下成分:\n${format.map(x => `${x.key}浓度为${x.level}%`).join('\n')}`)
        } else {
          callback(`[CQ:at,qq=${_id}]没有任何成分`)
        }
      }
    } else {
      // help(callback)
    }
  }
}

const createComposition = (_id, composition) => {
  let str = `${_id}_${composition}`
  let md = md5(str)
  let level = parseInt(md.substring(0, 15), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  let levelFixType = parseInt(md.substring(15, 16), 16) % 3
  let levelFix = parseInt(md.substring(16, 20), 16).toString().split('').reduce((p, c) => p + parseInt(c), 0)
  switch (levelFixType){
    case 0:
      level += levelFix
      break
    case 1:
      level -= levelFix
      break
  }
  if(level < 0){
    level = Math.abs(level)
  }
  if(level > 100){
    if(level > 105){
      level = 100 - (level - 105)
    }
    else {
      level = 100
    }
  }
  return level

}

const searchComposition = async (_id) => {
  let col = client.collection('cl_composition')
  let user = await col.findOne({_id})
  if(user) {
    delete user._id
  } else {
    user = {}
  }
  return user
}

const saveComposition = async (_id, composition, level) => {
  let col = client.collection('cl_composition')
  let user = await col.findOne({_id})
  let data = {}
  data[composition] = level
  if(user) {
    await col.updateOne(
      { _id },
      { '$set': data }
    )
  } else {
    await col.save(Object.assign({ _id }, data))
  }
  return 'success'
}

const help = callback => {
  callback(`可使用 查【@xxx】【yyy】成分 查询某人(xxx)的(yyy)成分\n可使用 查【@xxx】成分 查询某人所有成分`)
}

module.exports = {
  composition
}
