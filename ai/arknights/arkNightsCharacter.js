const { formatCharacter } = require('./arkNightsCharacterDataFormat')
const aks = require('./arkNightsSkill')

module.exports = function(qq, content, callback){
  let { akc_data, akc_other_data } = formatCharacter()

  let sp = content.trim().replace(/ +/g, ' ').split(' '), flag = true, all_data = akc_data.concat(akc_other_data)
  let chTmp = []
  for(var i = 0; i < all_data.length; i++){
    let akc = all_data[i], skillLevel = parseInt(sp[1]) || 1
    // console.log(sp[1])
    if(sp[0] && sp[0].trim() != '' && new RegExp(sp[0], 'i').test(akc.name)){
      flag = false
      chTmp.push({
        name: akc.name,
        desc:`${new Array(akc.rare).fill('★').concat(new Array(6 - akc.rare).fill('　')).join('')} ${akc.name}${akc.onlyRecruit ? '（公开限定）' : ''}${akc.canRecruit ? '' : '（此干员不可以被公开招募）'}\n${akc.tag.join(' ')}`,
        skills: akc.skills.map(skill => aks(skill, skillLevel - 1))
      })

      // console.log(akc.skills)
    }
  }
  if(flag){
    callback('没有查询到此干员')
  } else {
    if(chTmp.length > 1){
      callback(`查询到复数干员，请输入具体干员名称\n${chTmp.map(x => x.name).join(' / ')}`)
    } else {
      callback(`${chTmp.map(x => `${x.desc}\n${x.skills.join('\n')}`).join('\n\n')}`)
    }
  }

}