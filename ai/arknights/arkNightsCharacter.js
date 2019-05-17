const { formatCharacter } = require('./arkNightsCharacterDataFormat')

module.exports = function(qq, content, callback){
  let { akc_data, akc_other_data } = formatCharacter()

  let sp = content.trim().replace(/ +/g, ' ').split(' '), flag = true, all_data = akc_data.concat(akc_other_data)
  let chTmp = []
  for(var i = 0; i < all_data.length; i++){
    let akc = all_data[i]
    // console.log(sp[1])
    if(sp[0] && sp[0].trim() != '' && new RegExp(sp[0], 'i').test(akc.name)){
      flag = false
      chTmp.push({
        name: akc.name,
        desc:`${new Array(akc.rare).fill('★').concat(new Array(6 - akc.rare).fill('　')).join('')} ${akc.name}${akc.onlyRecruit ? '（公开限定）' : ''}\n${akc.tag.join(' ')}${akc.canRecruit ? '' : '\n此干员不可以被公开招募'}`
      })
    }
  }
  if(flag){
    callback('没有查询到此干员')
  } else {
    if(chTmp.length > 2){
      callback(`查询到复数干员，请输入具体干员名称\n${chTmp.map(x => x.name).join(' / ')}`)
    } else {
      callback(`${chTmp.map(x => x.desc).join('\n\n')}`)
    }
  }

}