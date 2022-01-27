const fs = require('fs-extra')
const path = require('path')
const xml2js = require('xml2js')
module.exports = function(callback) {
  let optionsetInfo = fs.readFileSync(path.join(__dirname, 'optionset_R384'), 'utf-8')
  let optionsetXml = fs.readFileSync(path.join(__dirname, 'optionset_R384.xml'), 'utf-8')
	let optionsetCustom = fs.readJsonSync(path.join(__dirname, 'custom.json'), 'utf-8')
  // console.log(optionsetXml)
  optionsetXml = optionsetXml.substring(optionsetXml.indexOf('<'))
  let parser = new xml2js.Parser()
  let transform = {}
  optionsetInfo.split('\n').forEach(val => {
    let sp = val.split('\t')
    transform[`_LT[xml.optionset.${sp[0]}]`] = sp[1]
  })
  let effectiveOptionset = []
  parser.parseString(optionsetXml, (err, result) => {
    let options = result.OptionSet.OptionSetList[0].OptionSet.map(val => val.$)
	  if(optionsetCustom.length) {
	    let custom = optionsetCustom.map(x => Object.assign({custom: true}, x))
		  options = options.concat(custom)
	  }
    options.forEach(val => {
      if(
      	(
      		transform[val.LocalName] &&
		      transform[val.LocalName2] &&
		      transform[val.OptionDesc] &&
		      (val.Usage === '1' || val.Usage === '0')
	      )
	      ||
	      val.custom
      ){
        let obj = {}
        obj.ID = val.custom ? `cu${val.ID}` : val.ID
        obj.Name = val.Name
        obj.LocalName = val.custom ? val.LocalName : transform[val.LocalName]
        obj.LocalName2 = val.custom ? val.LocalName : transform[val.LocalName2]
        obj.OptionDesc = val.custom ? val.OptionDesc : transform[val.OptionDesc]
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
        obj.BuffStr = buffArr.concat(debuffArr).join(',')
        obj.Debuff = debuffArr
        effectiveOptionset.push(obj)
      }
    })
    callback(effectiveOptionset)
  })
}
