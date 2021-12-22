const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050'

let userHash = {

}
let client

const calendar = async (content, author, groupId, callback) => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR CALENDAR MODULE!!')
      console.log(e)
    }
  }
  let sp = content.split('\n').map(x => x.trim()).filter(x => x)

}

const searchCalendar = (project, callback) => {

}

const setCalendar = async (project, activity, startTime, endTime, author, groupId, callback) => {
  let search = await client.db('db_bot').collection('cl_calendar').find({ project, activity, groupId }).toArray()
  if(search.length) {
    if(search.length > 1) {
      userHash[author] = {
        search
      }
      callback(``)
    } else {
    }
  } else {
    await client.db('db_bot').collection('cl_calendar').save({
      project,
      activity,
      startTime,
      endTime,
      author
    })
  }
}

const setCalendarByOid = async (oid, callback) => {

}

const help = callback => {

}

const strToTs = str => {
  let s = str.trim()
  s = s.replace(/：/g, ':')
  if(s.split('-') === 2) {
    s = `${new Date().getFullYear()}-${s}`
  }
  if(s.split(':') === 1) {
    s = `${s} 6:0:0`
  }
  return new Date(s).getTime()
}

const formatTime = ts => `${new Date(ts).getFullYear()}-${new Date(ts).getMonth() + 1}-${new Date(ts).getDate()} ${new Date(ts).getHours()}:${addZero(new Date(ts).getMinutes())}:${addZero(new Date(ts).getSeconds())}`

const addZero = n => n < 10 ? ('0' + n) : n

module.exports = {
  calendar
}
