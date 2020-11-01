const fs = require('fs-extra')
const path = require('path-extra')
const _ = require('lodash')
const http = require('http')
let userItemObj = {}

module.exports = function (userId, content, callback) {
  let response
  content=content.trim();
  switch(content){
    case '':
      response = `默认显示当天可改修的装备\n可使用[类型]-[星期]来查看特定星期改修\n可查询某个装备（无视日期）\n若查出数个装备，可按照x[序号]（如x2）来查询某个装备的详情\n可通过+[改修等级]（如+max、+7）来查询某个装备消耗资源\n支持的装备类型：${checkItemType.join("、")}，部分支持简写\n`
      break;
    default:
      let sp = content.split('+'), query = sp[0], star = sp[1]
      if(star && /^(10|\d|max)$/i.test(star)){
        if(/^(max)$/i.test(star)){
          star = 10
        }
        star = parseInt(star)
      } else {
        star = 0
      }
      if(query.substr(0, 1) === 'x'){
        response = searchByHistory(userId, query.substr(1).trim(), star)
      } else {
        if(query.split('-').length - 1){
          //特定周期
          let sp = query.split('-')
          let week = sp[1].trim() === '' ? getJSTDayofWeek() : (sp[1].trim() % 7)
          if(!/^\d+$/.test(week)){
            week = getJSTDayofWeek()
          }
          if(sp[0] !== '')
            response = checkIsItemType(userId, sp[0].trim(), week, star)
          else
            response = '请输入装备/装备类型'
        } else {
          //当天
          response = checkIsItemType(userId, query.trim(), getJSTDayofWeek(), star)
        }
      }
  }
  console.log('===response===')
  console.log(response)
  // callback(response)
  let strArr = response.split('\n'), callbackArr = []
  callbackArr.push(strArr.reduce((pre, cur) => {
    if(pre.length + cur.length < 250)
      return `${pre}\n${cur}`
    else {
      callbackArr.push(pre)
      return cur
    }
  }))
  // let sli, str = response
  // while(str.length){
  //   sli = str.slice(0, 250)
  //   callbackArr.push(sli)
  //   str = str.split(sli)[1]
  // }
  callbackArr.forEach(async (ele, idx) => {
    await wait(idx * 500)
    callback(ele)
  })
}

const wait = time => new Promise(resolve => setTimeout(() => resolve(), time))

// const Axios = require('axios')
let Data = fs.readJsonSync(path.join('assets', 'kanColleEquipData.json'));
let checkItemType = Array.from(new Set(_.map(Data, 'type')))
//TODO: 自动下载代码出错（非标准json）
// http.get({
//   host: 'kcwikizh.github.io',
//   port: 80,
//   path: '/kcdata/slotitem/poi_improve.json',
//   method: 'GET',
//   headers: {
//     'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
//   },
// }, res => {
//   console.log('read start')
//   let chunk = ''
//   res.on('data', data => chunk += data)
//   res.on('end', () => {
//     console.log('read data from wiki');
//     Data = JSON.parse(chunk)
//     checkItemType = Array.from(new Set(_.map(Data, 'type')))
//     // console.log(Data)
//   })
// }).on('error', e => {
//   console.log(e)
// })

// Axios.get('http://kcwikizh.github.io/kcdata/slotitem/poi_improve.json', {
//   timeout: 6000
// }).then(function(response){
//   console.log('read data from wiki');
//   Data = response.data;
//   checkItemType = Array.from(new Set(_.map(Data, 'type')))
// }).catch(error => {
//   console.log(error)
//   if(error.code == 'ECONNREFUSED'){
//     console.log('===error===')
//   }
//
//   console.log('read data from file');
//   //console.log(error)
// });

// DataPath = http://kcwikizh.github.io/kcdata/slotitem/poi_improve.json

const itemTypeSynonyms = str => {
  switch (str){
    case '小口径':
    case '小口径主炮':
      return '小口径主砲'
    case '中口径':
    case '中口径主炮':
      return '中口径主砲'
    case '大口径':
    case '大口径主炮':
      return '大口径主砲'
    case '主炮':
      return '主砲'
    case '副炮':
      return '副砲'
    case '鱼雷':
    case '雷':
      return '魚雷'
    case '舰战':
      return '艦上戦闘機'
    case '舰爆':
    case '煎包':
      return '艦上爆撃機'
    case '飞机':
    case '舰载机':
      return '艦上'
    case '水侦':
    case '侦察机':
      return '水上偵察機'
    case '水暴':
    case '水爆':
      return '水上爆撃機'
    case '电探':
      return '電探'
    case 'AP弹':
    case '撤甲弹':
    case '穿甲弹':
      return '対艦強化弾'
    case '机铳':
      return '対空機銃'
    case '暴雷':
    case '爆雷':
      return '爆雷'
    case '水听':
      return 'ソナー'
    case '机关':
    case '缶':
    case '锅炉':
      return '機関部強化'
    case '大发':
    case '大发动艇':
      return '上陸用舟艇'
    case 'pad':
    case 'PAD':
    case '装甲':
      return '追加装甲'
    case '大灯':
      return '大型探照灯'
    case '水战':
      return '水上戦闘機'
    case '战斗粮食':
      return '戦闘糧食'
    case '战斗':
      return '戦闘'
    case '粮食':
      return '糧食'
    default:
      return str
  }
}


