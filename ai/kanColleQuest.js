const fs = require('fs-extra')
const path = require('path-extra')
const _ = require('lodash')
let userQuestObj = {}
let isInit = false
let dataSource = []
let nextQuest = {}
let dataForId = {}
let wikiId2Id = {}

module.exports = function(userId, context, callback){
  if(!isInit){
    // DataPath = https://kcwikizh.github.io/kcdata/quest/poi.json
    fs.readJsonSync(path.join('assets', 'kanColleQuestData.json')).forEach(ele => {
      dataForId[ele.game_id] = ele
      wikiId2Id[ele.wiki_id] = ele.game_id
    })
    // DataPathSource = http://kcwikizh.github.io/kcdata/quest/all.json
    fs.readJsonSync(path.join('assets', 'kanColleQuestDataSource.json')).forEach(ele => {
      dataForId[ele.id].chinese_title = ele.chinese_title
      dataForId[ele.id].chinese_detail = ele.chinese_detail
      let obj = {}
      obj.checkStr = ele.title + ele.detail + ele.chinese_title + ele.chinese_detail
      obj.wikiId = ele.wiki_id
      obj.id = ele.id
      ele.prerequisite.forEach(pre => {
        !!nextQuest[pre] ? (nextQuest[pre] = [ele.id]) : (nextQuest[pre] = [ele.id])
      })
      dataSource.push(obj)
    })
    console.log('=== complete ===')
    isInit = true
  }

  let response = ''
  if(context.trim() === ''){
    response = `查询任务信息\n可通过关键词（最多5个，用|隔开）查询，也可通过kcwiki编号查询`
  } else {
    if(/^[A-G](\d{1,3}|([a-z]\d{1,2}){1})$/.test(context)){
      response = searchQuestByWikiId(userId, context, 'all')
    } else {
      let keywords = context.split('|')
      if(keywords.length <= 5){
        let searchArr = [], maxCount = 0
        dataSource.forEach(ele => {
          let count = 0
          keywords.forEach(keyword => {
            if(keyword.trim() && ele.checkStr.indexOf(keyword) + 1){
              count ++
            }
          })
          if(count){
            if(count > maxCount){
              maxCount = count
              searchArr = []
            }
            if(count == maxCount && searchArr.length < 5){
              let createObj = {
                'wikiId': ele.wikiId,
                'id': ele.id,
                'count': count
              }
              searchArr.push(createObj)
            }
          }
        })
        if(searchArr.length === 1){
          response = searchQuestById(userId, searchArr[0].id, 'all')
        } else {
          let str = ''
          searchArr.forEach(ele => {
            str += searchQuestById(userId, ele.id, 'base')
          })
          if(searchArr.length >= 5){
            str += '仅显示前5条，如果没有搜索到任务，请输入更多关键字'
          }
          response = str
        }
        console.log(searchArr)
      } else {
        response = '只能输入最多5个关键字'
      }
    }
  }
  console.log(response)
}

const searchWikiIdById = (id, type) => {
  switch(type){
    case 'addTitle':
      return `${dataForId[id].wiki_id} - ${dataForId[id].name}`
    default:
      return dataForId[id].wiki_id
  }
}

const searchQuestById = (userId, id, type) => {
  if(!!dataForId[id])
    return renderMsg(userId, dataForId[id], type)
  else
    return '未查到此任务'
}

const searchQuestByWikiId = (userId, wikiId, type) => {
  let gameId = wikiId2Id[wikiId]
  console.log(gameId)
  if(gameId){
    return searchQuestById(userId, gameId, type)
  } else {
    return '未找到此任务'
  }
}

const renderMsg = (userId, dataObj, type) => {
  let str = ''
  switch(type){
    case 'all':
      str += `${dataObj.wiki_id} - ${dataObj.chinese_title}\n${dataObj.chinese_detail}\n`
      if(dataObj.prerequisite.length){
        str += `【前置任务】\n`
        dataObj.prerequisite.forEach(gameId => {
          str += `${searchWikiIdById(gameId, 'addTitle')}\n`
        })
      }
      if(nextQuest[dataObj.game_id]){
        str += `【后续任务】\n`
        nextQuest[dataObj.game_id].forEach(gameId => {
          str += `${searchWikiIdById(gameId, 'addTitle')}\n`
        })
      }
      return str
    case 'base':
      str += `${dataObj.wiki_id} - ${dataObj.chinese_title}\n`
      return str
  }
}