const build = require('./arkNightsBuilding')

module.exports = function(qq, content, callback) {
  if(content.trim()){
    let themeId = searchTheme(content.trim())
    if(themeId){
      let fur = getAllThemeFurnitures(themeId), group = filterThemeGroup(themeId), s = ''

      s += '====== 家具 ======\n'
      s += Object.values(fur).map(d => `${d.furniture.name}【${d.furniture.comfort}】 x ${d.count}`).join('\n')
      s += '\n====== 套装 ======\n'
      s += group.map(g => `${g.name}【${g.comfort}】`).join('\n')
      s += '\n====== 舒适度 ======\n'
      s += `单件舒适度： ${Object.values(fur).reduce((p, c) => p + c.furniture.comfort, 0) + group.reduce((p, c) => p + c.comfort, 0)}\n`
      s += `整套舒适度： ${Object.values(fur).reduce((p, c) => p + c.furniture.comfort * c.count, 0) + group.reduce((p, c) => p + c.comfort, 0)}`

      callback(s)

      // for(let i of Object.values(fur).values()){
      //   console.log('=================')
      //   console.log(i)
      // }
      // for(let [index, item] of Object.entries(fur).entries()){
      //   console.log(index, item)
      // }

    } else {
      callback('没有找到基建')
    }
  } else {
    callback(`查找到以下基建\n\n${Object.values(build.AllBuildingTheme()).map(b => b.name).join(',\n')}`)
  }
}

const searchTheme = str => {
  let allTheme = Object.values(build.AllBuildingTheme())
  let themeId = null
  for(let i = 0; i < allTheme.length; i++){
    if(allTheme[i].name == str){
      themeId = allTheme[i].id
    }
  }
  return themeId
}

const filterThemeGroup = themeId => Object.values(build.AllBuildingGroups()).filter(g => g.themeId == themeId)

const getAllThemeFurnitures = themeId => {
  let qs = build.AllBuildingTheme()[themeId].quickSetup, o = {}
  qs.forEach(q => {
    if(o[q.furnitureId]) {
      o[q.furnitureId].count = o[q.furnitureId].count + 1
    } else {
      o[q.furnitureId] = {
        count: 1,
        furniture: build.AllBuildingFurnitures()[q.furnitureId]
      }
    }
  })
  // console.log(o)
  return o
}