// types = ["小口径主砲","中口径主砲","大口径主砲","副砲","魚雷","艦上戦闘機","艦上爆撃機","艦上偵察機",
//          "水上偵察機","水上爆撃機","小型電探","大型電探","対艦強化弾","対空機銃","爆雷","ソナー","機関部強化",
//          "上陸用舟艇","追加装甲(中型)","追加装甲(大型)","探照灯","大型探照灯","高射装置","特型 内火艇","潜水艦装備","水上戦闘機"]

const checkIsItemType = (userId, str, week, star) => {
  let synonymsStr = itemTypeSynonyms(str)
  let checkReg = new RegExp(synonymsStr, 'i')
  for(let i = 0; i < checkItemType.length; i++){
    if(checkReg.test(checkItemType[i])){
      return searchByType(userId, synonymsStr, week)
    }
  }
  return searchByItem(userId, synonymsStr, star);
}

const searchByHistory = (userId, content, star) => {
  if(userItemObj[userId]){
    let msg = '', itemObj = userItemObj[userId]
    if(content === ''){
      msg = '记忆中的装备\n'
      itemObj.forEach((item, index) => {
        msg += `x${index} | ${item.name}\n`
      })
      return msg
    }
    if(/^\d+$/.test(content)){
      if(content >= itemObj.length){
        return '选的数字太大啦'
      } else {
        console.log(itemObj[content].name)
        return renderMessage('item', [itemObj[content]], '', userId, star);
      }
    } else {
      return '输入格式错误'
    }
  } else {
    return '没有记忆过装备'
  }
}

const searchByType = (userId, type, week) => {
  let searchObj = {}, itemObj = [], count = 0
  const checkReg = new RegExp(type, 'i')
  Data.forEach(ele => {
    if(checkReg.test(ele.type)){
      let improvementShip = improvementForWeek(ele, week);
      if(improvementShip.split('||')[1] !== '不可改修'){
        if(!searchObj[ele.type]){
          searchObj[ele.type] = []
        }
        searchObj[ele.type].push(`x${count++} | ${improvementShip}`)
        itemObj.push(ele)
      }
    }
  })
  userItemObj[userId] = itemObj
  return renderMessage('type', searchObj, week)
}

const improvementForWeek = (item, week) => {
  let hishos = []
  item.improvement.map( improvement =>
    improvement.req.map( req =>
      req.secretary.map( secretary => {
        if (week === -1 || req.day[week]) {
          hishos.push(secretary)
        }
      })))
  if(!hishos.length)
    return `${item.name}||不可改修`
  else
    return `${item.name}||${hishos.join('/')}`
}

const searchByItem = (userId, item, star) => {
  let itemReg = new RegExp(item.replace(/[.()（）]/g, ''), 'i'), searchArr = []
  Data.forEach(ele => {
    if(itemReg.test(ele.name.replace(/[.()（）]/g, ''))){
      searchArr.push(ele)
    }
  })
  searchArr.forEach(ele => {
    if(ele.name === item){
      searchArr = [ele]
    }
  })
  if(searchArr.length){
    return renderMessage('item', searchArr, '', userId, star)
  } else {
    return '未找到此装备'
  }
}

