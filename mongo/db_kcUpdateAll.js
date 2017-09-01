const fs = require('fs-extra')
const path = require('path-extra')
const MongoClient = require('mongodb').MongoClient;
const database = 'kc_data'
const mongourl = `mongodb://127.0.0.1:27050/${database}`;
const _ = require('lodash')

module.exports = function(){
  switch (arguments[0]){
    case 1:
    case 'ship':
      updateKcShip()
      break
    case 2:
    case 'shiptype':
      updateKcShipType()
      break
    case 3:
    case 'useitem':
      updateKcUseItem()
      break
    case 4:
    case 'quest':
      updateKcQuest()
      break
    default:
      updateKcShip()
      updateKcShipType()
      updateKcUseItem()
      updateKcQuest()
  }
}

const updateKcShip = () => {

}

const updateKcShipType = () => {

}

const updateKcUseItem = () => {

}

const updateKcQuest = () => {
  const questData = fs.readJsonSync(path.join('assets', 'kanColleQuestData.json'))
  MongoClient.connect(mongourl, (err, db) => {
    const table = db.collection('kc_quest')
    questData.forEach((quest, index) => {
      table.save(Object.assign(quest, {'_id': quest.wiki_id, 'checktext': quest.title + quest.detail + quest.chinese_title + quest.chinese_detail}))
    })
  })
}

const dbSave = (table, dataObj) => {
  table.save(dataObj)
}