const fs = require('fs-extra')
const path = require('path-extra')

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

let akc_init = false
let akc_data = []
let akc_other_data = []

const formatCharacter = () => {
  if(!akc_init){
    Object.values(fs.readJsonSync(path.join(__dirname, 'data', 'character_table.json'))).forEach(ch => {
      if(!hasTarget(ignore, ch.name)){
        let data = {
          name: ch.name,
          tag: ([type[ch.profession], ch.position, hasTarget(male, ch.name) ? '男性干员' : '女性干员']).concat(ch.rarity == 4 ? ['资深干员']: ch.rarity == 5 ? ['高级资深干员'] : []).concat(ch.tagList || []),
          rare: ch.rarity + 1,
          canRecruit: hasTarget(canRecruit, ch.name),
          onlyRecruit: hasTarget(onlyRecruit, ch.name),
        }
        if(ch.rarity >= 2){
          akc_data.push(data)
        } else {
          akc_other_data.push(data)
        }
      }
    })
    akc_init = true
    // console.log(akc_data)
  }
  return {
    akc_data: akc_data,
    akc_other_data: akc_other_data,
  }
}


const hasTarget = (arr, target) => arr.findIndex(e => e == target) > -1
const checkTags = arr => arr.filter(t => hasTarget(tags, t))
const markTags = (arr, tars) => arr.concat([]).map(t => hasTarget(tars, t) ? `【${t}】`: t)
const pertainTags = (tar, tag) => Array.from(new Set(tar.concat(tag))).length <= tag.length

module.exports = {
  formatCharacter,
  hasTarget,
  checkTags,
  markTags,
  pertainTags,
  onlyRecruit,
}