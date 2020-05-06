const MongoClient = require('mongodb').MongoClient
// const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'

/* init db */
let client
(async () => {client = await MongoClient.connect(MONGO_URL)})()

const discord = (content, qq, group, callback) => {
  if(!client)
    return
  let sp = content.toLowerCase().replace(/ +/g, ' ').trim().split(' '),
    collection = client.collection('cl_pcr_discord')
  switch(sp[0]) {
    case 'init':
      init(sp.slice(1), group, collection, callback)
      break
    case 'queue':
      queue(qq, group, collection, callback)
      break
  }
  // console.log(client.collection('cl_pcr_discord'))
  // init([100, 200, 300], group, client.collection('cl_pcr_discord'))
  // getBossData(group, collection)
}

const init = async (BossList, group, collection, callback) => {
  let now = new Date()
  collection.save({
    '_id': `${group}_${now.getMonth() + 1}_${now.getDate()}`,
    'boss': BossList,
    'index': 0,
    'tree': [],
    'attack': [],
    'current': '',
  })
  let data = await getBossData(group, collection)
  callback(`初始化成功!${data.boss.join(',')}`)
}

const checkGroupToday = (group, collection) => {

}

const getBossData = (group, collection) => {
  let now = new Date()
  return collection.findOne({'_id': `${group}_${now.getMonth() + 1}_${now.getDate()}`})

}

const queue = () => {

}

const saveDB = () => {

}

module.exports = {
  discord
}