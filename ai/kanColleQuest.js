const fs = require('fs-extra')
const path = require('path-extra')
const _ = require('lodash')
const KEYWORDS_LIMIT = 10
let userQuestObj = {}
let isInit = false
let dataSource = []
let nextQuest = {}
let dataForId = {}
let wikiId2Id = {}

module.exports = function(userId, context, callback){
  const timeInfo = `search by ${context}`
  console.time(timeInfo)
  if(!isInit){
    // DataPath = https://kcwikizh.github.io/kcdata/quest/poi.json
    fs.readJsonSync(path.join('assets', 'kanColleQuestData.json')).forEach(ele => {
      dataForId[ele.game_id] = Object.assign({}, ele, {
        "chinese_title": ele.name,
        "chinese_detail": ele.detail
      })
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
    console.log('=== init kancolle quest data complete ===')
    isInit = true
  }

  let response = ''
  if(context.trim() === ''){
    response = `查询任务信息\n可通过关键词（最多${KEYWORDS_LIMIT}个，用|隔开）查询，也可通过kcwiki编号查询`
  } else {
    if(/^[A-Z]{1,2}(\d{1,3}|([a-z]\d{1,2}){1})$/.test(context)){
      response = searchQuestByWikiId(userId, context, 'all')
    } else {
      let keywords = context.split('|')
      if(keywords.length <= KEYWORDS_LIMIT){
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
          if(searchArr.length == 0){
            str += '未找到相关任务，请检查关键词'
          }
          response = str
        }
        // console.log(searchArr)
      } else {
        response = `只能输入最多${KEYWORDS_LIMIT}个关键字`
      }
    }
  }
  // console.log(response)
  console.timeEnd(timeInfo)

  let strArr = response.split('\n'), callbackArr = []
  callbackArr.push(strArr.reduce((pre, cur) => {
    if(pre.length + cur.length < 250)
      return `${pre}\n${cur}`
    else {
      callbackArr.push(pre)
      return cur
    }
  }))
  callbackArr.forEach(async (ele, idx) => {
    await wait(idx * 500)
    callback(ele)
  })
}

const wait = time => new Promise(resolve => setTimeout(() => resolve(), time))

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
      str += rewardMsg(dataObj)
      str += `【任务描述】\n${questInfo(dataObj.requirements)}\n`
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

const rewardMsg = dataObj => {
  let str = '', rewards = ''
  str += '【获得资源】\n'
  if(dataObj.reward_fuel)
    rewards += `油：${dataObj.reward_fuel} `
  if(dataObj.reward_ammo)
    rewards += `弹：${dataObj.reward_ammo} `
  if(dataObj.reward_steel)
    rewards += `钢：${dataObj.reward_steel} `
  if(dataObj.reward_bauxite)
    rewards += `铝：${dataObj.reward_bauxite} `
  if(rewards !== '')
    str += rewards
  str += '\n'
  if(dataObj.reward_other)
    dataObj.reward_other.forEach(ele => {
      str += ele.name
      if(ele.amount)
        str += ` * ${ele.amount} \n`
    })
  return str
}

const questInfo = dataObj => {
  let str = ''
  try {
    switch(dataObj.category){
      case 'fleet':
        str += `编组${reqInfo(dataObj.groups, 'groups')}`
        if(dataObj.fleetid)
          str += `，限第${dataObj.fleetid}舰队`
        if(dataObj.disallowed)
          str += `，${dataObj.disallowed}不可`
        break
      case 'sortie':
        str += dataObj.map || ''
        if(dataObj.boss){
          str += `BOSS战${reqInfo(dataObj.result, 'result')}`
        } else {
          str += '出击'
        }
        if(dataObj.times)
          str += `${dataObj.times}次`
        str += `需要${reqInfo(dataObj.groups, 'groups')}`
        if(dataObj.fleetid)
          str += `，限第${dataObj.fleetid}舰队`
        if(dataObj.disallowed)
          str += `，${dataObj.disallowed}不可`
        break
      case 'sink':
        str += `击沉${reqInfo(dataObj.ship, 'shipType')}${dataObj.amount}只`
        break
      case 'a-gou':
        str += "S胜利6次, BOSS战胜利12次, 进行BOSS战24次, 出击36次(一次出击多次战斗算一次)"
        break
      case 'expedition':
        let expeditionArr = []
        dataObj.objects.forEach(ele => {
          let expId = ''
          if(ele.id)
            if(_.isArray(ele.id))
              expId = ele.id.join('/')
            else
              expId = ele.id
          expeditionArr.push(`远征${expId}成功${ele.times}次`)
        })
        str += expeditionArr.join('，')
        if(dataObj.resources){
          str += '，消耗'
          str += dataObj.resources[0] ? (dataObj.resources[0] + '油 ') : ''
          str += dataObj.resources[1] ? (dataObj.resources[1] + '弹 ') : ''
          str += dataObj.resources[2] ? (dataObj.resources[2] + '钢 ') : ''
          str += dataObj.resources[3] ? (dataObj.resources[3] + '铝 ') : ''
        }
        if(dataObj.groups)
          str += `需要${reqInfo(dataObj.groups, 'groups')}`
        if(dataObj.disallowed)
          str += `，${dataObj.disallowed}不可`
        break
      case 'simple':
        switch(dataObj.subcategory){
          case 'equipment':
            str += `废弃装备${dataObj.times}次`
            break
          case 'ship':
            str += `建造舰船${dataObj.times}次`
            break
          case 'scrapequipment':
            str += `废弃装备${dataObj.times}次`
            if(dataObj.batch)
              str += '，可一次性废弃'
            break
          case 'scrapship':
            str += `解体舰船${dataObj.times}次`
            break
          case 'modernization':
            str += `近代化改造成功${dataObj.times}次`
            break
          case 'improvement':
            str += `装备改修${dataObj.times}次(失败也可)`
            break
          case 'resupply':
            str += `进行补给${dataObj.times}次`
            break
          case 'repair':
            str += `入渠${dataObj.times}次`
            break
          case 'battle':
            str += `进行${dataObj.times}次战斗`
            break
          default:
            str += '任务未找到'
        }
        break
      case 'excercise':
        str += '演习'
        if(dataObj.victory)
          str += '胜利'
        str += `${dataObj.times}次`
        if(dataObj.daily)
          str += '，限一日内'
        break
      case 'modelconversion':
        str += `秘书舰${dataObj.secretary || '空母'}搭载未上锁的`
        str += dataObj.fullyskilled ? '、满熟练度的' : ''
        str += dataObj.maxmodified ? '、改修Max的' : ''
        str += dataObj.equipment
        let flag = 0, exInfo = ''
        if(dataObj.scraps){
          flag = 1
          exInfo += '废弃'
          let scrapArr = []
          dataObj.scraps.forEach(ele => {
            scrapArr.push(`${ele.name}${ele.amount}只`)
          })
          exInfo += scrapArr.join('、')
        }
        if(dataObj.consumptions){
          if(flag)
            exInfo += '，同时'
          exInfo += '消耗'
          let consumptionsArr = []
          dataObj.consumptions.forEach(ele => {
            consumptionsArr.push(`${ele.name}${ele.amount}个`)
          })
          exInfo += consumptionsArr.join('、')
        }
        if(dataObj.use_skilled_crew)
          exInfo += '，同时消耗一个熟练搭乘员'
        if(exInfo)
          str += `，然后${exInfo}`
        break
      case 'scrapequipment':
        str += '废弃'
        let itemArr = []
        dataObj.list.forEach(ele => {
          itemArr.push(`${ele.name}${ele.amount}只`)
        })
        str += itemArr.join('、')
        break
      case 'equipexchange':
        if(dataObj.scraps){
          str += '废弃'
          let itemArr = []
          dataObj.scraps.forEach(ele => {
            itemArr.push(`${ele.name}${ele.amount}只`)
          })
          str += itemArr.join('、')
        }
        if(dataObj.equipments){
          if(str)
            str += '，'
          str += '准备'
          let itemArr = []
          dataObj.equipments.forEach(ele => {
            itemArr.push(`${ele.name}${ele.amount}只`)
          })
          str += itemArr.join('、')
        }
        if(dataObj.resources){
          if(str)
            str += '，'
          str += '消耗'
          str += dataObj.resources[0] ? (dataObj.resources[0] + '油 ') : ''
          str += dataObj.resources[1] ? (dataObj.resources[1] + '弹 ') : ''
          str += dataObj.resources[2] ? (dataObj.resources[2] + '钢 ') : ''
          str += dataObj.resources[3] ? (dataObj.resources[3] + '铝 ') : ''
        }
        if(dataObj.consumptions){
          if(str)
            str += '，'
          str += '消耗'
          let itemArr = []
          dataObj.consumptions.forEach(ele => {
            itemArr.push(`${ele.name}${ele.amount}个`)
          })
          str += itemArr.join('、')
        }
        break
      case 'modernization':
        if(dataObj.resources){
          str += '准备'
          str += dataObj.resources[0] ? (dataObj.resources[0] + '油 ') : ''
          str += dataObj.resources[1] ? (dataObj.resources[1] + '弹 ') : ''
          str += dataObj.resources[2] ? (dataObj.resources[2] + '钢 ') : ''
          str += dataObj.resources[3] ? (dataObj.resources[3] + '铝 ') : ''
        }
        str += `对${dataObj.ship}近代化改造成功${dataObj.times}次`
        if(dataObj.consumptions){
          str += '，每次消耗'
          let shipArr = []
          dataObj.consumptions.forEach(ele => {
            shipArr.push(`${ele.shipshipArr}${ele.amount}个`)
          })
          str += shipArr.join('、')
        }
        break
      case 'and':
        let questArr = []
        dataObj.list.forEach(ele => {
          questArr.push(questInfo(ele))
        })
        str += questArr.join(' 以及 ')
        break
      default:
        str += '不支持的任务类型'
    }
  } catch(err){
    console.log('=== 任务详情生成失败 ===')
    console.log(err)
  }
  return str
}

const reqInfo = (data, type) => {
  switch(type){
    case 'result':
      return {
        "クリア": "完成全图",
        "S": "获得S胜",
        "A": "获得A胜或以上",
        "B": "获得B胜或以上",
        "C": "获得C败或以上"
      }[data] || ''
    case 'shipType':
      return {
        "艦": "任意舰船",
        "他の艦": "其它舰船",
        "駆逐": "驱逐",
        "軽巡": "轻巡",
        "重巡": "重巡",
        "航巡": "航巡",
        "水母": "水母",
        "空母": "空母",
        "装母": "装母",
        "軽母": "轻母",
        "戦艦": "战舰",
        "低速戦艦": "低速战舰",
        "航戦": "航战",
        "高速艦": "高速舰船",
        "潜水艦": "潜水艇",
        "潜水空母": "潜水空母",
        "潜水母艦": "潜水母舰(大鲸)",
        "敵補給艦": "补给舰",
        "敵潜水艦": "潜水舰",
        "敵空母": "空母",
        "敵軽母": "轻母",
      }[data] || data
    case 'groups':
      let groupArr = []
      data.groups.forEach(ele => {
        let data = reqInfo(ele.ship, 'shipType')
        if(ele.amount)
          data += `${ele.amount}艘`
        if(ele.flagship)
          data += '旗舰'
        groupArr.push(data)
      })
      return groupArr.join(' + ')
  }
}