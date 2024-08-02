const fs = require('fs-extra')
const path = require('path')
const xml2js = require('xml2js')

const parser = new xml2js.Parser()

eval(fs.readFileSync(path.join(__dirname, '..', '/js/TailoringItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '..', '/js/BlacksmithItem.js')).toString('utf-8'))
// console.log(TailoringList)
// console.log(BlacksmithList)

const TailoringSet = new Set(TailoringList.map(x => `${x}`))
const BlackSmithSet = new Set(BlacksmithList.map(x => `${x}`))
let items = []

const loadItems = async () => {
  let xmlData = await readXmlParse(path.join(__dirname, 'data', `ManualForm.xml`))
}

const readXmlParse = filePath => new Promise((resolve, reject) => {
  console.log(`read file ${filePath}`)
  let file = fs.readFileSync(filePath, 'utf-16le')
  parser.parseString(file, (err, result) => {
    if(err) {
      reject(err)
      return
    }
    resolve(result)
  })
})

const analyzer = async () => {
  let xmlData = await readXmlParse(path.join(__dirname, 'data', `ManualForm.xml`))
  let Tailoring = {}, BlackSmith = {}
  let { ManualForm } = xmlData
  Object.keys(ManualForm).forEach(cate => {
    ManualForm[cate][0].ManualForm.forEach(x => {
      if(cate.startsWith('Tailoring')) {
        // 已经有的过滤，不再重新添加
        if(!TailoringSet.has(x.$.ProductItemID)) {
          Tailoring[x.$.ProductItemID] = Object.assign({
            output: JSON.stringify([[parseInt(x.$.Level), parseFloat(x.$.MaxProgress)], [x.$.Essentials, 0, x.$.CompleteEssentials]])
          }, x.$)
        }
      }
      if(cate.startsWith('BlackSmith')) {
        if(!BlackSmithSet.has(x.$.ProductItemID)) {
          BlackSmith[x.$.ProductItemID] = Object.assign({
            output: JSON.stringify([[parseInt(x.$.Level), parseFloat(x.$.MaxProgress)], [x.$.Essentials, 0, x.$.CompleteEssentials]])
          }, x.$)
        }
      }
    })
  })
  // console.log(Tailoring, BlackSmith)
  Object.keys(Tailoring).forEach(x => {
    console.log(`${x} = ${Tailoring[x].output}\n`)
  })
  Object.keys(BlackSmith).forEach(x => {
    console.log(`${x} = ${BlackSmith[x].output}\n`)
  })
  console.log(`Tailoring count: ${Object.keys(Tailoring).length}, BlackSmith count: ${Object.keys(BlackSmith).length}, `)
}

analyzer()