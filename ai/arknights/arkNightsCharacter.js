const { formatCharacter } = require('./arkNightsCharacterDataFormat')
const aks = require('./arkNightsSkill')
const {drawTxtImage} = require('../../cq/drawImageBytxt')


module.exports = function(qq, content, callback){
  let { akc_data, akc_other_data } = formatCharacter()

  console.log('====')
  console.log(Date.now())
  let sp = content.trim().replace(/ +/g, ' ').split(' '), flag = true, all_data = akc_data.concat(akc_other_data)
  let chTmp = [], skillLevel = parseInt(sp[1]) || 1
  for(var i = 0; i < all_data.length; i++){
    let akc = all_data[i]
    // console.log(sp[1])
    if(sp[0] && sp[0].trim() != '' && new RegExp(sp[0], 'i').test(akc.name)){
      flag = false
      chTmp.push({
        name: akc.name,
        desc:`${new Array(akc.rare).fill('★').concat(new Array(6 - akc.rare).fill('　')).join('')} ${akc.name}${akc.onlyRecruit ? '（公开限定）' : ''}${akc.canRecruit ? '' : '（此干员不可以被公开招募）'}\n${akc.tag.join(' ')}`,
        skills: akc.skills
      })
      // console.log(akc)
    }
  }
  console.log(Date.now())
  if(flag){
    callback('没有查询到此干员')
  } else {
    var words;
    var str;
    if(chTmp.length > 1){
      str = `查询到${chTmp.length}位干员，请输入具体干员名称\n${chTmp.map(x => x.name).join(' / ')}\n若精确查找干员，请使用正则表达式搜索：如arks ^红$`
    } else {
      str = `${chTmp.map(x => `${x.desc}\n${x.skills.map(skill => aks(skill, skillLevel - 1)).join('\n')}`).join('\n\n')}`
    }
    console.log(str)
    drawTxtImage('',str,callback);
  }
}