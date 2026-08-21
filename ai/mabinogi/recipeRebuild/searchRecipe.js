const { loadAllRecipes, getAllItems } = require('./dataLoader')

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

const normalizeSearchText = text => String(text || '').trim().replace(/:/g, '：')

const getRecipeAliases = recipe => {
  const aliases = new Set()
  const add = value => {
    const normalized = normalizeSearchText(value)
    if (!normalized) return
    aliases.add(normalized)
    aliases.add(normalized.replace(/^(?:图纸|衣物样本)\s*-\s*/, ''))
    aliases.add(normalized.replace(/^制作(?=(?:名匠|特化)：)/, ''))
  }
  add(recipe.title)
  add(recipe.manualName)
  return [...aliases].filter(Boolean)
}

/**
 * 按成品名和官方配方标题搜索。标题命中时只返回命中的配方变体。
 */
const findRecipeTargets = (content, recipesByProduct, allItems) => {
  const query = normalizeSearchText(content)
  const keywords = query.replace(/[， ]/g, ',').split(',').filter(Boolean)
  const targets = []

  for (const [productId, allRecipes] of recipesByProduct) {
    const recipes = filterRecipesForDisplay(allRecipes)
    const item = allItems.get(productId)
    const productName = normalizeSearchText(item ? item.name : (recipes[0] ? recipes[0].productName : ''))
    const productMatches = productName && keywords.every(keyword => productName.includes(keyword))
    const matchingRecipes = recipes.filter(recipe =>
      getRecipeAliases(recipe).some(alias => keywords.every(keyword => alias.includes(keyword)))
    )

    if (!productMatches && matchingRecipes.length === 0) continue

    const exactProduct = productName === query
    const exactRecipes = recipes.filter(recipe => getRecipeAliases(recipe).includes(query))
    targets.push({
      id: productId,
      name: productName || `物品${productId}`,
      recipes: exactProduct
        ? recipes
        : (exactRecipes.length > 0 ? exactRecipes : (productMatches ? recipes : matchingRecipes)),
      exact: exactProduct || exactRecipes.length > 0,
    })
  }

  return targets
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
    const [recipesByProduct, allItems] = await Promise.all([
      loadAllRecipes(),
      getAllItems(),
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
      targets = findRecipeTargets(content, recipesByProduct, allItems)
    }

    if (targets.length === 0) {
      callback(`未找到「${content}」的配方信息`)
      return
    }

    if (targets.length === 1) {
      // 精确匹配到一个
      const target = targets[0]
      const recipes = target.recipes || filterRecipesForDisplay(recipesByProduct.get(target.id) || [])
      if (recipes.length > 0) {
        getRender()(target, recipes, allItems, recipesByProduct, showDesc, callback)
      } else {
        callback(`找到「${target.name}」但没有配方数据`)
      }
    } else {
      // 多个匹配 - 检查是否有完全匹配
      const exactMatch = targets.find(t => t.exact || t.name === normalizeSearchText(content))
      if (exactMatch) {
        const recipes = exactMatch.recipes || filterRecipesForDisplay(recipesByProduct.get(exactMatch.id) || [])
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
  searchMabiRecipe,
  findRecipeTargets,
  getRecipeAliases,
}
