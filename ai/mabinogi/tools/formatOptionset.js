const fs = require('fs')
const xml2js = require('xml2js')
module.exports = function(callback) {
  let optionsetInfo = fs.readFileSync('./optionset_R291', 'utf-8')
  let optionsetXml = fs.readFileSync('./optionset_R291.xml', 'utf-8')
  let parser = new xml2js.Parser()
  let _LT = {}
  optionsetInfo.split('\n').forEach(val => {
    let sp = val.split('\t')
    _LT[`xml.optionset.${sp[0]}`] = sp[1]
  })
  parser.parseString(optionsetXml, (err, result) => {
    let options = result.OptionSet.OptionSetList[0].OptionSet.map(val => val.$)
    options.forEach(val => {
      val.LocalName = eval(val.LocalName)
      val.LocalName2 = eval(val.LocalName2)
      val.OptionDesc = eval(val.OptionDesc)
    })
    callback(options)
  })
}