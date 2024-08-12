const fs = require('fs-extra')
const process = require('process')
const path = require('path')
const xml2js = require('xml2js')
const {result} = require("lodash/object");

const parser = new xml2js.Parser()

let itemXML = []
let itemETCXML = []

const readXmlStringParse = (id, str) => new Promise((resolve, reject) => {
  if(str.trim()) {
    parser.parseString(str, (err, result) => {
      if(err) {
        // console.log(`=== err string ===`)
        // console.log(id)
        // console.log(str)
        // console.log(err)
        resolve({})
        return
      }
      resolve(result)
    })
  } else {
    resolve({})
  }
})
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
const analysisInsetXml = async (id, str) => {
  let res = await readXmlStringParse(id, str), output = {}
  try {
    let target = res.food_effect
    if(target) {
      if(target.buffer) {
        target = target.buffer[0]
      } else if(target.quality) {
        if(target.quality[0].buffer) {
          target = target.quality[0].buffer[0]
        } else {
          target = target.quality[0]
        }
      }
    }
    output.FoodEffectXMLTrans = {
      // source: res,
      food_effect: target?.$ || {},
      effect: target?.effect?.map(x => Object.assign({}, {
        param_china: effectTrans[x.$.param]
      }, x.$)) || [],
    }
    return output
  } catch (err) {
    console.log(`\n\n=== err ===\n\n`)
    console.log(err)
    console.log(JSON.stringify(res, null, 2))
    return {}
  }
}
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
    let output = []
    for(let i = 0; i < xmlData.Items.Mabi_Item.length; i++) {
      let item = xmlData.Items.Mabi_Item[i].$
      let injectFoodEffect = item.FoodEffectXML ? await analysisInsetXml(item.ID, item.FoodEffectXML) : {}
      output.push(Object.assign({}, item, injectFoodEffect, {
        Text_China: transform[item.Text_Name1],
        Text_China_Desc: transform[item.Text_Desc1],
      }))
    }
    // let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {
    //   Text_China: transform[x.$.Text_Name1],
    //   Text_China_Desc: transform[x.$.Text_Desc1]
    // }))
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
    let output = []
    for(let i = 0; i < xmlData.Items.Mabi_Item.length; i++) {
      let item = xmlData.Items.Mabi_Item[i].$
      let injectFoodEffect = item.FoodEffectXML ? await analysisInsetXml(item.ID, item.FoodEffectXML) : {}
      output.push(Object.assign({}, item, injectFoodEffect, {
        Text_China: transform[item.Text_Name1],
        Text_China_Desc: transform[item.Text_Desc1],
      }))
    }
    // let output = xmlData.Items.Mabi_Item.map(x => Object.assign({}, x.$, {
    //   Text_China: transform[x.$.Text_Name1],
    //   Text_China_Desc: transform[x.$.Text_Desc1],
    // }))
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

const effectTrans = {
  'str': '力量',
  'int': '智力',
  'dex': '敏捷',
  'will': '意志',
  'luck': '幸运',
  'manamax': '最大魔法',
  'lifemax': '最大生命',
  'staminamax': '最大体力',
  'protect': '保护',
  'defence': '防御',
  'magic_attack': '魔攻',
  'magic_defense': '魔防',
  'magic_protect': '魔保',
  'attackmax': '最大伤害',
  'attackmin': '最小伤害',
  'defense': '防御',
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
  let mark = {}, foodMarkSet = new Set(), effectSet = new Set()
  cookieXml.forEach(recipeItem => {
    if(!mark[recipeItem.action]) {
      mark[recipeItem.action] = recipeItem
    }
    if(recipeItem.FoodEffectXMLTrans) {
      if(recipeItem.FoodEffectXMLTrans.food_effect) {
        Object.keys(recipeItem.FoodEffectXMLTrans.food_effect).forEach(key => {
          foodMarkSet.add(key)
        })
      }
      if(recipeItem.FoodEffectXMLTrans.effect) {
        recipeItem.FoodEffectXMLTrans.effect.forEach(effect => {
          effectSet.add(effect.param)
        })
      }
    }
  })
  let tar = cookieXml.filter(x => x.ID == '51392')[0]
  console.log(JSON.stringify(tar, null, 2))
  // console.log(Object.values(mark).map(x => `${x.action} => ${x.China_Local_Name}`))
  console.log(cookieXml.length)
  console.log(foodMarkSet)
  console.log(effectSet)
  console.log(render(tar))
}

const render = data => {
  let str = `
  {{CookingRecipe
  |图片=${data.China_Local_Name}.png
  |名称=${data.China_Local_Name}
  |可否制作=true
  |英文名称=${data.Text_Name0}
  |饱食度=${data.Food_Amount}
  |售卖NPC=
  |经验值=${data.cookexp}
  |制作方式=${data.China_Action}
  |持续时间=${data?.FoodEffectXMLTrans?.food_effect?.duration_sec || ''}
  |占用格子=${data.Inv_XSize}x${data.Inv_YSize}
  |料理描述=${data.Text_China_Desc}
  |${data.essential.map((x, i) => `材料${i+1}=${x.Text_China || ''}|含量${i+1}=${x.quality_max||0}`).join('|')}
  |体重=${data.Food_Fatness >= 0 ? `+${data.Food_Fatness}` : data.Food_Fatness}
  |上半身=${data.Food_Upper >= 0 ? `+${data.Food_Upper}` : data.Food_Upper}
  |下半身=${data.Food_Lower >= 0 ? `+${data.Food_Lower}` : data.Food_Lower}
  |${data?.FoodEffectXMLTrans?.effect.map(x => `${x.param_china}=${x.amount}`).join('|')}
  }}
`
  return str
}

createCookieRecipe()