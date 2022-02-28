const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../../baibaiConfigs').mongourl;
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'
let tmp = {}


/* init db */
let client
(async () => {
  try {
    client = await MongoClient.connect(MONGO_URL)
  } catch (e) {
    console.log('MONGO ERROR FOR PCR MODULE!!')
    console.log(e)
  }
})()

const plan = (qq, content, callback) => {
  if(content.trim() == '' || content == '帮助') {
    help(callback)
    return
  }
  let line = content.split('\n')
  let sp = line[0].split('~'), st = new Date(sp[0]), et = new Date(sp[1])
  if(st.toString() == 'Invalid Date' || et.toString() == 'Invalid Date') {
    callback('日期格式错误')
    return
  }
  if(et.getHours() == 0 && et.getMinutes() == 0 && et.getSeconds() == 0 && et.getMilliseconds() == 0){
    et = new Date(et.getTime() + 24 * 60 * 60 * 1000 - 1)
  }
  let obj = {
    name: line[1],
    start_time: st,
    end_time: et
  }
  tmp[qq] = obj
  callback(`您设置的日程为：\n${st.getFullYear()}/${st.getMonth()+1}/${st.getDate()} ${st.getHours()}:${st.getMinutes()}:${st.getSeconds()} ~ ${et.getFullYear()}/${et.getMonth()+1}/${et.getDate()} ${et.getHours()}:${et.getMinutes()}:${et.getSeconds()}\n${line[1]}\n确认设置，清输入确认日程，如需修改清直接修改`)
  return
}

const enterSet = async (qq, callback) => {
  let collection = client.collection('cl_schedule')
  if(tmp[qq]) {
    let user = await getUser(qq, collection)
    if(user && user.plan) {
      await collection.save({
        '_id': qq,
        'plan': user.play.concat([{
          name: tmp[qq].name,
          start_time: tmp[qq].start_time.getTime(),
          end_time: tmp[qq].end_time.getTime()
        }])
      })
    } else {
      await collection.save({
        '_id': qq,
        'plan': [{
          name: tmp[qq].name,
          start_time: tmp[qq].start_time.getTime(),
          end_time: tmp[qq].end_time.getTime()
        }]
      })
    }

  } else {
    callback('您当前没有设置的日程')
  }
}

const getUser = (qq, collection) => {
  return collection.findOne({'_id': `${qq}`})
}

const searchPlan = callback => {
  let collection = client.collection('cl_schedule')
  if(content.trim() == '' || content == '帮助') {

  }
}

const help = callback => {
  callback('这是帮助')
}


module.exports = {
  plan,
  enterSet,
  searchPlan
}