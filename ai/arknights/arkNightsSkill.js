const fs = require('fs-extra')
const path = require('path-extra')

let ark_skill
let ark_skill_init = false

module.exports = function(key, level) {
  if(!ark_skill_init){
    ark_skill = fs.readJsonSync(path.join(__dirname, 'data', 'skill_table.json'))
    Object.keys(ark_skill).forEach(sk => {
      // console.log(ark_skill[sk].levels)
      ark_skill[sk].levels = ark_skill[sk].levels.map(level => {
        let out = level.description, blackboardMap = {}
        level.blackboard.forEach(bb => {
          blackboardMap[bb.key] = bb.value
        })
        out  = out
          .replace(new RegExp('<@ba.vup>', 'g'), '')
          .replace(new RegExp('<@ba.vdown>', 'g'), '')
          .replace(new RegExp('<@ba.rem>', 'g'), '')
          .replace(new RegExp('</>', 'g'), '')
        // console.log('====')
        // console.log(out)
        if(out.match(/\-?\{[a-z0-9A-Z:_\-\.%@]+\}/g)){
          out.match(/\-?\{[a-z0-9A-Z:_\-\.%@]+\}/g).forEach(re => {
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
          return out
        } else {
          return []
        }
      })
    })
  }
  if(ark_skill[key].levels.length < level){
    return `${ark_skill[key].name}(${level + 1})\n${ark_skill[key].levels[0]}`
  } else {
    return `${ark_skill[key].name}(${level + 1})\n${ark_skill[key].levels[level]}`
  }
}