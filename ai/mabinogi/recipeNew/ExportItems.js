const fs = require('fs');
const path = require('path');

eval(fs.readFileSync('./js/Skill.js').toString('utf-16le'))
eval(fs.readFileSync('./js/TailoringItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/MillingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/HandicraftItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/WeavingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/RefineItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/BlacksmithItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/CookingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/PotionMakingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/FishingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/DissolutionItem.js').toString('utf-16le'))
eval(fs.readFileSync('./js/SynthesisItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/CarpentryItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/StageTicketMakingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/HeulwenEngineeringItem.js').toString('utf-16le'))
eval(fs.readFileSync('./js/MagicCraftItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/StationaryCraftItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/FynnsCraftItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/ManaFormingItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/MetalConversionItem.js').toString('utf-16le'))
eval(fs.readFileSync('./js/CommerceMasteryProduct.js').toString('utf-16le'))
eval(fs.readFileSync('./js/RelicInvestigationItem.js').toString('utf-16le'))
eval(fs.readFileSync('./js/ErgEnhance.js').toString('utf-16le'))
eval(fs.readFileSync('./js/Item.js').toString('utf-8'))
eval(fs.readFileSync('./js/ErinnFormula..js').toString('utf-8')) // 需要屏蔽最後加載NPCTime的timer
eval(fs.readFileSync('./js/KillItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/ExplorationItem.js').toString('utf-16le'))
eval(fs.readFileSync('./js/GiftItem.js').toString('utf-16le'))
eval(fs.readFileSync('./js/QuestItem.js').toString('utf-8'))
eval(fs.readFileSync('./js/ErinnWeaponShapeTransformScroll..js').toString('utf-16le'))
eval(fs.readFileSync('./js/Product.js').toString('utf-8'))


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
    console.log(`=> ${skillId} | ${itemId}`)
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

