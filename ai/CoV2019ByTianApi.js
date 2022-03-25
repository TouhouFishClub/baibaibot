const util = require('util')
const request=require('request')
const requestPromise = util.promisify(request)
const API_KEY = '481dc42b939c82778b9b722efaa86ee6'
const fs = require('fs')
const path = require('path')
const { sendImageMsgBuffer } = require('../cq/sendImage')
const {createCanvas, loadImage} = require('canvas')
const { fetchTencentApi } = require('./CoV2019ByTencentApi')

const fontFamily = 'STXIHEI'
const maxGetDay = 7

let updateDay = 0
let lastUpdateTime = 0

let AllArea = []
let AllData = {}

const cov = async (content, callback, custom = false, ...customSettings) => {

  let tencentApiData = await fetchTencentApi(content)

  if(tencentApiData.length) {
    let target, otherStr = ''
    if(tencentApiData.length == 1) {
      target = tencentApiData[0]
    } else {
      let qs = tencentApiData.map(x => x.queryName), f = tencentApiData.find(x => x.queryName == content)
      otherStr = `查找到以下地区：${qs.join('、')}`
      if(f) {
        target = f
        otherStr += `，已为您定位到${target.queryName}`
      } else {
        target = tencentApiData[0]
        otherStr += `，默认显示${target.queryName}`
      }
    }

    let data = {
      currentConfirmedCount: [],
      suspectedCount: [],
      confirmedCount: [],
      curedCount: [],
      deadCount: [],
    }
    data.currentConfirmedCount.push(target.data.total.nowConfirm)
    data.currentConfirmedCount.push(target.data.total.nowConfirm - target.data.today.confirm)

    data.confirmedCount.push(target.data.total.confirm)
    data.confirmedCount.push(target.data.total.confirm - target.data.today.confirm)

    data.suspectedCount.push(target.data.total.wzz)
    data.suspectedCount.push(target.data.total.wzz - target.data.today.wzz_add)

    data.curedCount.push(target.data.total.heal)
    data.curedCount.push(target.data.total.heal)

    data.deadCount.push(target.data.total.dead)
    data.deadCount.push(target.data.total.dead)
    if(target.lastUpdateTime) {
      data.tencentUpdateTime = target.lastUpdateTime
    }

    // callback(otherStr)
    renderImage(
      ['现有确诊', '现有无症状', '累计确诊', '累计治愈', '累计死亡'],
      {
        name: `${target.prov ? `${target.prov} - `: ''}${target.name}`,
        type: 'other',
      },
      data,
      content,
      callback,
      otherStr
    )
    return
  }

  if (AllArea.length == 0) {
    await init(callback)
  }
  /* 天数改变，更新所有数据(7天) */
  if(checkDate()) {
    console.log('更新所有数据')
    AllData = {}
    for(let i = 0; i < maxGetDay; i ++) {
      // console.log(i)
      let now = new Date()
      let date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      let dateStr = `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(date.getDate())}`
      // let res1 = await requestPromise(`http://api.tianapi.com/txapi/ncovcity/index?key=${API_KEY}&date=${dateStr}`)
      // // console.log(dateStr)
      // let body1 = JSON.parse(res1.body)
      // if(body1.code == 200) {
      //   let list = body1.newslist
      //   /* 添加省份 */
      //   list.forEach(li => {
      //     if(AllData[li.locationId]) {
      //       AllData[li.locationId].confirmedCount.push(li.confirmedCount)
      //       AllData[li.locationId].curedCount.push(li.curedCount)
      //       AllData[li.locationId].currentConfirmedCount.push(li.currentConfirmedCount)
      //       AllData[li.locationId].deadCount.push(li.deadCount)
      //       AllData[li.locationId].suspectedCount.push(li.suspectedCount)
      //     } else {
      //       AllData[li.locationId] = {
      //         confirmedCount: [li.confirmedCount],
      //         curedCount: [li.curedCount],
      //         currentConfirmedCount: [li.currentConfirmedCount],
      //         deadCount:[li.deadCount],
      //         suspectedCount: [li.suspectedCount]
      //       }
      //     }
      //     let city = li.cities
      //     city.forEach(ci => {
      //       if(AllData[ci.locationId]) {
      //         AllData[ci.locationId].confirmedCount.push(ci.confirmedCount)
      //         AllData[ci.locationId].curedCount.push(ci.curedCount)
      //         AllData[ci.locationId].currentConfirmedCount.push(ci.currentConfirmedCount)
      //         AllData[ci.locationId].deadCount.push(ci.deadCount)
      //         AllData[ci.locationId].suspectedCount.push(ci.suspectedCount)
      //       } else {
      //         AllData[ci.locationId] = {
      //           confirmedCount: [ci.confirmedCount],
      //           curedCount: [ci.curedCount],
      //           currentConfirmedCount: [ci.currentConfirmedCount],
      //           deadCount:[ci.deadCount],
      //           suspectedCount: [ci.suspectedCount]
      //         }
      //       }
      //     })
      //   })
      // } else {
      //   bindError(body1.code, callback)
      //   return
      // }
      let res2 = await requestPromise(`http://api.tianapi.com/txapi/ncovabroad/index?key=${API_KEY}&date=${dateStr}`)
      let body2 = JSON.parse(res2.body)
      if(date.getTime() < 1584144000000) {
        /* 国家数据没有3-13之前的数据 */
        continue
      }
      if(body2.code == 200) {
        let list = body2.newslist
        list.forEach(li => {
          if (AllData[li.locationId]) {
            AllData[li.locationId].confirmedCount.push(li.confirmedCount)
            AllData[li.locationId].curedCount.push(li.curedCount)
            AllData[li.locationId].currentConfirmedCount.push(li.currentConfirmedCount)
            AllData[li.locationId].deadCount.push(li.deadCount)
          } else {
            AllData[li.locationId] = {
              confirmedCount: [li.confirmedCount],
              curedCount: [li.curedCount],
              currentConfirmedCount: [li.currentConfirmedCount],
              deadCount: [li.deadCount]
            }
          }
        })
      } else {
        bindError(body2.code, callback)
        return
      }
      // await new Promise(resolve => {
      //   setTimeout(() => resolve('ok'), 1000)
      // })
    }
    updateDay = new Date().getDate()
  }

  if(checkUpdate()) {
    console.log('更新当天数据')
    // let res1 = await requestPromise(`http://api.tianapi.com/txapi/ncovcity/index?key=${API_KEY}`)
    // let body1 = JSON.parse(res1.body)
    // if(body1.code == 200) {
    //   let list = body1.newslist
    //   /* 添加省份 */
    //   list.forEach(li => {
    //     if(AllData[li.locationId]) {
    //       AllData[li.locationId].confirmedCount[0] = li.confirmedCount
    //       AllData[li.locationId].curedCount[0] = li.curedCount
    //       AllData[li.locationId].currentConfirmedCount[0] = li.currentConfirmedCount
    //       AllData[li.locationId].deadCount[0] = li.deadCount
    //       AllData[li.locationId].suspectedCount[0] = li.suspectedCount
    //     }
    //     let city = li.cities
    //     city.forEach(ci => {
    //       if(AllData[ci.locationId]) {
    //         AllData[ci.locationId].confirmedCount[0] = ci.confirmedCount
    //         AllData[ci.locationId].curedCount[0] = ci.curedCount
    //         AllData[ci.locationId].currentConfirmedCount[0] = ci.currentConfirmedCount
    //         AllData[ci.locationId].deadCount[0] = ci.deadCount
    //         AllData[ci.locationId].suspectedCount[0] = ci.suspectedCount
    //       }
    //     })
    //   })
    // } else {
    //   bindError(body1.code, callback)
    //   return
    // }
    let res2 = await requestPromise(`http://api.tianapi.com/txapi/ncovabroad/index?key=${API_KEY}`)
    let body2 = JSON.parse(res2.body)
    if(body2.code == 200) {
      let list = body2.newslist
      list.forEach(li => {
        if (AllData[li.locationId]) {
          AllData[li.locationId].confirmedCount[0] = li.confirmedCount
          AllData[li.locationId].curedCount[0] = li.curedCount
          AllData[li.locationId].currentConfirmedCount[0] = li.currentConfirmedCount
          AllData[li.locationId].deadCount[0] = li.deadCount
        }
      })
    } else {
      bindError(body2.code, callback)
      return
    }
    lastUpdateTime = Date.now()
  } else {
    console.log('无需更新当天数据')
  }

  // console.log(AllData)

  /* search */
  if(content == '你群') {
    renderImage(
      ['现有女友', '疑似女友', '群内女友', '确诊女友', '境外女友'],
      {
        name: '你群',
        type: 'other',
      },
      {
        confirmedCount: [0, 0],
        curedCount: [0, 0],
        currentConfirmedCount: [0, 0],
        deadCount: [0, 0],
      },
      '你群',
      callback
    )
    return
  }

  if(custom && customSettings) {
    renderImage(...customSettings, callback)
    return
  }

  if(content == '国外' || content == '外国' || content == '非中国') {
    let sa = AllArea.filter(x => x.type == 'abroad' && x.name != '中国')
    let confirmedCount = [], curedCount = [], currentConfirmedCount = [], deadCount = []
    sa.forEach(x => {
      if(AllData[x.locationId].confirmedCount.length <= maxGetDay) {
        confirmedCount = arrAdd(confirmedCount, AllData[x.locationId].confirmedCount)
      }
      if(AllData[x.locationId].curedCount.length <= maxGetDay) {
        curedCount = arrAdd(curedCount, AllData[x.locationId].curedCount)
      }
      if(AllData[x.locationId].currentConfirmedCount.length <= maxGetDay) {
        currentConfirmedCount = arrAdd(currentConfirmedCount, AllData[x.locationId].currentConfirmedCount)
      }
      if(AllData[x.locationId].deadCount.length <= maxGetDay) {
        deadCount = arrAdd(deadCount, AllData[x.locationId].deadCount)
      }
    })
    renderImage(
      ['现有确诊', '现有疑似', '累计确诊', '累计治愈', '累计死亡'],
      {
        name: '非中国',
        type: 'other',
      },
      {
        confirmedCount: confirmedCount,
        curedCount: curedCount,
        currentConfirmedCount: currentConfirmedCount,
        deadCount: deadCount,
      },
      '非中国',
      callback
    )
  } else {
    AllArea = Array.from(new Set(AllArea))
    if(content.trim() == '') {
      callback('输入地市查询疫情状态')
      return
    }
    let sa = AllArea.filter(x => new RegExp(content).test(x.name))
    // console.log(sa[0])
    // console.log(AllData[sa[0].locationId])
    if (sa.length == 1) {
      renderImage(['现有确诊', '现有疑似', '累计确诊', '累计治愈', '累计死亡'], sa[0], AllData[sa[0].locationId], content, callback)
    } else {
      if(sa.length > 30) {
        callback(`查询到过多国家或地区，请精确查找`)
      } else {
        if(sa.length == 0) {
          callback('未查找到相关国家或地区')
        } else {
          let flag = false, tmp
          for(let i = 0; i < sa.length; i++) {
            if(sa[i].name == content) {
              flag = true
              tmp = sa[i]
              break
            }
          }
          if(flag) {
            callback(`查找到以下国家或地区：${sa.map(x => x.name).join('、')}, 已为您匹配到: ${content}`)
            renderImage(['现有确诊', '现有疑似', '累计确诊', '累计治愈', '累计死亡'], tmp, AllData[tmp.locationId], content, callback)
          } else {
            callback(`查找到以下国家或地区：${sa.map(x => x.name).join('、')}, 使用正则表达式精确查找`)
          }
        }
      }
    }
  }
}

