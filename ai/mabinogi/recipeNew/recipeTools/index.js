const fs = require('fs-extra')
const process = require('process')
const path = require('path')
const xml2js = require('xml2js')

const parser = new xml2js.Parser()
let itemXML = []
let itemETCXML = []
let itemWeaponXML = []
let itemTXT = {}

let itemPlus = {}

eval(fs.readFileSync(path.join(__dirname, '..', '/js/TailoringItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '..', '/js/BlacksmithItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '..', '/js/HeulwenEngineeringItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '..', '/js/MagicCraftItem.js')).toString('utf-8'))

eval(fs.readFileSync(path.join(__dirname, '..', '/js/Item.js')).toString('utf-8'))
// console.log(TailoringList)
// console.log(BlacksmithList)

const TailoringSet = new Set(TailoringList.map(x => `${x}`))
const BlackSmithSet = new Set(BlacksmithList.map(x => `${x}`))

const loadItemXml = async () => {
  if(itemXML.length) {
    return itemXML
  } else {
    let xmlData = await readXmlParse(path.join(__dirname, '..', '..', 'data', 'IT', `itemdb.xml`))
    let txt = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'IT', `itemdb.china.txt`), 'utf-8')
    let transform = {}
    txt.split('\n').forEach(val => {
      let sp = val.split('\t')
      if(sp[0] && sp[1]) {
        transform[`_LT[xml.itemdb.${sp[0].trim()}]`] = sp[1].trim()
      }
    })
    let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {Text_China: transform[x.$.Text_Name1]}))
    // console.log(output)
    itemXML = output
    return output
  }
}
const loadItemETCXml = async () => {
  if(itemETCXML.length) {
    return itemETCXML
  } else {
    let xmlData = await readXmlParse(path.join(__dirname, '..', '..', 'data', 'IT', `itemdb_etc.xml`))
    let txt = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'IT', `itemdb_etc.china.txt`), 'utf-8')
    let transform = {}
    txt.split('\n').forEach(val => {
      let sp = val.split('\t')
      if(sp[0] && sp[1]) {
        transform[`_LT[xml.itemdb_etc.${sp[0].trim()}]`] = sp[1].trim()
      }
    })
    let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {Text_China: transform[x.$.Text_Name1]}))
    // console.log(output)
    itemETCXML = output
    return output
  }
}
const loadItemWeaponXml = async () => {
  if(itemWeaponXML.length) {
    return itemWeaponXML
  } else {
    let xmlData = await readXmlParse(path.join(__dirname, '..', '..', 'data', 'IT', `itemdb_weapon.xml`))
    let txt = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'IT', `itemdb_weapon.china.txt`), 'utf-8')
    let transform = {}
    txt.split('\n').forEach(val => {
      let sp = val.split('\t')
      if(sp[0] && sp[1]) {
        transform[`_LT[xml.itemdb_etc.${sp[0].trim()}]`] = sp[1].trim()
      }
    })
    let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {Text_China: transform[x.$.Text_Name1]}))
    // console.log(output)
    itemWeaponXML = output
    return output
  }
}

