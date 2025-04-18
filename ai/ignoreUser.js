let groupLogs = {}
let ignoreUsers = {}
const ignoreTimeBase = 3600
const showMsg = true

module.exports = function(group, id, content, callback){
  if(group == '670968817') {
    return false
  }
  // console.log(`${group}-${id}:${content}`)
  let now = new Date().getTime()
  if(groupLogs[group] == undefined){
    groupLogs[group] = {
      "lastSpeakUser" : id,
      "lastSpeakMsg": content,
      "count": 1
    }
  } else {
    if(ignoreUsers[id] == undefined || ignoreUsers[id].endTime < now) {
      if(groupLogs[group].lastSpeakUser == id){
        if(groupLogs[group].lastSpeakMsg == content){
          //TODO: 实验，暂定重复三次同样的话
          if(groupLogs[group].count >= 2){
            if(ignoreUsers[id] == undefined){
              ignoreUsers[id] = {
                "endTime": now + ignoreTimeBase * 1 * 1000,
                "count": 1
              }
            } else {
              // ignoreUsers[id].endTime = now + ignoreTimeBase * Math.pow(2, ignoreUsers[id].count)
              ignoreUsers[id].endTime = now + ignoreTimeBase * Math.pow(2, 1)
              ignoreUsers[id].count = ignoreUsers[id].count + 1
            }
            groupLogs[group].lastSpeakUser = 10000
            groupLogs[group].lastSpeakMsg = ''
            groupLogs[group].count = 1
            if(showMsg){
              callback(`[CQ:at,qq=${id}] 百百不想理你，并用${Math.pow(2, ignoreUsers[id].count - 1) * ignoreTimeBase}秒画了一个${["猫头鹰","鸽子","鹦鹉"][Math.floor(Math.random()*3)]}`)
            }
          } else {
            groupLogs[group].count = groupLogs[group].count + 1
          }
        } else {
          groupLogs[group].lastSpeakUser = id
          groupLogs[group].lastSpeakMsg = content
          groupLogs[group].count = 1
        }
      } else {
        groupLogs[group].lastSpeakUser = id
        groupLogs[group].lastSpeakMsg = content
        groupLogs[group].count = 1
      }
    } else {
      // callback(`百百不理你到${new Date(ignoreUsers[id].endTime)}`)
    }
  }
  // console.log(`ignoreUser: ${JSON.stringify(ignoreUsers)}`)
  // console.log(`groupLogs: ${JSON.stringify(groupLogs)}`)
  // console.log(`return ${!(ignoreUsers[id] == undefined || ignoreUsers[id].endTime < now)}`)
  return !(ignoreUsers[id] == undefined || ignoreUsers[id].endTime < now)
}