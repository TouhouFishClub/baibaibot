const fs = require('fs-extra')
const path = require('path-extra')
let akg_init = false
let akg_data


module.exports = function(qq, content, callback) {
  if(!akg_init){
    akg_data = fs.readJsonSync(path.join(__dirname, 'data', 'gamedata_const.json'))
    akg_init = true
  }


  let { maxLevel, characterExpMap, characterUpgradeCostMap, evolveGoldCost } = akg_data
  let sp = content.trim().replace(/ +/g, ' ').split(' ')

  if(/[123456]/.test(sp[0]) && /^([012]-)?\d{1,2}$/.test(sp[1]) && /^([012]-)?\d{1,2}$/.test(sp[2])){
    let nowEvolve, nowLevel, tarEvolve, tarLevel, rare = sp[0] - 1, nowGold = 0, nowExp = 0
    if(sp[1].split('-').length == 2){
      nowEvolve = parseInt(sp[1].split('-')[0])
      nowLevel = parseInt(sp[1].split('-')[1]) - 1
    } else {
      nowEvolve = 0
      nowLevel = parseInt(sp[1].split('-')[0]) - 1
    }
    if(sp[2].split('-').length == 2){
      tarEvolve = parseInt(sp[2].split('-')[0])
      tarLevel = parseInt(sp[2].split('-')[1]) - 1
    } else {
      tarEvolve = 0
      tarLevel = parseInt(sp[2].split('-')[0]) - 1
    }
    if(sp[3] && /^\d+$/.test(sp[3])){
      nowGold = sp[3]
    }
    if(sp[4] && /^\d+,\d+,\d+,\d+$/.test(sp[4])){
      nowExp = sp[4].split(',').reduce((p, c, i) => p +[200, 400, 1000, 2000][i] * c, 0)
    }
    if(tarEvolve * 100 + parseInt(tarLevel) > nowEvolve * 100 + parseInt(nowLevel)){
      if(maxLevel[rare][nowEvolve] && maxLevel[rare][tarEvolve]){
        if(nowLevel > maxLevel[rare][nowEvolve]){
          nowLevel = maxLevel[rare][nowEvolve] - 1
        }
        if(tarLevel > maxLevel[rare][tarEvolve]) {
          tarLevel = maxLevel[rare][tarEvolve] - 1
        }
        let exp = calc(characterExpMap, maxLevel[rare], tarEvolve, tarLevel) - calc(characterExpMap, maxLevel[rare], nowEvolve, nowLevel),
          gold = calc(characterUpgradeCostMap, maxLevel[rare], tarEvolve, tarLevel) - calc(characterUpgradeCostMap, maxLevel[rare], nowEvolve, nowLevel),
          upgrade = evolveGoldCost[rare].slice(nowEvolve, tarEvolve).reduce((p, e) => p + e),
          cExp = exp - nowExp < 0 ? 0 : exp - nowExp,
          lsCount = Math.ceil(cExp / 7400),
          cGold = gold + upgrade - lsCount * 360 - nowGold < 0 ? 0 : gold + upgrade - lsCount * 360 - nowGold,
          ceCount = Math.ceil(cGold / 7500),
          lsAp = lsCount * 30,
          ceAp = ceCount * 30
        callback(`[CQ:at,qq=${qq}]\n【体力总计】\n${lsAp + ceAp} = ${lsAp} + ${ceAp}\n【经验】\n${cExp} = ${exp} - ${nowExp}\n【LS体力(场数)】\n${lsAp} = 30 * ${lsCount}\n【金币】\n${cGold} = ${gold + upgrade} - ${lsCount * 360 + parseInt(nowGold)}\n【CE体力(场数)】\n${ceAp} = 30 * ${ceCount}\n【升级金币】\n${gold}\n【精英化金币】\n${upgrade}`)
      } else {
        callback('[CQ:at,qq=${qq}]输入错误')
      }
    } else {
      callback('[CQ:at,qq=${qq}]目标等级必须小于当前等级')
    }
  } else {
    callback('[CQ:at,qq=${qq}]请输入正确的信息')
  }
}

const calc = (dataMap, rareMaxLevelMap, targetEvolve, targetLevel) =>
  rareMaxLevelMap.slice(0, targetEvolve + 1).reduce((sum, current, index) =>
    sum + dataMap[index].slice(0, index == targetEvolve ? targetLevel  : current - 1).reduce((p, c) => p + c, 0), 0)