const arrAdd = (arr1, arr2) => {
  let length = Math.max(arr1.length, arr2.length)
  let arrTmp = []
  for(let i = 0; i < length; i++){
    arrTmp[i] = parseInt(arr1[i]||0) + parseInt(arr2[i]||0)
  }
  return arrTmp
}

const renderImage = (typeName, area, data, content, callback, otherMsg = '') => {
  // console.log(area)
  // console.log(data)

  let canvas = createCanvas(800, 260)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, 800, 280)

  /* title */
  ctx.font = `32px ${fontFamily}`
  ctx.fillStyle = '#000'
  let title = ''
  switch(area.type) {
    case 'abroad':
      title = `${area.continents} - ${area.name}`
      break
    case 'city':
      title = `${area.parentName} - ${area.name}`
      break
    case 'prov':
      title = `${area.name}`
      break
    case 'other':
      title = `${area.name}`
      break
    default:
      title = '未知地区'
  }
  ctx.fillText(title, 25, 66)


  /* update time */
  ctx.font = `14px ${fontFamily}`
  ctx.fillStyle = 'rgba(153, 153, 153, 1)'
  let update = new Date(lastUpdateTime)
  let updateStr = `数据更新时间: ${update.getFullYear()}-${addZero(update.getMonth() + 1)}-${addZero(update.getDate())} ${update.getHours()}:${addZero(update.getMinutes())}:${addZero(update.getSeconds())}`
  if(data.tencentUpdateTime) {
    updateStr = `数据更新时间（tencent API）：${data.tencentUpdateTime}`
  }
  let width = ctx.measureText(updateStr).width
  ctx.fillText(updateStr, 800 - 25 - width, 66)

  renderItem(
    typeName,
    ctx,
    25,
    80,
    0,
    data.currentConfirmedCount[0],
    data.currentConfirmedCount.length > 1 ? (data.currentConfirmedCount[0] - data.currentConfirmedCount[1]) : 0,
  )

  renderItem(
    typeName,
    ctx,
    275,
    80,
    1,
    data.suspectedCount ? data.suspectedCount[0] : 0,
    data.suspectedCount ?
      (data.suspectedCount.length > 1 ? (data.suspectedCount[0] - data.suspectedCount[1]) : 0) : 0,
    data.suspectedCount ? false : true
  )

  renderItem(
    typeName,
    ctx,
    525,
    80,
    2,
    data.confirmedCount[0],
    data.confirmedCount.length > 1 ? (data.confirmedCount[0] - data.confirmedCount[1]) : 0,
  )

  renderItem(
    typeName,
    ctx,
    25,
    160,
    3,
    data.curedCount[0],
    data.curedCount.length > 1 ? (data.curedCount[0] - data.curedCount[1]) : 0,
  )

  renderItem(
    typeName,
    ctx,
    275,
    160,
    4,
    data.deadCount[0],
    data.deadCount.length > 1 ? (data.deadCount[0] - data.deadCount[1]) : 0,
  )

  ctx.fillStyle = `rgba(238, 238, 238, 1)`
  ctx.fillRect(274, 105, 3, 30)
  ctx.fillRect(524, 105, 3, 30)
  ctx.fillRect(274, 185, 3, 30)
  ctx.fillRect(524, 185, 3, 30)

  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  sendImageMsgBuffer(dataBuffer, content, 'other', msg => {
    callback(msg)
  }, otherMsg, 'MF')

  // fs.writeFile(path.join(__dirname, `${content}.png`), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });
}

