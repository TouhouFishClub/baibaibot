const fs = require('fs-extra')
const path = require('path-extra')
const anch = require('./arkNightsHandbookInfo')
const anrl = require('./arkNightsRecruitLimit')

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
const canRecruit = anrl()
const onlyRecruit = ['Lancet-2', 'Castle-3', '夜刀', '黑角', '巡林者', '杜林', '12F', '安德切尔', '艾丝黛尔', '因陀罗', '火神']
const tags = ["近卫干员", "狙击干员", "重装干员", "医疗干员", "辅助干员", "术师干员", "特种干员", "先锋干员", "近战位", "远程位", "高级资深干员", "男性干员", "女性干员", "资深干员", "治疗", "支援", "新手", "费用回复", "输出", "生存", "防护", "群攻", "减速", "削弱", "快速复活", "位移", "召唤", "控场", "爆发"]

let akc_init = false
let akc_data = []
let akc_other_data = []
let akc_patch_data = []

const formatCharacter = () => {
  if(!akc_init){
    Object.values(fs.readJsonSync(path.join(__dirname, 'data', 'character_table.json'))).forEach(ch => {
      if(!hasTarget(ignore, ch.name) && (ch.potentialItemId || ch.name == '断罪者' || ch.name == '罗小黑')){
        let pubId = ch.phases[0].characterPrefabKey
        // console.log(pubId)
        if(anch(pubId)) {
          let storyText = anch(pubId).storyTextAudio[0].stories[0].storyText
          let sex = storyText.substr(storyText.indexOf('性别】') + 3, 1)
          let data = {
            name: ch.name,
            pid: ch.potentialItemId,
            pubId: pubId,
            sex: sex,
            tag: ([type[ch.profession], ch.position == 'RANGED' ? '远程位' : '近战位', sex == '男' ? '男性干员' : '女性干员']).concat(ch.rarity == 4 ? ['资深干员']: ch.rarity == 5 ? ['高级资深干员'] : []).concat(ch.tagList || []),
            rare: ch.rarity + 1,
            canRecruit: hasTarget(canRecruit, ch.name),
            onlyRecruit: hasTarget(onlyRecruit, ch.name),
            skills: ch.skills.map(x => x.skillId),
            appellation: ch.appellation,
            displayLogo: ch.displayLogo,
            profession: ch.profession,
            source: ch,
          }
          if(ch.rarity >= 2){
            akc_data.push(data)
          } else {
            akc_other_data.push(data)
          }
        }
      }
    })
    let {patchChars ,patchDetailInfoList} = fs.readJsonSync(path.join(__dirname, 'data', 'char_patch_table.json'))
    Object.values(patchChars).forEach(ch => {
      if(!hasTarget(ignore, ch.name) && (ch.potentialItemId || ch.name == '暴行' || ch.name == '断罪者')){
        let pubId = ch.potentialItemId ? ch.potentialItemId.substring(2) : ch.phases[0].characterPrefabKey
        // console.log(pubId)
        if(anch(pubId)) {
          let storyText = anch(pubId).storyTextAudio[0].stories[0].storyText
          let sex = storyText.substr(storyText.indexOf('性别】') + 3, 1)
          let data = {
            name: `${ch.name}/${patchDetailInfoList[ch.phases[0].characterPrefabKey].infoParam}`,
            pid: ch.potentialItemId,
            pubId: pubId,
            sex: sex,
            tag: ([type[ch.profession], ch.position == 'RANGED' ? '远程位' : '近战位', sex == '男' ? '男性干员' : '女性干员']).concat(ch.rarity == 4 ? ['资深干员']: ch.rarity == 5 ? ['高级资深干员'] : []).concat(ch.tagList || []),
            rare: ch.rarity + 1,
            canRecruit: hasTarget(canRecruit, ch.name),
            onlyRecruit: hasTarget(onlyRecruit, ch.name),
            skills: ch.skills.map(x => x.skillId),
            appellation: ch.appellation,
            displayLogo: ch.displayLogo,
            profession: ch.profession,
            source: ch,
          }
          akc_patch_data.push(data)
          // if(ch.rarity >= 2){
          //   akc_data.push(data)
          // } else {
          //   akc_other_data.push(data)
          // }
        }
      }
    })
    // console.log(akc_patch_data)
    akc_init = true
    // console.log(akc_data)
  }
  return {
    akc_data: akc_data,
    akc_other_data: akc_other_data,
    akc_patch_data: akc_patch_data,
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