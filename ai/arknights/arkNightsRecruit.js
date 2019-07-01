const fs = require('fs-extra')
const path = require('path-extra')
const _ = require('lodash')
const { baiduocr } = require('../image/baiduocr');
const { formatCharacter, hasTarget, checkTags, markTags, pertainTags, onlyRecruit } = require('./arkNightsCharacterDataFormat')
const {drawTxtImage} = require('../../cq/drawImageBytxt')

const { renderImage } = require('./recruitImage')


const excellentTags = ["位移", "召唤", "控场", "爆发", "快速复活", "削弱", "支援", "特种干员"]

const simMap = tag => {
  switch(tag){
    case "近卫":
      return "近卫干员"
    case "狙击":
    case "组击干员":
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
    case "恢复":
      return "费用回复"
    case "复活":
      return "快速复活"
    default:
      return tag
  }
}

// let akc_init = false
// let akc_data = []
// let akc_other_data = []

module.exports = function(qq, content, callback){
  let con = content.trim()
  if(con == '高级资深处男'){
    renderImage(con, {
      '高级资深处男': {
        '6': [{
          name: 'ywwuyi',
          showName: `ywwuyi（公开限定）`,
          onlyRecruit: true,
          level: 1,
          tags: '',
          tagGroup: ['gaoji', 'chunan'],
          rare: 6,
          appellation: '1551',
          displayLogo: 'logo_rhodes',
          profession: 'CASTER',
        }],
        '5': [],
        '4': [],
        '3': [],
      }
    }, data => {
      callback(`[CQ:at,qq=${qq}]\n${`【${con}】\n查询到以下组合`}\n${data}`)
    })
    return
  }
  let n = content.indexOf('[CQ:image,')
  if(n > -1){
    content.substr(n).split(',').forEach(p => {
      let sp = p.split('=')
      if(sp[0] == 'url'){
        // console.log(sp[1])
        baiduocr(sp[1], d => {
          console.log('----')
          arkNight(qq, checkTags(d.split('\n').map(t => simMap(t))).join(' '), callback)
        })
      }
    })
  } else {
    arkNight(qq, content, callback)
  }
}

