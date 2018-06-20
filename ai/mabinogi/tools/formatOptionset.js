const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
module.exports = function(callback) {
  let optionsetInfo = fs.readFileSync(path.join(__dirname, 'optionset_R296'), 'utf-8')
  let optionsetXml = fs.readFileSync(path.join(__dirname, 'optionset_R296.xml'), 'utf-8')
  // optionsetXml = optionsetXml.substring(optionsetXml.indexOf('<'))
  let parser = new xml2js.Parser()
  let transform = {}
  optionsetInfo.split('\n').forEach(val => {
    let sp = val.split('\t')
    transform[`_LT[xml.optionset.${sp[0]}]`] = sp[1]
  })
  let effectiveOptionset = []
  console.log(optionsetXml)
  parser.parseString(optionsetXml, (err, result) => {
    let options = result.OptionSet.OptionSetList[0].OptionSet.map(val => val.$)
    options.forEach(val => {
      if(transform[val.LocalName] && transform[val.LocalName2] && transform[val.OptionDesc] && (val.Usage === '1' || val.Usage === '0')){
        let obj = {}
        obj.ID = val.ID
        obj.Name = val.Name
        obj.LocalName = transform[val.LocalName]
        obj.OptionDesc = transform[val.OptionDesc]
        obj.LevelQuery = 16 - val.Level
        obj.Level = 16 - val.Level < 10 ? 16 - val.Level : ['A', 'B', 'C', 'D', 'E', 'F', '练习'][6 - val.Level]
        obj.Usage = val.Usage === '0' ? '接头': '接尾'
        obj.UsageQuery = val.Usage
        let buffArr = [], debuffArr = []
        obj.OptionDesc.split('\\n').forEach(val => {
          if(/^\[.*\]$/.test(val)){
            debuffArr.push(val.substring(1, val.length - 1))
          } else {
            buffArr.push(val)
          }
        })
        obj.Buff = buffArr
        obj.Debuff = debuffArr
        effectiveOptionset.push(obj)
      }
    })
    callback(effectiveOptionset)
  })
}