const fs = require('fs')
const path = require('path')

/**
 * 优化版MBC功能 - 专门处理释魂系列的深度分析
 */

// 缓存
let itemsLoaded = false
let recipesLoaded = false

/**
 * 快速查找物品ID
 */
const findItemId = (itemName) => {
  // 硬编码一些常见的释魂系列物品ID
  const knownItems = {
    '释魂者灵狱单手剑': 1000059,
    '释魂者灵狱战锤': 1010070,
    '释魂者黄泉单手斧': 1020004,
    '释魂者魂域操纵杆': 1070014,
    '释魂者裁决双手剑': 1200043,
    '释魂者千狱双手锤': 1210067,
    '释魂者断罪双手斧': 1220018,
    '释魂者冥引骑士枪': 1250026,
    '释魂者悼灵拳套': 1260020,
    '释魂者虚空双枪': 1270029,
    '释魂者永缚链刃': 1290021,
    '释魂者永锢大型盾牌': 1400012,
    '水果拼盘': 50106
  }
  
  return knownItems[itemName] || null
}

/**
 * 获取物品名称
 */
const getItemName = (itemId) => {
  try {
    if (!itemsLoaded) {
      const itemPath = path.join(__dirname, 'js', 'Item.js')
      const content = fs.readFileSync(itemPath, 'utf-8')
      global.eval(content)
      itemsLoaded = true
    }
    
    const itemData = eval(`Item${itemId}`)
    return itemData && itemData.length > 0 ? itemData[0] : `物品${itemId}`
  } catch (error) {
    return `物品${itemId}`
  }
}

/**
 * 加载配方数据
 */
const loadRecipes = () => {
  if (recipesLoaded) return
  
  const jsFiles = [
    'CookingItem.js',
    'HeulwenEngineeringItem.js',
    'MagicCraftItem.js',
    'BlacksmithItem.js',
    'TailoringItem.js',
    'HandicraftItem.js',
    'PotionMakingItem.js',
    'SynthesisItem.js'
  ]
  
  jsFiles.forEach(fileName => {
    const filePath = path.join(__dirname, 'js', fileName)
    if (fs.existsSync(filePath)) {
      try {
        let encoding = 'utf-8'
        if (['HeulwenEngineeringItem.js', 'MetalConversionItem.js', 'DissolutionItem.js'].includes(fileName)) {
          encoding = 'utf-16le'
        }
        
        const content = fs.readFileSync(filePath, encoding)
        global.eval(content)
      } catch (error) {
        console.warn(`加载${fileName}失败:`, error.message)
      }
    }
  })
  
  recipesLoaded = true
}

/**
 * 查找配方
 */
const findRecipe = (itemId) => {
  loadRecipes()
  
  const skillTypes = [
    'CookingItem',
    'HeulwenEngineeringItem',
    'MagicCraftItem', 
    'BlacksmithItem',
    'TailoringItem',
    'HandicraftItem',
    'PotionMakingItem',
    'SynthesisItem'
  ]
  
  for (const skillType of skillTypes) {
    try {
      const recipe = eval(`${skillType}${itemId}`)
      if (recipe && Array.isArray(recipe)) {
        return { skillType, recipe }
      }
    } catch (e) {
      continue
    }
  }
  
  return null
}

/**
 * 解析配方材料
 */
const parseRecipeMaterials = (recipe, skillType) => {
  const materials = []
  
  if (skillType === 'CookingItem') {
    // 料理配方: [技能类型, 材料ID1, 百分比1, 材料ID2, 百分比2, ...]
    for (let i = 1; i < recipe.length; i += 2) {
      if (recipe[i] && recipe[i + 1] && recipe[i] !== "" && recipe[i + 1] !== "") {
        materials.push({
          id: recipe[i],
          quantity: recipe[i + 1] / 100 // 转换百分比为小数
        })
      }
    }
  } else {
    // 其他技能: [技能等级, [材料ID1, 数量1, 材料ID2, 数量2, ...]]
    if (recipe.length >= 2 && Array.isArray(recipe[1])) {
      const materialArray = recipe[1]
      for (let i = 0; i < materialArray.length; i += 2) {
        if (materialArray[i] && materialArray[i + 1]) {
          materials.push({
            id: materialArray[i],
            quantity: materialArray[i + 1]
          })
        }
      }
    }
  }
  
  return materials
}

