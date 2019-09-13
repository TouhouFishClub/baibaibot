const fs = require('fs-extra')
const path = require('path-extra')

let ark_skill
let ark_skill_init = false

const loadSkillFile = () => {
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
              if(res.indexOf('0%') > -1){
                p = true
              }
              res = res.substr(0, res.indexOf(':')) + '}'
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
          source: lev
        }
      })
    })
  }
  return ark_skill
}

module.exports = function(key) {
  loadSkillFile()
  // console.log('>>>>>>>')
  // console.log(ark_skill[key])
  return ark_skill[key]

  // if(ark_skill[key].levels.length < level + 1){
  //   return ark_skill[key].levels[0]
  // } else {
  //   return ark_skill[key].levels[level]
  // }
}