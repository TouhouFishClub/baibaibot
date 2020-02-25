const { formatCharacter } = require('./arkNightsCharacterDataFormat')
const {drawTxtImage} = require('../../cq/drawImageBytxt')
const { renderImage } = require('./characterImage')
const fs = require('fs-extra')
const path = require('path-extra')


module.exports = function(qq, content, callback, getData = false){
  let { akc_data, akc_other_data } = formatCharacter()

  // console.log('====')
  // console.log(Date.now())
  let sp = content.trim().replace(/ +/g, ' ').split(' '), flag = true, all_data = akc_data.concat(akc_other_data)
  let chTmp = [], skillLevel = parseInt(sp[1]) || 1
  for(var i = 0; i < all_data.length; i++){
    let akc = all_data[i]
    // console.log(sp[1])
    if(sp[0] && sp[0].trim() != '' && (new RegExp(sp[0], 'i').test(akc.name) || sp[0].toLowerCase() == akc.appellation.toLowerCase())){
      flag = false
      chTmp.push({
        name: akc.name,
        desc:`${new Array(akc.rare).fill('★').concat(new Array(6 - akc.rare).fill('　')).join('')} ${akc.name}${akc.onlyRecruit ? '（公开限定）' : ''}${akc.canRecruit ? '' : '（此干员不可以被公开招募）'}\n${akc.tag.join(' ')}`,
        skills: akc.skills,
        info: akc
      })
      // console.log(akc)
    }
  }
  // console.log(Date.now())
  if(getData) {
    if(flag) {
      callback('没有查询到此干员')
    } else {
      callback(chTmp)
    }
  } else {
    if(flag){
      callback('没有查询到此干员')
    } else {
      var words;
      var str;
      if(chTmp.length > 1){
        str = `查询到${chTmp.length}位干员，请输入具体干员名称\n${chTmp.map(x => x.name).join(' / ')}\n若精确查找干员，请使用正则表达式搜索：如arks ^红$`
        //TODO: 测试缺少的头像
        // chTmp.forEach(ch => {
        //   try{
        //     fs.readFileSync(path.join(__dirname, `chara/${ch.info.source.appellation}.png`))
        //   } catch (e) {
        //     console.log(ch.info.source.appellation)
        //   }
        // })
        drawTxtImage('',str,callback);
      } else {
        renderImage(chTmp[0], skillLevel - 1, callback)
      }
      // console.log(str)
    }
  }
}