const matchCategory = (Category, itemCategory = '') => {
  if(!Category) {
    return false
  }
  // 如果需要完全按规则匹配，这里的.*改成.+
  let newReg = Category.replace(/\*/g, '.*')
  return new RegExp(`^${newReg}$`, 'g').test(itemCategory)
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

const analyzerItem = async str => {
  let items = await loadItemXml()
  let sp = str.split(';').map(x => x.split(',').map(x => x.trim()).filter(x => x)).filter(x => x.length)
  let infos = [], output = []
  for(let i = 0; i < sp.length; i ++) {
    let [regexp, count] = sp[i], target = {
      item: regexp,
      id: 9090909
    }
    for(let j = 0; j < items.length; j ++) {
      let item = items[j]
      if(matchCategory(regexp, item.Category)) {
        // console.log(item)
        target = {
          item: item.Text_China,
          id: item.ID
        }
        if(!item.Text_China.includes('活动')){
          // 不知道为什么会匹配到活动的数据，暂时这样过滤一下
          break
        }
      }
    }
    infos.push(target, count)
  }
  // console.log(sp)
  // console.log(infos)
  output = infos.map((x, i) => {
    if(i % 2) {
      return parseInt(x)
    } else {
      try {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        // 如果有，则不做添加
        let txt = `item has ${eval(`Item${x.id}`)}`
        // console.log(txt)
        process.stdout.write(txt)
      } catch (err) {
        // console.log(err)
        // 如果没有，则添加额外item
        itemPlus[`Item${x.id}`] = x.item.trim()
      }
      return parseInt(x.id)
    }
  })
  console.log('\n')
  // console.log(output)
  return output
}

const analyzerCompleteItem = async str => {
  // process.stdout.write('\n')
  let items = (await loadItemXml()).concat((await loadItemETCXml()).concat(await loadItemWeaponXml()))

  let output = []
  let compTypes = str.split('\n').map(x => x.trim().substring(1, x.trim().length - 1))
  if(compTypes.length > 1) {
    // 暂定只有一种变动属性
    compTypes.sort((a, b) => a.length - b.length)
    // compTypes = compTypes.map((x, i) => i ? x.split(compTypes[0]).join('|') : x)
    output.push("Ingot", 1)
  }

  let sp = compTypes[0].split(';').map(x => x.split(',').map(x => x.trim()).filter(x => x)).filter(x => x.length)
  let infos = []
  for(let i = 0; i < sp.length; i ++) {
    let [regexp, count] = sp[i], target = {
      item: regexp,
      id: 9090909
    }
    for(let j = 0; j < items.length; j ++) {
      let item = items[j]
      if(matchCategory(regexp, item.Category)) {
        // console.log(item)
        target = {
          item: item.Text_China,
          id: item.ID
        }
        if(!item.Text_China.includes('活动')){
          // 不知道为什么会匹配到活动的数据，暂时这样过滤一下
          break
        }
      }
    }
    infos.push(target, count)
  }

  // console.log(sp)
  // console.log(infos)
  // console.log(output)
  output = output.concat(infos.map((x, i) => {
    if(i % 2) {
      return parseInt(x)
    } else {
      try {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        // 如果有，则不做添加
        let txt = `item has ${eval(`Item${x.id}`)}`
        // console.log(txt)
        process.stdout.write(txt)
      } catch (err) {
        // console.log(err)
        // 如果没有，则添加额外item
        itemPlus[`Item${x.id}`] = x.item.trim()
      }
      return parseInt(x.id)
    }
  }))

  console.log('\n')
  // console.log(output)
  return output
}

// 参考 44008 恶魔孤寂拳套 BlacksmithItem44008
// 参考 1260003 死神浪客拳套 工学
// 参考 1040007 毁灭弓 工艺 三眼
// 参考 1230010 元素法仗 工艺
//


const formatProduction = async () => {
  let xmlData = await readXmlParse(path.join(__dirname, '..', '..', 'data', 'IT', `production.xml`))
  let txt = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'IT', `production.china.txt`), 'utf-8')
  let transform = {}
  txt.split('\n').forEach(val => {
    let sp = val.split('\t')
    transform[`_LT[xml.production.${sp[0].trim()}]`] = sp[1]
  })
  let HeulwenEngineering = {}, MagicCraft = {}

  for(let i = 0; i < xmlData.Production.HeulwenEngineering[0].Production.length; i ++) {
    let xmlItem = xmlData.Production.HeulwenEngineering[0].Production[i].$
    if(xmlItem.Essentials) {
      if(xmlItem.Title) {
        xmlItem.TitleCn = transform[xmlItem.Title].trim()
      }
      if(xmlItem.EssentialDesc) {
        xmlItem.EssentialDescCn = transform[xmlItem.EssentialDesc].trim()
      }
      console.log(xmlItem)
    }
  }
}
const analyzer = async () => {
  let xmlData = await readXmlParse(path.join(__dirname, '..', '..', 'data', 'IT', `ManualForm.xml`))
  let txt = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'IT', `ManualForm.china.txt`), 'utf-8')
  let transform = {}
  txt.split('\n').forEach(val => {
    let sp = val.split('\t')
    transform[`_LT[xml.manualform.${sp[0].trim()}]`] = sp[1]
  })
  let Tailoring = {}, BlackSmith = {}
  let { ManualForm } = xmlData
  const ManualFormKeys = Object.keys(ManualForm)
  for(let i = 0; i < ManualFormKeys.length; i++) {
    let cate = ManualFormKeys[i]
    for(let j = 0; j < ManualForm[cate][0].ManualForm.length; j++) {
      let xmlItem = ManualForm[cate][0].ManualForm[j].$
      if(cate.startsWith('Tailoring')) {
        // 已经有的过滤，不再重新添加
        if(!TailoringSet.has(xmlItem.ProductItemID)) {
          //卷轴
          try {
            // 如果有，则不做添加
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            let out = eval(`Item${xmlItem.ManualItemID}${xmlItem.FormID}`)
            process.stdout.write(out)
          } catch (err) {
            // console.log(err)
            // 如果没有，则添加额外item
            itemPlus[`Item${xmlItem.ManualItemID}${xmlItem.FormID}`] = transform[xmlItem.ManualNameLocal].trim()
          }
          //成品
          try {
            // 如果有，则不做添加
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            let out2 = eval(`Item${xmlItem.ProductItemID}`)
            process.stdout.write(out2)
          } catch (err) {
            // console.log(err)
            // 如果没有，则添加额外item
            itemPlus[`Item${xmlItem.ProductItemID}`] = transform[xmlItem.ManualNameLocal].split('-')[1].trim()
          }
          let essentials = await analyzerItem(xmlItem.Essentials)
          let completeEssentials = await analyzerCompleteItem(xmlItem.CompleteEssentials)
          Tailoring[xmlItem.ProductItemID] = Object.assign({
            output: JSON.stringify([
              [
                parseInt(xmlItem.Level),
                parseFloat(xmlItem.MaxProgress)
              ],
              [
                parseInt(`${xmlItem.ManualItemID}${xmlItem.FormID}`),
                // xmlItem.Essentials,
                ...essentials,
                0,
                // xmlItem.CompleteEssentials
                ...completeEssentials
              ]
            ])
          }, xmlItem)
        }
      }
      if(cate.startsWith('BlackSmith')) {
        if(!BlackSmithSet.has(xmlItem.ProductItemID)) {
          //卷轴
          try {
            // 如果有，则不做添加
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            let out = eval(`Item${xmlItem.ManualItemID}${xmlItem.FormID}`)
            process.stdout.write(out)
          } catch (err) {
            // console.log(err)
            // 如果没有，则添加额外item
            itemPlus[`Item${xmlItem.ManualItemID}${xmlItem.FormID}`] = transform[xmlItem.ManualNameLocal].trim()
          }
          //成品
          try {
            // 如果有，则不做添加
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            let out2 = eval(`Item${xmlItem.ProductItemID}`)
            process.stdout.write(out2)
          } catch (err) {
            // console.log(err)
            // 如果没有，则添加额外item
            itemPlus[`Item${xmlItem.ProductItemID}`] = transform[xmlItem.ManualNameLocal].split('-')[1].trim()
          }
          let essentials = await analyzerItem(xmlItem.Essentials)
          let completeEssentials = await analyzerCompleteItem(xmlItem.CompleteEssentials)
          BlackSmith[xmlItem.ProductItemID] = Object.assign({
            output: JSON.stringify([
              [
                parseInt(xmlItem.Level),
                parseFloat(xmlItem.MaxProgress)
              ],
              [
                parseInt(`${xmlItem.ManualItemID}${xmlItem.FormID}`),
                // xmlItem.Essentials,
                ...essentials,
                0,
                // xmlItem.CompleteEssentials
                ...completeEssentials
              ]
            ])
          }, xmlItem)
        }
      }
    }
  }
  await formatProduction()

  process.stdout.write('\n')
  // console.log(Tailoring, BlackSmith)
  Object.keys(Tailoring).forEach(x => {
    console.log(transform[Tailoring[x].ManualNameLocal])
    console.log(`${x} = ${Tailoring[x].output}\n`)
  })
  Object.keys(BlackSmith).forEach(x => {
    console.log(transform[BlackSmith[x].ManualNameLocal])
    console.log(`${x} = ${BlackSmith[x].output}\n`)
  })
  // console.log(fs.readFileSync(path.join(__dirname, '..', '/js/Item.js')).toString('utf-8'))
  console.log('==', itemPlus)
  console.log(`Tailoring count: ${Object.keys(Tailoring).length}, BlackSmith count: ${Object.keys(BlackSmith).length}, `)

  console.log('=== append to BlacksmithItem.js file ===\n')
  let BlacksmithOutputStr = `BlacksmithList = BlacksmithList.concat([${Object.values(BlackSmith).filter(x => !x.SpecialTalent).map(x=>x.ProductItemID).join(',')}]);\nTalentBlacksmithList = TalentBlacksmithList.concat([${Object.values(BlackSmith).filter(x => x.SpecialTalent).map(x=>x.ProductItemID).join(',')}]);\nvar ${Object.values(BlackSmith).map(x => `BlacksmithItem${x.ProductItemID}=${x.output}`).join(',')};`
  console.log(BlacksmithOutputStr)
  console.log('\n')

  console.log('=== append to TailoringItem.js file ===\n')
  let TailoringOutputStr = `TailoringList = TailoringList.concat([${Object.values(Tailoring).filter(x => !x.SpecialTalent).map(x=>x.ProductItemID).join(',')}]);\nTalentTailoringList = TalentTailoringList.concat([${Object.values(Tailoring).filter(x => x.SpecialTalent).map(x=>x.ProductItemID).join(',')}]);\nvar ${Object.values(Tailoring).map(x => `TailoringItem${x.ProductItemID}=${x.output}`).join(',')};`
  console.log(TailoringOutputStr)
  console.log('\n')

  console.log('=== append to Item.js file ===\n')
  let ItemOutputStr = `var ${Object.keys(itemPlus).map(key => `${key}=["${itemPlus[key]}"]`).join(',')};`
  console.log(ItemOutputStr)
  console.log('\n')

}

analyzer()