const renderItem = (typeName, ctx, offsetX, offsetY, type, value, yesterday, ignore = false) => {
  let typeStr = typeName
  let colorType = [
    'rgba(255,106,87,1)',
    'rgba(236,146,23,1)',
    'rgba(232,49,50,1)',
    'rgba(16,174,181,1)',
    'rgba(77,80,84,1)'
  ]

  ctx.font = `16px ${fontFamily}`
  ctx.fillStyle = 'rgba(51, 51, 51, 1)'
  let tw = ctx.measureText(typeStr[type]).width
  let tox = (250 - tw) / 2 + offsetX
  ctx.fillText(typeStr[type], tox, 23 + offsetY)


  ctx.font = `21px ${fontFamily}`
  ctx.fillStyle = colorType[type]
  let valStr = ignore ? '无数据' : value
  let vw = ctx.measureText(valStr).width
  let vox = (250 - vw) / 2 + offsetX
  ctx.fillText(valStr, vox, 57 + offsetY)


  ctx.font = `14px ${fontFamily}`
  ctx.fillStyle = 'rgba(153, 153, 153, 1)'
  let yesStr = yesterday >= 0 ? `+${yesterday}` : `${yesterday}`
  let dwa = ctx.measureText(`昨日：${yesStr}`).width
  let dox = (250 - dwa) / 2 + offsetX
  ctx.fillText('昨日：', dox, 74 + offsetY)
  let dws = ctx.measureText(`昨日：`).width
  ctx.fillStyle = colorType[type]
  ctx.fillText(yesStr, dox + dws, 74 + offsetY)

}

