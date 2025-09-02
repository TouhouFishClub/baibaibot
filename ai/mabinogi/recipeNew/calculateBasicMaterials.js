const { getItems } = require('./ExportItems')
const fs = require('fs')
const path = require('path')

// 加载所有配方数据到全局作用域
const loadRecipeData = () => {
  const jsFiles = [
    'Item.js', // 首先加载物品数据
    'CookingItem.js',
    'BlacksmithItem.js', 
    'TailoringItem.js',
    'WeavingItem.js',
    'CarpentryItem.js',
    'HandicraftItem.js',
    'PotionMakingItem.js',
    'RefineItem.js',
    'SynthesisItem.js',
    'MagicCraftItem.js',
    'StationaryCraftItem.js',
    'FynnsCraftItem.js',
    'ManaFormingItem.js',
    'HeulwenEngineeringItem.js',
    'StageTicketMakingItem.js',
    'MillingItem.js',
    'MetalConversionItem.js',
    'DissolutionItem.js',
    'RelicInvestigationItem.js',
    'ErgEnhance.js'
  ]
  
  jsFiles.forEach(fileName => {
    const filePath = path.join(__dirname, 'js', fileName)
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        // 使用全局eval确保变量定义在全局作用域
        global.eval(content)
      } catch (error) {
        console.warn(`加载配方文件失败: ${fileName}`, error.message)
      }
    }
  })
}

// 初始化时加载配方数据
loadRecipeData()

/**
 * 计算物品的实际基础材料需求 (mbc功能)
 * @param {string} itemName - 物品名称
 * @param {Array} finalMaterials - 最终材料列表（这些材料不再继续分解）
 * @param {number} quantity - 需要的数量，默认为1
 * @returns {Object} 包含基础材料统计的对象
 */
const calculateBasicMaterials = (itemName, finalMaterials = [], quantity = 1) => {
  const { ItemNameToItemId, ItemIdToItemDetail } = getItems()
  
  if (!ItemNameToItemId.has(itemName)) {
    throw new Error(`未找到物品: ${itemName}`)
  }
  
  const itemId = ItemNameToItemId.get(itemName)
  const finalMaterialsSet = new Set(finalMaterials)
  const result = {}
  const processedItems = new Set() // 防止循环引用
  
  /**
   * 递归计算材料
   * @param {number} currentItemId - 当前物品ID
   * @param {number} currentQuantity - 当前需要的数量
   * @param {string} currentItemName - 当前物品名称
   */
  const calculateMaterials = (currentItemId, currentQuantity, currentItemName) => {
    // 防止循环引用
    const itemKey = `${currentItemId}-${currentQuantity}`
    if (processedItems.has(itemKey)) {
      return
    }
    processedItems.add(itemKey)
    
    // 如果是最终材料，直接计入结果
    if (finalMaterialsSet.has(currentItemName)) {
      result[currentItemName] = (result[currentItemName] || 0) + currentQuantity
      return
    }
    
    // 查找配方
    const recipeFound = findRecipe(currentItemId)
    
    if (!recipeFound) {
      // 没有配方，当作基础材料
      result[currentItemName] = (result[currentItemName] || 0) + currentQuantity
      return
    }
    
    const { recipe, materials, skillType } = recipeFound
    
    // 递归计算每个材料
    materials.forEach(material => {
      const materialItem = ItemIdToItemDetail.get(material.id)
      let materialName = materialItem ? materialItem.name : null
      
      // 如果在ItemIdToItemDetail中找不到，尝试从Item.js中获取
      if (!materialName) {
        try {
          const itemData = eval(`Item${material.id}`)
          if (itemData && itemData.length > 0) {
            materialName = itemData[0]
          }
        } catch (e) {
          // 找不到物品定义
        }
      }
      
      if (materialName) {
        const neededQuantity = currentQuantity * (material.percentage / 100)
        calculateMaterials(material.id, neededQuantity, materialName)
      }
    })
  }
  
  /**
   * 查找物品的配方
   * @param {number} itemId - 物品ID
   * @returns {Object|null} 配方信息或null
   */
  const findRecipe = (itemId) => {
    try {
      // 尝试各种技能的配方
      const skillTypes = [
        'CookingItem',
        'BlacksmithItem', 
        'TailoringItem',
        'WeavingItem',
        'CarpentryItem',
        'HandicraftItem',
        'PotionMakingItem',
        'RefineItem',
        'SynthesisItem',
        'MagicCraftItem',
        'StationaryCraftItem',
        'FynnsCraftItem',
        'ManaFormingItem',
        'HeulwenEngineeringItem',
        'StageTicketMakingItem',
        'MillingItem',
        'MetalConversionItem',
        'DissolutionItem',
        'RelicInvestigationItem',
        'ErgEnhance'
      ]
      
      for (const skillType of skillTypes) {
        try {
          const recipeVarName = `${skillType}${itemId}`
          const recipe = eval(recipeVarName)
          
          if (recipe && Array.isArray(recipe) && recipe.length > 1) {
            // 解析配方数据
            const materials = []
            
            if (skillType === 'CookingItem') {
              // 料理配方格式: [技能类型, 材料1ID, 材料1比例, 材料2ID, 材料2比例, ...]
              for (let i = 1; i < recipe.length; i += 2) {
                if (recipe[i] && recipe[i + 1] && recipe[i] !== "" && recipe[i + 1] !== "") {
                  materials.push({
                    id: recipe[i],
                    percentage: recipe[i + 1]
                  })
                }
              }
            } else if (skillType === 'MillingItem') {
              // 磨粉配方格式: [材料ID, 数量]
              if (recipe.length >= 2) {
                materials.push({
                  id: recipe[0],
                  percentage: recipe[1] * 100 // 转换为百分比
                })
              }
            } else {
              // 其他技能配方格式可能不同，这里先按通用格式处理
              // 大多数配方格式: [技能等级信息..., 材料1ID, 材料1数量, 材料2ID, 材料2数量, ...]
              // 需要根据具体技能类型来解析，这里简化处理
              for (let i = 1; i < recipe.length; i += 2) {
                if (recipe[i] && recipe[i + 1] && typeof recipe[i] === 'number' && typeof recipe[i + 1] === 'number') {
                  materials.push({
                    id: recipe[i],
                    percentage: recipe[i + 1]
                  })
                }
              }
            }
            
            if (materials.length > 0) {
              return { recipe, materials, skillType }
            }
          }
        } catch (e) {
          // 该技能类型没有这个物品的配方，继续尝试下一个
          continue
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }
  
  // 开始计算
  try {
    calculateMaterials(itemId, quantity, itemName)
    return {
      success: true,
      item: itemName,
      quantity: quantity,
      finalMaterials: Array.from(finalMaterialsSet),
      materials: result
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      item: itemName
    }
  }
}

/**
 * 格式化输出结果
 * @param {Object} result - calculateBasicMaterials的返回结果
 * @returns {string} 格式化的字符串
 */
const formatResult = (result) => {
  if (!result.success) {
    return `❌ 计算失败: ${result.error}`
  }
  
  const { item, quantity, finalMaterials, materials } = result
  
  let output = `📊 ${item} (x${quantity}) 的基础材料统计:\n`
  
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
        // 格式化数量显示
        const formattedAmount = amount % 1 === 0 ? amount.toString() : amount.toFixed(2)
        output += `  • ${materialName}: ${formattedAmount}\n`
      })
  }
  
  return output.trim()
}

module.exports = {
  calculateBasicMaterials,
  formatResult
}
