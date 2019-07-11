const build = require('./arkNightsBuilding')

module.exports = function(qq, content, callback) {
  if(content.trim()){
    let themeId = searchTheme(content.trim())
    if(themeId){
      let allComfort = 0

      getAllThemeFurnitures(themeId)


      let groupComfort = filterThemeGroup(themeId).map(g => {
        allComfort += g.comfort
        return `${g.name}\t${g.comfort}`
      }).join('\n')
      // console.log(groupComfort)
    } else {
      callback('NOT FOUND BUILD THEME')
    }
  } else {
    callback(`FOUND MUTIPLE THEME IS ${Object.values(build.AllBuildingTheme()).map(b => b.name).join(',')}`)
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
  let qs = build.AllBuildingTheme()[themeId].quickSetup
  console.log(qs)
}