const init = async callback => {
  console.log('=== 初始化数据, 整理地区编码 ===')
  console.log('省市地区')
  // let res1 = await requestPromise(`http://api.tianapi.com/txapi/ncovcity/index?key=${API_KEY}`)
  // let body1 = JSON.parse(res1.body)
  // if(body1.code == 200) {
  //   let list = body1.newslist
  //   /* 添加省份 */
  //   let prov = list.map(li => {
  //     return {
  //       name: li.provinceName,
  //       type: 'prov',
  //       locationId: li.locationId
  //     }
  //   })
  //   AllArea = AllArea.concat(prov)
	//
  //   /* 添加城市 */
  //   list.forEach(li => {
  //     let city = li.cities.map(ci => {
  //       return {
  //         name: ci.cityName,
  //         locationId: ci.locationId,
  //         type: 'city',
  //         parentName: li.provinceName,
  //         parentLocationId: li.locationId
  //       }
  //     })
  //     AllArea = AllArea.concat(city)
  //   })
  //   AllArea = Array.from(new Set(AllArea))
  // } else {
  //   bindError(body1.code, callback)
  //   return
  // }
  let res2 = await requestPromise(`http://api.tianapi.com/txapi/ncovabroad/index?key=${API_KEY}`)
  console.log('国家')
  let body2 = JSON.parse(res2.body)
  if(body2.code == 200) {
    let list = body2.newslist
    /* 添加国家 */
    let abroad = list.map(li => {
      return {
        name: li.provinceName,
        type: 'abroad',
        locationId: li.locationId,
        continents: li.continents,
        code: li.countryShortCode
      }
    })
    AllArea = AllArea.concat(abroad)
    AllArea = Array.from(new Set(AllArea))
  } else {
    bindError(body2.code, callback)
    return
  }
  // console.log(AllArea)
  // console.log(AllArea.length)
}

