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
      return "术师干员"
    case "特种":
      return "特种干员"
    case "先锋":
      return "先锋干员"
    case "男性":
      return "男性干员"
    case "女性":
      return "女性干员"
    case "高级资深":
      return "高级资深干员"
    case "资深":
      return "资深干员"
    case "近战":
      return "近战位"
    case "远程":
      return "远程位"
    default:
      return tag
  }
}

let akc_init = false
let akc_data = []


module.exports = function(content, callback) {
  if(!akc_init){
    Object.values(fs.readJsonSync(path.join(__dirname, 'data', 'character_table.json'))).forEach(ch => {
      if(ch.rarity >= 2 && !hasTarget(ignore, ch.name) && hasTarget(canRecruit, ch.name)){
        akc_data.push({
          name: ch.name,
          tag: ([type[ch.profession], ch.position, hasTarget(male, ch.name) ? '男性干员' : '女性干员']).concat(ch.rarity == 4 ? ['资深干员']: ch.rarity == 5 ? ['高级资深干员'] : []).concat(ch.tagList || []),
          rare: ch.rarity + 1
        })
      }
    })
    akc_init = true
    // console.log(akc_data)
  }
  let sp = content.trim().split(' ').map(s => simMap(s)), ignoreLevel = 2
  if(/\d/.test(sp[0])){
    ignoreLevel = sp[0]
    sp = sp.slice(1)
  }
  if(sp.length > 5){
    callback('请输入不大于5个tag')
  } else {
    let tg = checkTags(sp), akc_tmp = []
    akc_data.forEach(akc => {
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
              name: akc.name,
              level: level,
              tags: markTags(akc.tag, st)
            })
          }
        } else {
          akc_tmp.push({
            rare: akc.rare,
            name: `${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}`,
            level: level,
            tags: markTags(akc.tag, st)
          })
        }
      }
    })
    callback(akc_tmp.sort((a, b) => b.level - a.level).map(c => `${c.name} ${new Array(c.rare).fill('★').join('')}\n${c.tags.join(' ')}`).join('\n'))
  }

}

const hasTarget = (arr, target) => arr.findIndex(e => e == target) > -1
const checkTags = arr => arr.filter(t => hasTarget(tags, t))
const markTags = (arr, tars) => arr.concat([]).map(t => hasTarget(tars, t) ? `【${t}】`: t)
















