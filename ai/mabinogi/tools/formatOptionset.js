const fs = require('fs')
const xml2js = require('xml2js')
module.exports = function() {
  let optionsetInfo = fs.readFileSync('./optionset_R291', 'utf-8')
  let optionsetXml = fs.readFileSync('./optionset_R291.xml', 'utf-8')
  let parser = new xml2js.Parser()
  // parser.parseString(optionsetXml, (err, result) => {
  //   console.log(result)
  //   console.log('Done.')
  // })
  // var xml = "<root>Hello xml2js!</root>"
  // parser.parseString(xml, (err, result) => {
  //   console.log(JSON.stringify(result))
  // })
  // console.log(optionsetXml)
  fs.readFile('./optionset_R291.xml', 'utf-8', (err, data) => {
    console.log(data)
    parser.parseString(data, (err, result) => {
      console.log(JSON.stringify(result))
    })
  })

}