const bindError = (code, callback) => {
  switch(code) {
    case 100:
      callback('[100]内部服务器错误')
      return
    case 110:
      callback('[110]接口暂时维护中')
      return
    case 120:
      callback('[120]IP请求来源受限')
      return
    case 130:
      callback('[130]API调用频率超限')
      return
    case 140:
      callback('[140]API没有调用权限')
      return
    case 150:
      callback('[150]接口可用次数不足')
      return
    case 160:
      callback('[160]账号未申请该接口')
      return
    case 170:
      callback('[170]Referer请求来源受限')
      return
    case 180:
      callback('[180]当前接口已被禁用')
      return
    case 230:
      callback('[230]key错误或为空')
      return
    case 240:
      callback('[240]缺少key参数')
      return
    case 250:
      callback('[250]数据查询失败')
      return
    case 260:
      callback('[260]关键词不得为空')
      return
    case 270:
      callback('[270]缺少有效数据')
      return
    case 280:
      callback('[280]缺少必要的参数')
      return
    case 290:
      callback('[290]超过资源字节限制')
      return
    default:
      callback(`Error Code:[${code}]`)
      return
  }
}

const addZero = num => num < 10 ? `0${num}` : num

const checkDate = () => {
  let DateNow = new Date().getDate()
  let rt = DateNow != updateDay
  // if(rt) {
  //   updateDay = DateNow
  // }
  return rt
}

const checkUpdate = () => {
  let DateNow = Date.now()
  let rt = (DateNow - lastUpdateTime) > 1800000
  // let rt = (DateNow - lastUpdateTime) > 10000
  // if(rt) {
  //   lastUpdateTime = DateNow
  // }
  return rt
}

module.exports = {
  cov,
}
