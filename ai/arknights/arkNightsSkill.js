const fs = require('fs-extra')
const path = require('path-extra')

let ark_skill
let ark_skill_init = false

module.exports = function(key, level) {
  if(!ark_skill_init){
    ark_skill = fs.readJsonSync(path.join(__dirname, 'data', 'skill_table.json'))
    // console.log(ark_skill[])
    Object.keys(ark_skill).forEach(sk => {
      // console.log(ark_skill[sk].levels)
      ark_skill[sk].levels = ark_skill[sk].levels.map(lev => {
        let out = lev.description, blackboardMap = {}
        lev.blackboard.forEach(bb => {
          blackboardMap[bb.key] = bb.value
        })
        out = out
          .replace(new RegExp('<@ba.vup>', 'g'), '')
          .replace(new RegExp('<@ba.vdown>', 'g'), '')
          .replace(new RegExp('<@ba.rem>', 'g'), '')
          .replace(new RegExp('</>', 'g'), '')
          .replace(new RegExp('\\\\n', 'g'), '\n')
        // console.log('====')
        // console.log(out)
        if(out.match(/\-?\{[a-z0-9A-Z:_\-\.\[\]%@]+\}/g)){
          out.match(/\-?\{[a-z0-9A-Z:_\-\.\[\]%@]+\}/g).forEach(re => {
            // console.log('<<<<')
            // console.log(re)
            let res = re, p = false
            if(res.indexOf(':') > -1){
              res = res.substr(0, res.indexOf(':')) + '}'
              p = true
            }
            res = res.toLowerCase()
            res = res.replace('-{', '{')
            res = res.replace('{-', '{')
            res = res.replace('{', '`${blackboardMap["')
            res = res.replace('}', '"]}`')
            // console.log('>>>>')
            // console.log(res)
            // console.log(out)
            if(p){
              out = out.replace(re, `${parseInt(parseFloat(eval(res)) * 100)}%`)

            } else {
              out = out.replace(re, eval(res))
            }
          })

          // console.log('====')
          // console.log(out)
        }
        return {
          desc: out,
          initSp: lev.spData.initSp,
          spCost: lev.spData.spCost,
          duration: lev.duration,
          name: lev.name,
        }
      })
    })
  }

  if(ark_skill[key].levels.length < level + 1){
    return `【${ark_skill[key].levels[0].name}| 1 级】\n${ark_skill[key].levels[0].desc}\n〖初始〗：${ark_skill[key].levels[0].initSp} 〖释放〗：${ark_skill[key].levels[0].spCost} 〖持续〗：${ark_skill[key].levels[0].duration}秒`
  } else {
    return `【${ark_skill[key].levels[0].name} | ${parseInt(level) + 1} 级】\n${ark_skill[key].levels[level].desc}\n〖初始〗：${ark_skill[key].levels[level].initSp} 〖释放〗：${ark_skill[key].levels[level].spCost} 〖持续〗：${ark_skill[key].levels[level].duration}秒`
  }
}