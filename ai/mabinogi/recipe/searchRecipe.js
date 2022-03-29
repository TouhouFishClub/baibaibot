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
    ItemNameToItemId.forEach((id, name) => {
      // console.log(name)
      if(name.match(new RegExp(content))) {
        targets.push(name)
      }
    })
  }
  if(targets.length) {
    if(targets.length == 1) {
      renderRecipeImage(ItemIdToItemDetail.get(ItemNameToItemId.get(targets[0])).html, targets[0], callback)
    } else {
      callback(`找到${targets.length}\n${targets.slice(0, 10).map(x => `mbi ${ItemNameToItemId.get(x)} | ${x}`).join('\n')}`)
    }
  } else {
    callback(`未找到${content}`)
  }
}

module.exports = {
  searchMabiRecipe
}
