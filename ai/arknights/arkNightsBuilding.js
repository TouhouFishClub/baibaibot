const fs = require('fs-extra')
const path = require('path-extra')
let buildingInfo = false
let buildingInfoMap = {}

const AllBuildingData = () => {
  if(!buildingInfo) {
    buildingInfoMap = fs.readJsonSync(path.join(__dirname, 'data', 'building_data.json'))
  }
  return buildingInfoMap
}
const AllBuildingTheme = () => {
  return AllBuildingData().customData.themes
}
const AllBuildingFurnitures = () => {
  return AllBuildingData().customData.furnitures
}
const AllBuildingGroups = () => {
  return AllBuildingData().customData.groups
}

module.exports = {
  AllBuildingData,
  AllBuildingTheme,
  AllBuildingFurnitures,
  AllBuildingGroups,
}