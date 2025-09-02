const fs = require('fs')
const path = require('path')

/**
 * 简化版MBC功能 - 直接处理特定配方
 */

// 缓存已加载的数据
let itemsCache = null
let recipesCache = null

/**
 * 加载物品数据
 */
const loadItems = () => {
  if (itemsCache) return itemsCache
  
  try {
    const itemPath = path.join(__dirname, 'js', 'Item.js')
    const content = fs.readFileSync(itemPath, 'utf-8')
    eval(content)
    
    itemsCache = {}
    // 这里需要手动解析Item.js中的物品定义
    // 由于Item.js格式复杂，我们先处理特定的物品
    
    return itemsCache
  } catch (error) {
    console.error('加载物品数据失败:', error.message)
    return {}
  }
}

/**
 * 加载特定配方文件
 */
const loadRecipe = (skillType, itemId) => {
  try {
    const fileName = `${skillType}.js`
    const filePath = path.join(__dirname, 'js', fileName)
    
    if (!fs.existsSync(filePath)) {
      return null
    }
    
    // 根据文件选择编码
    let encoding = 'utf-8'
    if (['HeulwenEngineeringItem.js', 'MetalConversionItem.js', 'DissolutionItem.js', 'RelicInvestigationItem.js', 'ErgEnhance.js'].includes(fileName)) {
      encoding = 'utf-16le'
    }
    
    const content = fs.readFileSync(filePath, encoding)
    eval(content)
    
    // 尝试获取配方
    const recipeVar = eval(`${skillType}${itemId}`)
    return recipeVar
  } catch (error) {
    return null
  }
}

/**
 * 查找物品的配方
 */
const findRecipeForItem = (itemId) => {
  const skillTypes = [
    'CookingItem',
    'HeulwenEngineeringItem',
    'MagicCraftItem',
    'BlacksmithItem',
    'TailoringItem',
    'WeavingItem',
    'CarpentryItem',
    'HandicraftItem',
    'PotionMakingItem',
    'RefineItem',
    'SynthesisItem',
    'StationaryCraftItem',
    'FynnsCraftItem',
    'ManaFormingItem',
    'StageTicketMakingItem',
    'MillingItem',
    'MetalConversionItem',
    'DissolutionItem',
    'RelicInvestigationItem',
    'ErgEnhance'
  ]
  
  for (const skillType of skillTypes) {
    const recipe = loadRecipe(skillType, itemId)
    if (recipe) {
      return { skillType, recipe }
    }
  }
  
  return null
}

/**
 * 获取物品名称
 */
const getItemName = (itemId) => {
  try {
    const itemPath = path.join(__dirname, 'js', 'Item.js')
    const content = fs.readFileSync(itemPath, 'utf-8')
    eval(content)
    
    const itemData = eval(`Item${itemId}`)
    return itemData && itemData.length > 0 ? itemData[0] : null
  } catch (error) {
    return null
  }
}

/**
 * 简单的配方查询
 */
const queryRecipe = (itemName) => {
  // 硬编码一些常见物品的ID
  const knownItems = {
    '释魂者灵狱单手剑': 1000059,
    '水果拼盘': 50106,
    '面包': 50106 // 这里需要正确的ID
  }
  
  const itemId = knownItems[itemName]
  if (!itemId) {
    return `未找到物品: ${itemName}`
  }
  
  const recipeInfo = findRecipeForItem(itemId)
  if (!recipeInfo) {
    return `${itemName} 没有配方数据`
  }
  
  const { skillType, recipe } = recipeInfo
  
  let result = `📊 ${itemName} 的配方信息:\n`
  result += `🔧 制作技能: ${skillType}\n`
  result += `📋 配方详情: ${JSON.stringify(recipe)}\n`
  
  // 解析材料
  if (skillType === 'CookingItem') {
    result += `\n📝 所需材料:\n`
    for (let i = 1; i < recipe.length; i += 2) {
      if (recipe[i] && recipe[i + 1]) {
        const materialName = getItemName(recipe[i])
        result += `  • ${materialName || recipe[i]}: ${recipe[i + 1]}%\n`
      }
    }
  } else if (['HeulwenEngineeringItem', 'MagicCraftItem'].includes(skillType)) {
    result += `\n📝 所需材料:\n`
    if (recipe.length >= 2 && Array.isArray(recipe[1])) {
      const materials = recipe[1]
      for (let i = 0; i < materials.length; i += 2) {
        if (materials[i] && materials[i + 1]) {
          const materialName = getItemName(materials[i])
          result += `  • ${materialName || materials[i]}: ${materials[i + 1]}\n`
        }
      }
    }
  }
  
  return result
}

module.exports = {
  queryRecipe
}
