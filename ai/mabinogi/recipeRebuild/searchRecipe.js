const { loadAllRecipes, getAllItems, getNameToIds } = require('./dataLoader')

// 延迟加载 renderRecipe（避免在 puppeteer 不可用时崩溃）
let _renderRecipeImage = null
const getRender = () => {
  if (!_renderRecipeImage) {
    _renderRecipeImage = require('./renderRecipe').renderRecipeImage
  }
  return _renderRecipeImage
}

/**
 * 过滤展示用配方：当存在非分解配方时，隐藏分解配方
 * 分解配方仅在物品唯一获取途径是分解时才展示
 */
const filterRecipesForDisplay = (recipes) => {
  const nonDissol = recipes.filter(r => r.type !== 'dissolution')
  return nonDissol.length > 0 ? nonDissol : recipes
}

/**
 * 搜索配方主入口
 * @param {string} content - 搜索关键词（物品名 or ID）
 * @param {Function} callback - 回调函数
 * @param {boolean} showDesc - 是否显示详情版（mbd：递归展示材料配方）
 */
const searchMabiRecipe = async (content, callback, showDesc = false) => {
  if (!content.trim()) return

  try {
    const [recipesByProduct, allItems, nameToIds] = await Promise.all([
      loadAllRecipes(),
      getAllItems(),
      getNameToIds(),
    ])

    let targets = [] // [{id, name}]

    if (/^\d+$/.test(content)) {
      // 按ID搜索
      const id = parseInt(content)
      const item = allItems.get(id)
      if (item) {
        targets.push({ id: item.id, name: item.name })
      } else if (recipesByProduct.has(id)) {
        // 物品不在itemdb中但有配方数据（如4200100等）
        const recipes = recipesByProduct.get(id)
        const name = recipes[0] ? recipes[0].productName : `物品${id}`
        targets.push({ id, name })
      }
    } else {
      // 按名称搜索 - 支持多关键词（空格或逗号分隔）
      const keywords = content.replace(/[， ]/g, ',').split(',').filter(x => x)

      // 先从有配方的产品中搜索
      const productNames = new Map() // name → id
      for (const [productId, recipes] of recipesByProduct) {
        const item = allItems.get(productId)
        const name = item ? item.name : (recipes[0] ? recipes[0].productName : '')
        if (name) productNames.set(name, productId)
      }

      // 关键词过滤
      let matchedNames = Array.from(productNames.keys())
      for (const keyword of keywords) {
        matchedNames = matchedNames.filter(name => name.includes(keyword))
      }

      targets = matchedNames.map(name => ({
        id: productNames.get(name),
        name
      }))
    }

    if (targets.length === 0) {
      callback(`未找到「${content}」的配方信息`)
      return
    }

    if (targets.length === 1) {
      // 精确匹配到一个
      const target = targets[0]
      const recipes = filterRecipesForDisplay(recipesByProduct.get(target.id) || [])
      if (recipes.length > 0) {
        getRender()(target, recipes, allItems, recipesByProduct, showDesc, callback)
      } else {
        callback(`找到「${target.name}」但没有配方数据`)
      }
    } else {
      // 多个匹配 - 检查是否有完全匹配
      const exactMatch = targets.find(t => t.name === content)
      if (exactMatch) {
        const recipes = filterRecipesForDisplay(recipesByProduct.get(exactMatch.id) || [])
        if (recipes.length > 0) {
          const listMsg = `找到${targets.length}个匹配\n${targets.slice(0, 10).map(t => `mbi ${t.id} | ${t.name}`).join('\n')}\n已为您定位到「${exactMatch.name}」`
          getRender()(exactMatch, recipes, allItems, recipesByProduct, showDesc, callback, listMsg, 'MF')
        }
      } else {
        // 显示列表
        callback(`找到${targets.length}个匹配\n${targets.slice(0, 15).map(t => `mbi ${t.id} | ${t.name}`).join('\n')}${targets.length > 15 ? `\n...还有${targets.length - 15}个` : ''}\n可使用多关键词查找，多关键词用空格或逗号分割。`)
      }
    }
  } catch (err) {
    console.error('[searchRecipe] 错误:', err)
    callback('配方查询出错，请稍后再试')
  }
}

module.exports = {
  searchMabiRecipe
}