const renderMessage = (type, itemObj, week, userId, star) => {
  let msg = ''
  switch (type){
    case 'type':
      Object.keys(itemObj).forEach(ele => {
        msg += `${ele}\n`
        msg += itemObj[ele].join('\n').split('||').join('  →  ').replace(/None/g, '不需要辅助舰')
        msg += '\n'
      })
      return `周${['日', '一', '二', '三', '四', '五', '六'][week]}改修\n${msg}`
    case 'item':
      if(itemObj.length - 1){
        msg += '请选择装备\n'
        itemObj.forEach((item, index) => {
          msg += `\`ex${index} | ${improvementForWeek(item, getJSTDayofWeek()).replace('||', '  →  ')}\n`
        })
        userItemObj[userId] = itemObj
      } else {
        let today = getJSTDayofWeek()
        itemObj.forEach(item => {
          msg += `${item.name}`
          item.improvement.forEach(improvement => {
            if(star) {
              msg += ` +${star == 10 ? 'MAX' : star}\n`
              msg += `【耗资统计】\n`
              msg += `油：${improvement.consume.fuel * star}\n`
              msg += `弹：${improvement.consume.ammo * star}\n`
              msg += `钢：${improvement.consume.steel * star}\n`
              msg += `铝：${improvement.consume.bauxite * star}\n`
              msg += `开发资材：${star <= 6 ? improvement.consume.material[0].development[0] * star : improvement.consume.material[0].development[0] * 6 + improvement.consume.material[1].development[0] * (star - 6)}\n`
              msg += `改修资材：${star <= 6 ? improvement.consume.material[0].development[0] * star : improvement.consume.material[0].improvement[0] * 6 + improvement.consume.material[1].improvement[0] * (star - 6)}\n`
              let eatEquip = {}
              if(star <= 6){
                if(!!improvement.consume.material[0].item.name){
                  eatEquip[improvement.consume.material[0].item.name] = parseInt(improvement.consume.material[0].item.count) * star
                }
              } else {
                if(!!improvement.consume.material[0].item.name){
                  eatEquip[improvement.consume.material[0].item.name] = parseInt(improvement.consume.material[0].item.count) * 6
                }
                if(!!improvement.consume.material[1].item.name){
                  if(eatEquip[improvement.consume.material[1].item.name]){
                    eatEquip[improvement.consume.material[1].item.name] = eatEquip[improvement.consume.material[1].item.name] + parseInt(improvement.consume.material[1].item.count) * (star - 6)
                  } else {
                    eatEquip[improvement.consume.material[1].item.name] = parseInt(improvement.consume.material[1].item.count) * (star - 6)
                  }
                }
              }
              msg += `消耗装备：`
              let eatMsg = ''
              _.forEach(eatEquip, (val, key) => {
                eatMsg += `\n${key} * ${val} `
              })
              msg += eatMsg === '' ? '无': eatMsg
            } else {
              msg += '\n'
              let weekArr = new Array(7).fill([]), weekName = ['日', '一', '二', '三', '四', '五', '六']
              improvement.req.forEach(req => {
                for(let i = 0; i < req.day.length; i++){
                  if(req.day[i])
                    weekArr[i] = weekArr[i].concat(req.secretary)
                }
              })
              weekArr.forEach((ele, index) => {
                msg += `周${weekName[index]}${index === today ? '(今天)' : ''} : ${ele.join('/').replace(/None/g, '不需要辅助舰')}\n`
              })
              msg += `消耗资源：\n油(${improvement.consume.fuel}) 弹(${improvement.consume.ammo}) 钢(${improvement.consume.steel}) 铝(${improvement.consume.bauxite})\n`
              msg += `消耗资材：\n【0 - 6】开发资材：${improvement.consume.material[0].development[0]}(${improvement.consume.material[0].development[1]}) 改修资材：${improvement.consume.material[0].improvement[0]}(${improvement.consume.material[0].improvement[1]}) 消耗装备：${improvement.consume.material[0].item.name === '' ? '无' : (improvement.consume.material[0].item.name + ' *' + improvement.consume.material[0].item.count)}\n`
              msg += `【7 - 10】开发资材：${improvement.consume.material[1].development[0]}(${improvement.consume.material[1].development[1]}) 改修资材：${improvement.consume.material[1].improvement[0]}(${improvement.consume.material[1].improvement[1]}) 消耗装备：${improvement.consume.material[1].item.name === '' ? '无' : (improvement.consume.material[1].item.name + ' *' + improvement.consume.material[1].item.count)}\n`
              if(improvement.upgrade.name !== ''){
                msg += `【进化】开发资材：${improvement.consume.material[2].development[0]}(${improvement.consume.material[2].development[1]}) 改修资材：${improvement.consume.material[2].improvement[0]}(${improvement.consume.material[2].improvement[1]}) 消耗装备：${improvement.consume.material[2].item.name === '' ? '无' : (improvement.consume.material[2].item.name + ' *' + improvement.consume.material[2].item.count)}\n`
                msg += `${item.name} → ${improvement.upgrade.name}\n`
              }
              //msg += `\n`
            }
          })
        })
      }
      return msg
    default:
      return '参数错误'
  }
}

const getJSTDayofWeek = () => {
  const date = new Date()
  let day = date.getUTCDay()
  if (date.getUTCHours() >= 15) {
    day = (day + 1) % 7
  }
  return day
}