function arkNight(qq, content, callback) {
  let sp = content.trim().replace(/ +/g, ' ').split(' ').map(s => simMap(s)), ignoreLevel = 2

  // console.log(Date.now())
  let { akc_data, akc_other_data } = formatCharacter()

  // console.log('===============')
  // console.log(Date.now())
  if(/\d/.test(sp[0])){
    ignoreLevel = sp[0]
    sp = checkTags(sp.slice(1))
  }
  if(ignoreLevel > sp.length){
    ignoreLevel = sp.length
  }
  let tg = checkTags(Array.from(new Set(sp)))
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
                name: akc.name,
                showName: `${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}`,
                onlyRecruit: hasTarget(onlyRecruit, akc.name),
                level: level,
                tags: markTags(akc.tag, st),
                tagGroup: st.sort().join(' + '),
                rare: akc.rare,
                appellation: akc.appellation,
                displayLogo: akc.displayLogo,
                profession: akc.profession,
              })
            }
          } else {
            akc_tmp.push({
              name: akc.name,
              showName: `${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}`,
              onlyRecruit: hasTarget(onlyRecruit, akc.name),
              level: level,
              tags: markTags(akc.tag, st),
              tagGroup: st.sort().join(' + '),
              rare: akc.rare,
              appellation: akc.appellation,
              displayLogo: akc.displayLogo,
              profession: akc.profession,
            })
          }
        }
      }
    })

    // console.log(akc_tmp)

    // console.log(ignoreLevel)
    if(ignoreLevel < 2){
      /* single tag */
      if(akc_tmp.length > 10){
        callback(`搜索到${akc_tmp.length}位干员，请尝试输入其他tag`)
      } else {
        var str = akc_tmp.sort((a, b) => b.level - a.level).map(c => `${new Array(c.rare).fill('★').concat(new Array(6 - c.rare).fill('　')).join('')} ${c.showName}\n${c.tags.join(' ')}`).join('\n') || '没有查询到相关干员'
        // console.log(str)
        drawTxtImage('',str,callback)
      }
    } else {
      /* multiple tags */
      let ak_group = {}, outStr = `【${tg.join(', ')}】\n查询到以下组合`
      akc_tmp.forEach(ak => {
        if(!ak_group[ak.tagGroup]){
          let spl, spa
          switch (ak.tagGroup.split(' + ').length) {
            case 2:
              ak_group[ak.tagGroup] = {
                // characters: [],
                '6': [],
                '5': [],
                '4': [],
                '3': [],
              }
              break
            case 3:
              ak_group[ak.tagGroup] = {
                // characters: [],
                '6': [],
                '5': [],
                '4': [],
                '3': [],
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
                    // characters: [],
                    '6': [],
                    '5': [],
                    '4': [],
                    '3': [],
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
                    // characters: [],
                    '6': [],
                    '5': [],
                    '4': [],
                    '3': [],
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
                    // characters: [],
                    '6': [],
                    '5': [],
                    '4': [],
                    '3': [],
                  }
                }
              })
              break
          }
        }
      })
      // console.log(akc_data)

      // console.log(ak_group)
      let all_character_count = 0, all_character = []
      Object.keys(ak_group).forEach(tg => {
        akc_tmp.forEach(ak => {
          if(pertainTags(tg.split(' + '), ak.tagGroup.split(' + '))){
            // ak_group[tg].characters.push(ak)
            // console.log(ak_group[tg])
            ak_group[tg][`${ak.rare}`].push(ak)
            all_character_count ++
            all_character.push(ak.name)
          }
        })
      })

      let excellentTagGroup = {}
      Object.keys(ak_group).forEach(tg => {
        if(ak_group[tg]['3'] == 0){
          excellentTagGroup[tg] = Object.assign({}, ak_group[tg])
          delete ak_group[tg]
        }
      })


      sp.forEach(tag => {
        if(hasTarget(excellentTags, tag)){
          let cs = {
            '6': [],
            '5': [],
            '4': [],
            '3': [],
          }
          akc_data.forEach(akc => {
            if(akc.canRecruit && hasTarget(akc.tag, tag) && akc.rare < 6){
              cs[`${akc.rare}`].push({
                name: akc.name,
                showName: `${akc.name}${hasTarget(onlyRecruit, akc.name) ? '（公开限定）' : ''}`,
                onlyRecruit: hasTarget(onlyRecruit, akc.name),
                level: 1,
                tags: markTags(akc.tag, [tag]),
                tagGroup: tag,
                rare: akc.rare,
                appellation: akc.appellation,
                displayLogo: akc.displayLogo,
                profession: akc.profession,
              })
              all_character_count ++
              all_character.push(akc.name)
            }
          })
          excellentTagGroup[tag] = cs
        }
      })
      // console.log(excellentTagGroup)
      // console.log(all_character_count)
      // console.log([...new Set(all_character)].length)


      if(Object.keys(excellentTagGroup).concat(Object.keys(ak_group)).length == 0){
        callback(`【${tg.join(', ')}】\n没有查询到相关干员`)
        return
      }

      // outStr += '\n'


      if(Object.keys(excellentTagGroup).length){

        renderImage(tg.join('+'), excellentTagGroup, data => {
          callback(`[CQ:at,qq=${qq}]\n${outStr}\n${data}`)
        }, true)

        // Object.keys(excellentTagGroup).sort((a, b) => b.split(' + ').length - a.split(' + ').length).forEach(key => {
        //   outStr += `【${key}】<<< 仅出现4星以上干员\n`
        //   Object.keys(excellentTagGroup[key]).sort((a, b) => b - a).forEach(akg => {
        //     // console.log(excellentTagGroup[key][akg].length)
        //     if(excellentTagGroup[key][akg].length > 0){
        //       outStr += `${new Array(parseInt(akg)).fill('★').concat(new Array(6 - parseInt(akg)).fill('　')).join('')}`
        //       outStr += `${excellentTagGroup[key][akg].map(x => x.showName).join(' / ')}\n`
        //     }
        //   })
        // })
      } else {

        renderImage(tg.join('+'), ak_group, data => {
          callback(`[CQ:at,qq=${qq}]\n${outStr}\n${data}`)
        })

        // Object.keys(ak_group).sort((a, b) => b.split(' + ').length - a.split(' + ').length).forEach(key => {
        //   outStr += `【${key}】\n`
        //   // ak_group[key].characters.sort((a, b) => b.rare -  a.rare)
        //
        //
        //   Object.keys(ak_group[key]).sort((a, b) => b - a).forEach(akg => {
        //     if(ak_group[key][akg].length > 0){
        //       outStr += `${new Array(parseInt(akg)).fill('★').concat(new Array(6 - parseInt(akg)).fill('　')).join('')}`
        //       outStr += `${ak_group[key][akg].map(x => x.showName).join(' / ')}\n`
        //     }
        //   })
        // })
      }
      // console.log(Date.now())
      // console.log(outStr)


      // drawTxtImage(`[CQ:at,qq=${qq}]\n`,outStr,callback);

      //callback(`[CQ:at,qq=${qq}]\n${outStr}`)
    }
  }
}