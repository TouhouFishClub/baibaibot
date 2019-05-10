const fs = require('fs-extra')
const path = require('path-extra')
const _ = require('lodash')
const male = [
  'Castle-3',
  '黑角',
  '巡林者',
  '12F',
  '安德切尔',
  '史都华德',
  '安赛尔',
  '角峰',
  '讯使',
  '银灰',
]
const type = {
  "WARRIOR": "近卫干员",
  "SNIPER": "狙击干员",
  "TANK": "重装干员",
  "MEDIC": "医疗干员",
  "SUPPORT": "辅助干员",
  "CASTER": "术师干员",
  "SPECIAL": "特种干员",
  "PIONEER": "先锋干员",
}
const ignore = ['医疗探机', '触手', '幻影', '机械水獭']
const canRecruit = [
  'Lancet-2', 'Castle-3', '夜刀', '黑角', '巡林者', '杜林', '12F', '安德切尔', "芬", "香草", "翎羽", "玫兰莎", "米格鲁", "克洛丝", "炎熔", "芙蓉", "安赛尔", "史都华德", "梓兰", "艾丝黛尔", "夜烟", "远山", "杰西卡", "流星", "白雪", "清道夫", "红豆", "杜宾", "缠丸", "霜叶", "慕斯", "砾", "暗索", "末药", "调香师", "角峰", "蛇屠箱", "古米", "地灵", "阿消", "因陀罗", "火神", "白面鸮", "凛冬", "德克萨斯", "幽灵鲨", "蓝毒", "白金", "陨星", "梅尔", "赫默", "华法琳", "临光", "红", "雷蛇", "可颂", "普罗旺斯", "守林人", "崖心", "初雪", "真理", "狮蝎", "食铁兽", "能天使", "推进之王", "伊芙利特", "闪灵", "夜莺", "星熊", "塞雷娅", "银灰"
]
const onlyRecruit = ['Lancet-2', 'Castle-3', '夜刀', '黑角', '巡林者', '杜林', '12F', '安德切尔', '艾丝黛尔', '因陀罗', '火神']
const tags = ["近卫干员", "狙击干员", "重装干员", "医疗干员", "辅助干员", "术师干员", "特种干员", "先锋干员", "近战位", "远程位", "高级资深干员", "男性干员", "女性干员", "资深干员", "治疗", "支援", "新手", "费用回复", "输出", "生存", "防护", "群攻", "减速", "削弱", "快速复活", "位移", "召唤", "控场", "爆发"]

const simMap = tag => {
  switch(tag){
    case "近卫":
      return "近卫干员"
    case "狙击":
      return "狙击干员"
    case "重装":
      return "重装干员"
    case "医疗":
      return "医疗干员"
    case "辅助":
      return "辅助干员"
    case "术师":
    case "术士":
    case "术士干员":
      return "术师干员"
    case "特种":
      return "特种干员"
    case "先锋":
      return "先锋干员"
    case "男性":
      return "男性干员"
    case "女性":
      return "女性干员"
    case "高级":
    case "高资":
    case "高级资深":
      return "高级资深干员"
    case "资深":
      return "资深干员"
    case "近战":
      return "近战位"
    case "远程":
      return "远程位"
    case "回复":
      return "费用回复"
    case "复活":
      return "快速复活"
    default:
      return tag
  }
}

let akc_init = false
let akc_data = []
let akg_init = false
let akg_data


