const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050'

let userHash = {

}
let client

const calendar = async (content, author, groupId, callback, type = 'insert') => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR CALENDAR MODULE!!')
      console.log(e)
    }
  }
  let sp = content.split('\n').map(x => x.trim()).filter(x => x)
  switch(type) {
    case "search":
      if(content.trim()) {
        searchCalendar(content, groupId, callback)
      } else {
        help(content)
      }
      break
    case "insert":
      if(sp.length >= 4) {
        setCalendar(...sp.slice(0, 4), author, groupId, callback)
      } else {
        help(callback)
      }
      break
    case "delete":
      break
  }
}

const searchCalendar = async (project, groupId, callback) => {
  let data = await client.db('db_bot').collection('cl_calendar').find({ project, groupId }).toArray()
  if(data.length > 0) {
    callback(`${project}: \n${data.map(x => `${x.activity} ${formatTime(x.startTime)} ~ ${formatTime(x.endTime)}`).join('\n')}`)
  } else {
    callback(`${project}: 没有数据`)
  }
}

const setCalendar = async (project, activity, st, et, author, groupId, callback) => {
  if(project.length > 6) {
    callback('标题过长')
    return
  }
  let startTime = strToTs(st), endTime = strToTs(et)
  if(isNaN(startTime)) {
    callback('开始时间错误')
    return
  }
  if(isNaN(endTime)) {
    callback('结束时间错误')
    return
  }
  let search = await client.db('db_bot').collection('cl_calendar').find({ project, activity, groupId }).toArray()
  if(search.length) {
    if(search.length > 1) {
      userHash[author] = {
        search
      }
      callback(`选择需要设置的位置:\n${search.map((x, i) => `选择日历${i} | ${x.project}-${x.activity} ${formatTime(x.startTime)} ~ ${formatTime(x.endTime)}`).join('\n')}`)
    } else {
      await client.db('db_bot').collection('cl_calendar').updateOne(
        { '_id': search[0]._id },
        {
          '$set': {
            project,
            activity,
            startTime,
            endTime,
            author,
            groupId
          }
        }
      )
      callback('设置成功')
    }
  } else {
    await client.db('db_bot').collection('cl_calendar').save({
      project,
      activity,
      startTime,
      endTime,
      author,
      groupId
    })
    callback('设置成功')
  }
}

const setCalendarByOid = async (oid, callback) => {

}

const help = callback => {
  callback(`使用如下格式设置日历：\n\n日历设置\n【日历名称】\n【日历项目】\n【开始时间】\n【结束时间】\n\n*注：时间使用YYYY-MM-DD HH:MM:SS格式，不输入年份默认当年，不输入时间默认6点`)
}

const strToTs = str => {
  let s = str.trim()
  s = s.replace(/：/g, ':')
  if(s.split('-').length === 2) {
    s = `${new Date().getFullYear()}-${s}`
  }
  if(s.split(':').length === 1) {
    s = `${s} 6:0:0`
  }
  return new Date(s).getTime()
}

const formatTime = ts => `${new Date(ts).getFullYear()}-${new Date(ts).getMonth() + 1}-${new Date(ts).getDate()} ${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`

const addZero = n => n < 10 ? ('0' + n) : n

module.exports = {
  calendar
}
