const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../baibaiConfigs').mongourl;
const { renderCalendar } = require('./calendar/index')

let userHash = {

}
let userDelHash = {

}
let client

const checkAlias = async (project, groupId) => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR CALENDAR MODULE!!')
      console.log(e)
    }
  }
  let alias = await client.db('db_bot').collection('cl_calendar_alias').findOne({_id: `${groupId}_${project}`})
  return alias && alias.d
}



const calendar = async (content, author, groupId, callback, type = 'add') => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR CALENDAR MODULE!!')
      console.log(e)
    }
  }
  let sp = content.split('\n').map(x => x.trim()).filter(x => x)
  let alias = await checkAlias(sp[0], groupId)
  switch(type) {
    case "search":
      if(content.trim()) {
        if(alias) {
          groupId = parseInt(alias)
        }
        searchCalendar(content, groupId, callback)
      } else {
        help(callback)
      }
      break
    case "add":
      if(userHash[author]) {
        delete userHash[author]
      }
      if(sp.length >= 4) {
        if(alias) {
          callback(`${sp[0]}已引继，无法设置`)
          return
        }
        addCalendar(author, groupId, callback, ...sp.slice(0, 4))
      } else if(sp.length >= 2 && sp[1].indexOf('引继') > -1){
        addCalendar(author, groupId, callback, ...sp)
      } else {
        help(callback)
      }
      break
    case "insert":
      if(alias) {
        callback(`${sp[0]}日历已引继，无法设置`)
        return
      }
      if(userHash[author]) {
        delete userHash[author]
      }
      if(sp.length >= 4) {
        setCalendar(...sp.slice(0, 4), author, groupId, callback)
      } else {
        help(callback)
      }
      break
    case "insert-select":
      if(alias) {
        callback(`${sp[0]}日历已引继，无法设置`)
        return
      }
      if(userHash[author] && userHash[author].search[content]) {
        await setCalendarByOid(userHash[author].search[content]._id, userHash[author].infos, callback)
        delete userHash[author]
      } else {
        help(callback)
      }
      break
    case "delete":
      if(alias) {
        callback(`${sp[0]}日历已引继，无法设置`)
        return
      }
      if(userDelHash[author]) {
        delete userDelHash[author]
      }
      if(sp.length >= 2) {
        deleteCalendar(...sp.slice(0, 2), author, groupId, callback)
      } else {
        help(callback)
      }
      break
    case "delete-select":
      if(alias) {
        callback(`${sp[0]}日历已引继，无法设置`)
        return
      }
      if(userDelHash[author] && userDelHash[author].search[content]) {
        await deleteCalendarByOid(userDelHash[author].search[content]._id, callback)
        delete userDelHash[author]
      } else {
        help(callback)
      }
      break
  }
}

const deleteCalendar = async (project, activity, author, groupId, callback) => {
  let search = await client.db('db_bot').collection('cl_calendar').find({ project, activity, groupId }).toArray()

  if(search.length) {
    if(search.length > 1) {
      userDelHash[author] = {
        search
      }
      callback(`选择需要删除的位置:\n${search.map((x, i) => `选择删除${i} | ${x.project}-${x.activity} ${formatTime(x.startTime)} ~ ${formatTime(x.endTime)}`).join('\n')}`)
    } else {
      await client.db('db_bot').collection('cl_calendar').remove(
        { '_id': search[0]._id }
      )
      callback('删除成功')
    }
  } else {
    callback('没有相关的记录')
  }
}

const deleteCalendarByOid = async (_id, callback) => {
  await client.db('db_bot').collection('cl_calendar').remove({ _id })
  callback('删除成功')
}

const searchCalendar = async (project, groupId, callback) => {
  let data = await client.db('db_bot').collection('cl_calendar').find({ project, groupId }).toArray()
  if(data.length > 0) {

    let now = new Date()
    renderCalendar(now.getFullYear(), now.getMonth() + 1, callback, data.map(x => {
      return {
        name: x.activity,
        start_time: formatTime(x.startTime),
        end_time: formatTime(x.endTime)
      }
    }), `${project}_${groupId}`)

    // callback(`${project}: \n${data.map(x => `${x.activity} ${formatTime(x.startTime)} ~ ${formatTime(x.endTime)}`).join('\n')}`)
  } else {
    callback(`${project}: 没有数据`)
  }
}

const addCalendar = async (author, groupId, callback, project, activity, st) => {
  if(project.length > 6) {
    callback('标题过长')
    return
  }
  if(activity == '引继' && st.match(/^\d+$/)) {
    if(!st) {
      callback('未设置引继码')
      return
    }
    await client.db('db_bot').collection('cl_calendar_alias').save({
      _id: `${groupId}_${project}`,
      d: st
    })
    callback('引继成功')
    return
  }
  if(activity == '取消引继') {
    await client.db('db_bot').collection('cl_calendar_alias').remove({_id: `${groupId}_${project}`})
    callback('取消引继成功')
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
        search,
        infos: {
          project,
          activity,
          startTime,
          endTime,
          author,
          groupId
        }
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
      })
      callback('设置成功')
    }
  } else {
    callback('没有相关的记录')
  }
}

const setCalendarByOid = async (_id, infos, callback) => {
  await client.db('db_bot').collection('cl_calendar').updateOne(
    { _id },
    {
      '$set': infos
    }
  )
  callback('设置成功')
}

const help = callback => {
  callback(`使用如下格式设置日历：\n\n日历设置\n【日历名称】\n【日历项目】\n【开始时间】\n【结束时间】\n\n*注：时间使用YYYY-MM-DD HH:MM:SS格式，不输入年份默认当年，不输入时间默认6点，各个参数之间使用换行分隔\n*可使用【日历修改】修改已存在的日历，可使用【日历删除】删除已设置的日历，日历修改参数与日历设置相同，日历删除不需要开始时间与结束时间。`)
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