module.exports = function(content, callback) {
  if(!akc_init){
    Object.values(fs.readJsonSync(path.join(__dirname, 'data', 'character_table.json'))).forEach(ch => {
      if(ch.rarity >= 2 && !hasTarget(ignore, ch.name)){
        akc_data.push({
          name: ch.name,
          tag: ([type[ch.profession], ch.position, hasTarget(male, ch.name) ? '男性干员' : '女性干员']).concat(ch.rarity == 4 ? ['资深干员']: ch.rarity == 5 ? ['高级资深干员'] : []).concat(ch.tagList || []),
          rare: ch.rarity + 1,
          canRecruit: hasTarget(canRecruit, ch.name)
        })
      }
    })
    akc_init = true
    // console.log(akc_data)
  }
  if(!akg_init){
    akg_data = fs.readJsonSync(path.join(__dirname, 'data', 'gamedata_const.json'))
    akg_init = true
  }
  let { maxLevel, characterExpMap, characterUpgradeCostMap, evolveGoldCost } = akg_data
  let sp = content.trim().replace(/ +/g, ' ').split(' ').map(s => simMap(s)), ignoreLevel = 2
  // if(sp[0].toLowerCase() == 'e'){
  //   sp = sp.slice(1)
  //   if(/[123456]/.test(sp[0]) && /^([012]-)?\d{1,2}$/.test(sp[1]) && /^([012]-)?\d{1,2}$/.test(sp[2])){
  //     let nowEvolve, nowLevel, tarEvolve, tarLevel, rare = sp[0]
  //     if(sp[1].split('-').length == 2){
  //       nowEvolve = parseInt(sp[1].split('-')[0])
  //       nowLevel = parseInt(sp[1].split('-')[1])
  //     } else {
  //       nowEvolve = 0
  //       nowLevel = parseInt(sp[1].split('-')[0])
  //     }
  //     if(sp[2].split('-').length == 2){
  //       tarEvolve = parseInt(sp[2].split('-')[0])
  //       tarLevel = parseInt(sp[2].split('-')[1])
  //     } else {
  //       tarEvolve = 0
  //       tarLevel = parseInt(sp[2].split('-')[0])
  //     }
  //     if(tarEvolve * 100 + parseInt(tarLevel) > nowEvolve * 100 + parseInt(nowLevel)){
  //       if(maxLevel[rare - 1][nowEvolve] && maxLevel[rare - 1][tarEvolve]){
  //         if(nowLevel > maxLevel[rare - 1][nowEvolve]){
  //           nowLevel = maxLevel[rare][nowEvolve]
  //         }
  //         if(tarLevel > maxLevel[rare - 1][tarEvolve]) {
  //           tarLevel = maxLevel[rare - 1][tarEvolve]
  //         }
  //
  //         function calc(rare, evolve, level, isExp){
  //           let
  //           for(var i = 0; i <= evolve; i++){
  //             if(i == evolve){
  //
  //             } else {
  //
  //             }
  //           }
  //         }
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //       } else {
  //         callback('输入错误')
  //       }
  //     } else {
  //       callback('目标必须小于当前')
  //     }
  //   } else {
  //     callback('请输入正确的信息')
  //   }
  //   return
  // }

  if(/\d/.test(sp[0])){
    ignoreLevel = sp[0]
    sp = checkTags(sp.slice(1))
  }
  if(ignoreLevel > sp.length){
    ignoreLevel = sp.length
  }
  if(sp[0].toLowerCase() == 's'){
    let ac = sp[1], flag = true
    for(var i = 0; i < akc_data.length; i++){
      let akc = akc_data[i]
      if(akc.name == sp[1]){
        flag = false
        callback(`${new Array(akc.rare).fill('★').concat(new Array(6 - akc.rare).fill('　')).join('')} ${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}\n${akc.tag.join(' ')}${akc.canRecruit ? '' : '\n此干员不可以被公开招募'}`)
      }
    }
    if(flag){
      callback('没有查询到此干员')
    }
  } else {
    let tg = checkTags(sp)
    if(tg.length == 0){
      callback('请输入至少1个有效tag')
    } else if(tg.length == 1 && tg[0] == ''){
      callback('请输入至少1个有效tag')
    } else if(tg.length > 5){
      callback('请输入不大于5个tag')
    } else {
      let akc_tmp = []
      akc_data.forEach(akc => {
        if(akc.canRecruit){
          let st = [], level = 0
          tg.forEach(t => {
            if(hasTarget(akc.tag, t)){
              st.push(t)
              level ++
            }
          })
          if(st.length && st.length >= ignoreLevel){
            if(akc.rare == 6){
              if(hasTarget(tg, '高级资深干员')){
                akc_tmp.push({
                  name: `${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}`,
                  onlyRecruit: hasTarget(onlyRecruit, akc.name),
                  level: level,
                  tags: markTags(akc.tag, st),
                  tagGroup: st.sort().join(' + '),
                  rare: akc.rare
                })
              }
            } else {
              akc_tmp.push({
                name: `${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}`,
                onlyRecruit: hasTarget(onlyRecruit, akc.name),
                level: level,
                tags: markTags(akc.tag, st),
                tagGroup: st.sort().join(' + '),
                rare: akc.rare
              })
            }
          }
        }
      })

      console.log(akc_tmp)

      // console.log(ignoreLevel)
      if(ignoreLevel < 2){
        if(akc_tmp.length > 10){
          callback('搜索到大量干员，请输入其他tag')
        } else {
          callback(akc_tmp.sort((a, b) => b.level - a.level).map(c => `${new Array(c.rare).fill('★').concat(new Array(6 - c.rare).fill('　')).join('')} ${c.name}\n${c.tags.join(' ')}`).join('\n') || '没有查询到相关干员')
        }
      } else {
        if(akc_tmp.length == 0){
          callback('没有查询到相关干员')
          return
        }
        let ak_group = {}, outStr = '查询到以下组合'
        akc_tmp.forEach(ak => {
          if(!ak_group[ak.tagGroup]){
            let spl, spa
            switch (ak.tagGroup.split(' + ').length) {
              case 2:
                ak_group[ak.tagGroup] = {
                  characters: [],
                  rare_6_count: 0,
                  rare_5_count: 0,
                  rare_4_count: 0,
                  rare_3_count: 0,
                }
                break
              case 3:
                ak_group[ak.tagGroup] = {
                  characters: [],
                  rare_6_count: 0,
                  rare_5_count: 0,
                  rare_4_count: 0,
                  rare_3_count: 0,
                }
                spl = ak.tagGroup.split(' + ')
                spa = [
                  [spl[0], spl[1]].sort().join(' + '),
                  [spl[0], spl[2]].sort().join(' + '),
                  [spl[1], spl[2]].sort().join(' + ')
                ]
                spa.forEach(tg => {
                  if(!ak_group[tg]){
                    ak_group[tg] = {
                      characters: [],
                      rare_6_count: 0,
                      rare_5_count: 0,
                      rare_4_count: 0,
                      rare_3_count: 0,
                    }
                  }
                })
                break
              case 4:
                spl = ak.tagGroup.split(' + ')
                spa = [
                  [spl[0], spl[1]].sort().join(' + '),
                  [spl[0], spl[2]].sort().join(' + '),
                  [spl[0], spl[3]].sort().join(' + '),
                  [spl[1], spl[2]].sort().join(' + '),
                  [spl[1], spl[3]].sort().join(' + '),
                  [spl[2], spl[3]].sort().join(' + '),
                  [spl[0], spl[1], spl[2]].sort().join(' + '),
                  [spl[0], spl[1], spl[3]].sort().join(' + '),
                  [spl[0], spl[2], spl[3]].sort().join(' + '),
                  [spl[1], spl[2], spl[3]].sort().join(' + ')
                ]
                spa.forEach(tg => {
                  if(!ak_group[tg]){
                    ak_group[tg] = {
                      characters: [],
                      rare_6_count: 0,
                      rare_5_count: 0,
                      rare_4_count: 0,
                      rare_3_count: 0,
                    }
                  }
                })
                break
              case 5:
                spl = ak.tagGroup.split(' + ')
                spa = [
                  [spl[0], spl[1]].sort().join(' + '),
                  [spl[0], spl[2]].sort().join(' + '),
                  [spl[0], spl[3]].sort().join(' + '),
                  [spl[0], spl[4]].sort().join(' + '),
                  [spl[1], spl[2]].sort().join(' + '),
                  [spl[1], spl[3]].sort().join(' + '),
                  [spl[1], spl[4]].sort().join(' + '),
                  [spl[2], spl[3]].sort().join(' + '),
                  [spl[2], spl[4]].sort().join(' + '),
                  [spl[3], spl[4]].sort().join(' + '),
                  [spl[0], spl[1], spl[2]].sort().join(' + '),
                  [spl[0], spl[1], spl[3]].sort().join(' + '),
                  [spl[0], spl[1], spl[4]].sort().join(' + '),
                  [spl[0], spl[2], spl[3]].sort().join(' + '),
                  [spl[0], spl[2], spl[4]].sort().join(' + '),
                  [spl[0], spl[3], spl[4]].sort().join(' + '),
                  [spl[1], spl[2], spl[3]].sort().join(' + '),
                  [spl[1], spl[2], spl[4]].sort().join(' + '),
                  [spl[1], spl[3], spl[4]].sort().join(' + '),
                  [spl[2], spl[3], spl[4]].sort().join(' + ')
                ]
                spa.forEach(tg => {
                  if(!ak_group[tg]){
                    ak_group[tg] = {
                      characters: [],
                      rare_6_count: 0,
                      rare_5_count: 0,
                      rare_4_count: 0,
                      rare_3_count: 0,
                    }
                  }
                })
                break
            }
          }
        })

        let all_character_count = 0
        Object.keys(ak_group).forEach(tg => {
          akc_tmp.forEach(ak => {
            if(pertainTags(tg.split(' + '), ak.tagGroup.split(' + '))){
              ak_group[tg].characters.push(ak)
              ak_group[tg][`rare_${ak.rare}_count`]++
              all_character_count ++
            }
          })
        })
        // console.log(ak_group)
        let excellentTagGroup = {}
        Object.keys(ak_group).forEach(tg => {
          if(ak_group[tg].rare_3_count == 0){
            excellentTagGroup[tg] = Object.assign({}, ak_group[tg])
            delete ak_group[tg]
          }
        })
        // console.log('-=-=-=-=-=-=-=-=-')
        // console.log(excellentTagGroup)
        // console.log(ak_group)

        outStr += all_character_count > 20 ? '，仅显示5星以上及公开限定干员\n' : '\n'


        Object.keys(excellentTagGroup).sort((a, b) => b.split(' + ').length - a.split(' + ').length).forEach(key => {
          outStr += `【${key}】<<< 仅出现4星以上干员\n`
          excellentTagGroup[key].characters.sort((a, b) => b.rare -  a.rare)
          excellentTagGroup[key].characters.forEach(ak => {
            outStr += `${new Array(ak.rare).fill('★').concat(new Array(6 - ak.rare).fill('　')).join('')} ${ak.name}\n`
          })
        })

        Object.keys(ak_group).sort((a, b) => b.split(' + ').length - a.split(' + ').length).forEach(key => {
          outStr += `【${key}】\n`
          ak_group[key].characters.sort((a, b) => b.rare -  a.rare)
          if(all_character_count > 20){
            ak_group[key].characters.forEach(ak => {
              switch(ak.rare){
                case 6:
                case 5:
                  outStr += `${new Array(ak.rare).fill('★').concat(new Array(6 - ak.rare).fill('　')).join('')} ${ak.name}\n`
                  break
                case 4:
                  if(ak.onlyRecruit){
                    outStr += `${new Array(ak.rare).fill('★').concat(new Array(6 - ak.rare).fill('　')).join('')} ${ak.name}\n`
                  }
                  break
                case 3:
                  if(ak.onlyRecruit){
                    outStr += `${new Array(ak.rare).fill('★').concat(new Array(6 - ak.rare).fill('　')).join('')} ${ak.name}\n`
                  }
                  break
              }
            })
            if(ak_group[key].rare_4_count){
              outStr += `4星干员数量： ${ak_group[key].rare_4_count}\n`
            }
            if(ak_group[key].rare_3_count){
              outStr += `3星干员数量： ${ak_group[key].rare_3_count}\n`
            }
          } else {
            ak_group[key].characters.forEach(ak => {
              outStr += `${new Array(ak.rare).fill('★').concat(new Array(6 - ak.rare).fill('　')).join('')} ${ak.name}\n`
            })
          }
        })
        callback(outStr)
      }
    }
  }
}

const hasTarget = (arr, target) => arr.findIndex(e => e == target) > -1
const checkTags = arr => arr.filter(t => hasTarget(tags, t))
const markTags = (arr, tars) => arr.concat([]).map(t => hasTarget(tars, t) ? `【${t}】`: t)
const pertainTags = (tar, tag) => Array.from(new Set(tar.concat(tag))).length <= tag.length