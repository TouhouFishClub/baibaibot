const { renderRecipeImage } = require('./renderRecipe')
const { getItems } = require('./source')

const searchMabiRecipe = (content, callback) => {
  let { ItemNameToItemId, ItemIdToItemDetail } = getItems()
  let targets = []
  if(/^\d+$/.test(content)){
    if(ItemIdToItemDetail.get(content)) {
      targets.push(ItemIdToItemDetail.get(content).name)
    }
  } else {
    Object.keys(ItemNameToItemId).forEach(name => {
      console.log(name)
      if(name.match(new RegExp(content))) {
        targets.push(name)
      }
    })
  }
  if(targets.length) {
    if(targets.length == 1) {
      renderRecipeImage(ItemIdToItemDetail.get(ItemNameToItemId(targets[0])), targets[0], )
    } else {
      callback(`找到${targets.length}\n${targets.slice(0, 10).map(x => `${ItemNameToItemId.get(x)} | ${x}`).join('\n')}`)
    }
  } else {
    callback(`未找到${content}`)
  }
}

module.exports = {
  searchMabiRecipe
}
