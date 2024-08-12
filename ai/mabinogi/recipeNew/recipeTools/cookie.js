const fs = require('fs-extra')
const process = require('process')
const path = require('path')
const xml2js = require('xml2js')

const parser = new xml2js.Parser()

let itemXML = []
let itemETCXML = []

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
    let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {
      Text_China: transform[x.$.Text_Name1],
      Text_China_Desc: transform[x.$.Text_Desc1]
    }))
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
    let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {
      Text_China: transform[x.$.Text_Name1],
      Text_China_Desc: transform[x.$.Text_Desc1]
    }))
    // console.log(output)
    itemETCXML = output
    return output
  }
}

const cookieAction = {
  'boil': '烧(火)',
  'mix': '混合',
  'cook_with_strong_fire': '烤(火)',
  'knead': '和面',
  'steamed_dish': '蒸(火)',
  'steam': '煮(火)',
  'fry': '炒(火)',
  'fry_with_much_oil': '炸(火)',
  'make_jam': '制作果酱(火)',
  'make_noodle': '做面条',
  'make_pasta': '制作意大利面',
  'make_pie': '制作派',
  'ferment': '发酵',
  'sousvide': '水浴法(火)',
  'fillet': '切片',
  'make_pizza': '制作披萨',
}

const createCookieRecipe = async () => {
  let items = (await loadItemXml()).concat(await loadItemETCXml())
  // console.log(items)
  let txt = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'IT', `cookingrecipe.china.txt`), 'utf-8')
  let transform = {}
  txt.split('\n').forEach(val => {
    let sp = val.split('\t')
    if(sp[0] && sp[1]) {
      transform[`_LT[xml.cookingrecipe.${sp[0].trim()}]`] = sp[1].trim()
    }
  })
  let xmlData = await readXmlParse(path.join(__dirname, '..', '..', 'data', 'IT', `cookingrecipe.xml`))
  let cookieXml = xmlData.CookingRecipe.recipe.map(recipeItem =>
    Object.assign(
      {},
      recipeItem.$,
      {
        China_Local_Name: transform[recipeItem.$.localname],
        China_Action: cookieAction[recipeItem.$.action],
      },
      items.filter(item => item.ID == recipeItem.$.result_item)[0] || {},
      {
        essential: recipeItem.essential.map(essentialItem =>
          Object.assign(
            {},
            essentialItem.source[0].$,
            items.filter(item => item.ID == essentialItem.source[0].$.item_id)[0] || {},
          ))
      }
    ))
  let mark = {}
  cookieXml.forEach(recipeItem => {
    if(!mark[recipeItem.action]) {
      mark[recipeItem.action] = recipeItem
    }
  })
  console.log(JSON.stringify(cookieXml.filter(x => x.ID == '51392')[0], null, 2))
  // console.log(Object.values(mark).map(x => `${x.action} => ${x.China_Local_Name}`))
  console.log(cookieXml.length)
}

const render = data => {
  let str = `
<table>
  <tr>
    <td rolspan="3">
      <p></p>
    </td>
  </tr>
  <tr></tr>
  <tr></tr>
</table>
`
}

createCookieRecipe()