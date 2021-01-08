const { formatCharacter } = require('./arkNightsCharacterDataFormat')
const {drawTxtImage} = require('../../cq/drawImageBytxt')
const { renderImage } = require('./characterImage')
const fs = require('fs-extra')
const path = require('path-extra')


module.exports = function(qq, content, callback, getData = false){
  // console.log(content)
  if(getData && (content == '1551' || content.toLowerCase() == 'ywwuyi' || /^爽/.test(content))) {
    // console.log(11111)
    callback([
      {
        name: 'Ywwuyi',
        desc: '',
        skills: [],
        info: {
          name: 'Ywwuyi',
          pid: 'p_1551',
          pubId: 'ywwuyi_1551',
          sex: '处男',
          tag: '高级资深处男',
          rare: 6,
          canRecruit: false,
          onlyRecruit: true,
          skills: [],
          appellation: '1551',
          displayLogo: 'logo_rhodes',
          profession: 'CASTER',
          source: {
            "name": "Ywwuyi",
            "description": "",
            "canUseGeneralPotentialItem": false,
            "potentialItemId": "p_1551",
            "team": -1,
            "displayNumber": "R1551",
            "tokenKey": null,
            "appellation": "1551",
            "position": "CASTER",
            "tagList": [
              "处男"
            ],
            "displayLogo": "logo_rhodes",
            "itemUsage": "",
            "itemDesc": "",
            "itemObtainApproach": "",
            "maxPotentialLevel": 0,
            "rarity": 0,
            "profession": "CASTER",
            "trait": null,
            "phases": [
              {
                "characterPrefabKey": "char_285_medic2",
                "rangeId": "3-1",
                "maxLevel": 30,
                "attributesKeyFrames": [
                  {
                    "level": 1,
                    "data": {
                      "maxHp": 261,
                      "atk": 42,
                      "def": 16,
                      "magicResistance": 0.0,
                      "cost": 3,
                      "blockCnt": 1,
                      "moveSpeed": 1.0,
                      "attackSpeed": 100.0,
                      "baseAttackTime": 2.85,
                      "respawnTime": 200,
                      "hpRecoveryPerSec": 0.0,
                      "spRecoveryPerSec": 1.0,
                      "maxDeployCount": 1,
                      "maxDeckStackCnt": 0,
                      "tauntLevel": 0,
                      "massLevel": 0,
                      "baseForceLevel": 0,
                      "stunImmune": false,
                      "silenceImmune": false,
                      "sleepImmune": false
                    }
                  },
                  {
                    "level": 30,
                    "data": {
                      "maxHp": 4225,
                      "atk": 1175,
                      "def": 796,
                      "magicResistance": 30.0,
                      "cost": 0,
                      "blockCnt": 3,
                      "moveSpeed": 1.0,
                      "attackSpeed": 100.0,
                      "baseAttackTime": 0.66,
                      "respawnTime": 0,
                      "hpRecoveryPerSec": 0.0,
                      "spRecoveryPerSec": 1.0,
                      "maxDeployCount": 1,
                      "maxDeckStackCnt": 0,
                      "tauntLevel": 0,
                      "massLevel": 0,
                      "baseForceLevel": 0,
                      "stunImmune": false,
                      "silenceImmune": false,
                      "sleepImmune": false
                    }
                  }
                ],
                "evolveCost": null
              }
            ],
            "skills": [],
            "talents": [],
            "potentialRanks": [            ],
            "favorKeyFrames": [
              {
                "level": 0,
                "data": {
                  "maxHp": 0,
                  "atk": 0,
                  "def": 0,
                  "magicResistance": 0.0,
                  "cost": 0,
                  "blockCnt": 0,
                  "moveSpeed": 0.0,
                  "attackSpeed": 0.0,
                  "baseAttackTime": 0.0,
                  "respawnTime": 0,
                  "hpRecoveryPerSec": 0.0,
                  "spRecoveryPerSec": 0.0,
                  "maxDeployCount": 0,
                  "maxDeckStackCnt": 0,
                  "tauntLevel": 0,
                  "massLevel": 0,
                  "baseForceLevel": 0,
                  "stunImmune": false,
                  "silenceImmune": false,
                  "sleepImmune": false
                }
              }],
            "allSkillLvlup": []
          },
        }
      }
    ])
    return
  }
  let { akc_data, akc_other_data, akc_patch_data } = formatCharacter()

  // console.log('====')
  // console.log(Date.now())
  let sp = content.trim().replace(/ +/g, ' ').split(' '), flag = true, all_data = akc_data.concat(akc_other_data).concat(akc_patch_data)
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
        //TODO: 测试缺少的头像
        // chTmp.forEach(ch => {
        //   try{
        //     fs.readFileSync(path.join(__dirname, `chara/${ch.info.source.appellation}.png`))
        //   } catch (e) {
        //     console.log(ch.info.source.appellation)
        //   }
        // })
				let index = chTmp.findIndex(x => x.name == sp[0])
				if(index > -1) {
					str = `查询到${chTmp.length}位干员：${chTmp.map(x => x.name).join(' / ')}\n已为您定位到${sp[0]}`
					// drawTxtImage('',str,callback);
					renderImage(chTmp[index], skillLevel - 1, callback, str)
				} else {
					str = `查询到${chTmp.length}位干员，请输入具体干员名称\n${chTmp.map(x => x.name).join(' / ')}\n若精确查找干员，请使用正则表达式搜索：如arks ^红$`
					drawTxtImage('',str,callback);
				}
      } else {
        renderImage(chTmp[0], skillLevel - 1, callback)
      }
      // console.log(str)
    }
  }
}