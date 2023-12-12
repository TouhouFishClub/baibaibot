const fs = require('fs');
const path = require('path');

eval(fs.readFileSync(path.join(__dirname, '/js/Skill.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/TailoringItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/MillingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/HandicraftItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/WeavingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/RefineItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/BlacksmithItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/CookingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/PotionMakingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/FishingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/DissolutionItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/SynthesisItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/CarpentryItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/StageTicketMakingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/HeulwenEngineeringItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/MagicCraftItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/StationaryCraftItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/FynnsCraftItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/ManaFormingItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/MetalConversionItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/CommerceMasteryProduct.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/RelicInvestigationItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/ErgEnhance.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/Item.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/ErinnFormula..js')).toString('utf-8')) // 需要屏蔽最後加載NPCTime的timer
eval(fs.readFileSync(path.join(__dirname, '/js/KillItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/ExplorationItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/GiftItem.js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/QuestItem.js')).toString('utf-8'))
eval(fs.readFileSync(path.join(__dirname, '/js/ErinnWeaponShapeTransformScroll..js')).toString('utf-16le'))
eval(fs.readFileSync(path.join(__dirname, '/js/Product.js')).toString('utf-8'))


const ItemNameToItemId = new Map()
const ItemIdToItemDetail = new Map()

const CreateSkillLists = () => {
  SkillList.forEach(skillId => {
    let skill = eval(`Skill${skillId}`)
    console.log(`===== ${skillId} ${skill[0]} =====`)
    let skillList = eval(`${skill[1]}List`)
    // console.log(JSON.stringify(skillList), null, 2)
    if(skillList.filter(x => x == 101).length) {
      console.log('target')
    }
    FormatItems(skillList, skill[0], skill[1], skillId)
  })
}


const FormatItems = (skillList, skillName, skillCode, skillId) => {
  skillList.forEach(itemId => {
    let item
    // console.log(`=> ${skillId} | ${itemId}`)
    switch(skillId) {
      case 55100:
      case '55100':
        // 贸易精通不需要
        item = eval(`Product${itemId}`);
        break;
      default:
        item = eval(`Item${itemId}`);
    }
    ItemNameToItemId.set(item[0], itemId)
    ItemIdToItemDetail.set(itemId, {
      itemSource: item,
      name: item[0],
      skillName,
      skillCode,
      skillId,
      itemId
    })
  })
}

const getItems = () => {
  if (!ItemNameToItemId.size) {
    CreateSkillLists()
  }
  return {
    ItemNameToItemId,
    ItemIdToItemDetail
  }
}

module.exports = {
  getItems
}

