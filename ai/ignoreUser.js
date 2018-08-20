let groupLogs = {}
let ignoreUsers = {}
const ignoreTimeBase = 60
const showMsg = true

module.exports = function(group, id, content, callback){
  let now = new Date().getTime()
  if(groupLogs[group] == undefined){
    groupLogs[group] = {
      "lastSpeakUser" : id,
      "lastSpeakMsg": content,
      "count": 1
    }
  } else {
    if(groupLogs[group].lastSpeakUser == id){
      if(groupLogs[group].lastSpeakMsg == content){
        if(groupLogs[group].count >= 3){
          if(ignoreUsers[id] == undefined){
            ignoreUsers[id] = {
              "endTime": now + ignoreTimeBase * 1 * 1000,
              "count": 1
            }
          } else {
            ignoreUsers[id].endTime = now + ignoreTimeBase * Math.pow(2, ignoreUsers[id].count)
            ignoreUsers[id].count = ignoreUsers[id].count + 1
          }
          groupLogs[group].lastSpeakUser = 10000
          groupLogs[group].lastSpeakMsg = ''
          groupLogs[group].count = 1
          if(showMsg){
            callback(`[CQ:at,qq=${id}]百百决定不理你${Math.pow(2, ignoreUsers[id].count - 1) * ignoreTimeBase}秒`)
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
      if(!(ignoreUsers[id] == undefined || ignoreUsers[id].endTime > now)){
        groupLogs[group].lastSpeakUser = id
        groupLogs[group].lastSpeakMsg = content
        groupLogs[group].count = 1
      }
    }
  }
  return !(ignoreUsers[id] == undefined || ignoreUsers[id].endTime > now)
}