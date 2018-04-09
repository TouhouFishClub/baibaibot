const fs = require('fs')
const xml2js = require('xml2js')
module.exports = function() {
  let optionsetInfo = fs.readFileSync('./optionset_R291', 'utf-8')
  let optionsetXml = fs.readFileSync('./optionset.xml', 'utf-8')
  let parser = new xml2js.Parser()
  parser.parseString(optionsetXml, (err, result) => {
    console.log(result)
    console.log('Done.')
  })
  fs.readFile('./optionset.xml', 'utf-8', (err, data) => {
    parser.parseString(data, (err, result) => {
      console.log(result)
    })
  })

}