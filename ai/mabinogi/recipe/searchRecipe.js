const { renderRecipeImage } = require('./renderRecipe')
const { getItems } = require('./source')

const searchMabiRecipe = (content, callback, showDesc = false) => {
  let { ItemNameToItemId, ItemIdToItemDetail } = getItems()
  let targets = []
  if(/^\d+$/.test(content)){
    if(ItemIdToItemDetail.get(parseInt(content))) {
      targets.push(ItemIdToItemDetail.get(parseInt(content)).name)
    }
  } else {
		targets = Array.from(ItemNameToItemId.keys())
		content.replace(/[， ]/g, ',').split(',').filter(x => x).forEach(keyword => {
			targets = targets.filter(name => name.match(new RegExp(keyword)))
		})
    // ItemNameToItemId.forEach((id, name) => {
    //   // console.log(name)
    //   if(name.match(new RegExp(content))) {
    //     targets.push(name)
    //   }
    // })
  }
  if(targets.length) {
		let em = targets.filter(name => content == name)
		if(em.length) {
			targets = [em[0]]
		}
    if(targets.length == 1) {
      renderRecipeImage(ItemIdToItemDetail.get(ItemNameToItemId.get(targets[0])).html, targets[0], showDesc, callback)
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
