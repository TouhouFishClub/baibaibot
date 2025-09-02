const { calculateBasicMaterials, formatResult } = require('./calculateBasicMaterials')
const { getItems } = require('./ExportItems')

/**
 * 搜索并计算物品的基础材料 (mbc功能)
 * @param {string} content - 查询内容，格式：物品名称 [最终材料1,最终材料2,...]
 * @param {function} callback - 回调函数
 */
const searchBasicMaterials = (content, callback) => {
  if (!content.trim()) {
    callback('请提供查询内容\n格式：mbc 物品名称 [最终材料1,最终材料2,...]')
    return
  }
  
  try {
    const { ItemNameToItemId, ItemIdToItemDetail } = getItems()
    
    // 解析查询内容
    let itemName = content.trim()
    let finalMaterials = []
    let quantity = 1
    
    // 检查是否有最终材料设置 [材料1,材料2,...]
    const finalMaterialsMatch = content.match(/\[([^\]]+)\]/)
    if (finalMaterialsMatch) {
      itemName = content.replace(/\[([^\]]+)\]/, '').trim()
      finalMaterials = finalMaterialsMatch[1]
        .split(',')
        .map(m => m.trim())
        .filter(m => m)
    }
    
    // 检查是否有数量设置，格式：物品名称*数量
    const quantityMatch = itemName.match(/^(.+)\*(\d+)$/)
    if (quantityMatch) {
      itemName = quantityMatch[1].trim()
      quantity = parseInt(quantityMatch[2])
    }
    
    // 查找物品
    let targetItems = []
    
    // 如果是纯数字，按ID查找
    if (/^\d+$/.test(itemName)) {
      const itemId = parseInt(itemName)
      const itemDetail = ItemIdToItemDetail.get(itemId)
      if (itemDetail) {
        targetItems.push(itemDetail.name)
      }
    } else {
      // 按名称模糊查找
      targetItems = Array.from(ItemNameToItemId.keys())
      itemName.replace(/[， ]/g, ',').split(',').filter(x => x).forEach(keyword => {
        targetItems = targetItems.filter(name => name.includes(keyword))
      })
    }
    
    if (targetItems.length === 0) {
      callback(`未找到物品: ${itemName}`)
      return
    }
    
    if (targetItems.length === 1) {
      // 找到唯一物品，计算基础材料
      const result = calculateBasicMaterials(targetItems[0], finalMaterials, quantity)
      callback(formatResult(result))
    } else {
      // 找到多个物品，显示列表
      const exactMatch = targetItems.filter(name => name === itemName)
      if (exactMatch.length === 1) {
        // 有完全匹配的，直接使用
        const result = calculateBasicMaterials(exactMatch[0], finalMaterials, quantity)
        callback(formatResult(result) + `\n\n💡 找到${targetItems.length}个相关物品，已为您定位到${exactMatch[0]}`)
      } else {
        // 显示物品列表
        const itemList = targetItems.slice(0, 10).map(name => {
          const itemId = ItemNameToItemId.get(name)
          return `mbc ${itemId} | ${name}`
        }).join('\n')
        
        callback(`找到${targetItems.length}个相关物品:\n${itemList}\n\n💡 使用格式: mbc 物品名称 [最终材料1,最终材料2,...]`)
      }
    }
    
  } catch (error) {
    console.error('mbc查询错误:', error)
    callback(`计算基础材料时发生错误: ${error.message}`)
  }
}

module.exports = {
  searchBasicMaterials
}