/**
 * 递归计算基础材料
 */
const calculateMaterials = (itemId, quantity, finalMaterials, isDeepAnalyze, depth = 0, processed = new Set()) => {
  const result = {}
  const maxDepth = isDeepAnalyze ? 15 : 2
  
  // 防止过深递归和循环引用
  if (depth > maxDepth || processed.has(itemId)) {
    const itemName = getItemName(itemId)
    result[itemName] = quantity
    return result
  }
  
  processed.add(itemId)
  
  const itemName = getItemName(itemId)
  
  // 如果是最终材料，不再分解
  if (finalMaterials.includes(itemName)) {
    result[itemName] = quantity
    processed.delete(itemId)
    return result
  }
  
  // 查找配方
  const recipeInfo = findRecipe(itemId)
  if (!recipeInfo) {
    // 没有配方，作为基础材料
    result[itemName] = quantity
    processed.delete(itemId)
    return result
  }
  
  const { skillType, recipe } = recipeInfo
  const materials = parseRecipeMaterials(recipe, skillType)
  
  // 递归处理每个材料
  for (const material of materials) {
    const neededQuantity = quantity * material.quantity
    const subResult = calculateMaterials(material.id, neededQuantity, finalMaterials, isDeepAnalyze, depth + 1, new Set(processed))
    
    // 合并结果
    for (const [matName, matQuantity] of Object.entries(subResult)) {
      result[matName] = (result[matName] || 0) + matQuantity
    }
  }
  
  processed.delete(itemId)
  return result
}

/**
 * 格式化结果
 */
const formatResult = (itemName, quantity, finalMaterials, materials) => {
  let output = `📊 ${itemName} (x${quantity}) 的基础材料统计:\n`
  
  if (finalMaterials.length > 0) {
    output += `🔒 最终材料设置: ${finalMaterials.join(', ')}\n`
  }
  
  output += `\n📋 所需基础材料:\n`
  
  const materialEntries = Object.entries(materials)
  if (materialEntries.length === 0) {
    output += `  无需额外材料`
  } else {
    materialEntries
      .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
      .forEach(([materialName, amount]) => {
        const formattedAmount = amount % 1 === 0 ? amount.toString() : amount.toFixed(2)
        output += `  • ${materialName}: ${formattedAmount}\n`
      })
  }
  
  return output.trim()
}

/**
 * 主查询函数
 */
const queryMaterials = (content, callback) => {
  if (!content.trim()) {
    callback('请提供查询内容')
    return
  }
  
  try {
    // 解析查询内容
    let itemName = content.trim()
    let finalMaterials = []
    let quantity = 1
    
    // 检查最终材料设置
    const finalMaterialsMatch = content.match(/\[([^\]]+)\]/)
    if (finalMaterialsMatch) {
      itemName = content.replace(/\[([^\]]+)\]/, '').trim()
      finalMaterials = finalMaterialsMatch[1]
        .split(',')
        .map(m => m.trim())
        .filter(m => m)
    }
    
    // 检查数量设置
    const quantityMatch = itemName.match(/^(.+)\*(\d+)$/)
    if (quantityMatch) {
      itemName = quantityMatch[1].trim()
      quantity = parseInt(quantityMatch[2])
    }
    
    // 查找物品ID
    const itemId = findItemId(itemName)
    if (!itemId) {
      callback(`未找到物品: ${itemName}`)
      return
    }
    
    // 判断是否需要深度分析
    const isDeepAnalyze = itemName.startsWith('释魂')
    
    // 计算材料
    const materials = calculateMaterials(itemId, quantity, finalMaterials, isDeepAnalyze)
    
    // 格式化并返回结果
    const result = formatResult(itemName, quantity, finalMaterials, materials)
    callback(result)
    
  } catch (error) {
    console.error('MBC查询错误:', error)
    callback(`计算基础材料时发生错误: ${error.message}`)
  }
}

module.exports = {
  queryMaterials
}
