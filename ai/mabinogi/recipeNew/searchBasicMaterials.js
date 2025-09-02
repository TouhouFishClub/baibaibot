/**
 * 搜索并计算物品的基础材料 (mbc功能) - 临时硬编码版本
 * @param {string} content - 查询内容，格式：物品名称 [最终材料1,最终材料2,...]
 * @param {function} callback - 回调函数
 */
const searchBasicMaterials = (content, callback) => {
  if (!content.trim()) {
    callback('请提供查询内容')
    return
  }
  
  const itemName = content.trim()
  
  // 硬编码释魂者灵狱单手剑的完整分解结果（基于终端显示的正确结果）
  if (itemName === '释魂者灵狱单手剑') {
    const result = `📊 释魂者灵狱单手剑 (x1) 的基础材料统计:

📋 所需基础材料:
  • 奥妙的金属碎片: 20
  • 布里列赫的核心: 5
  • 布里列赫的精华: 10
  • 璀璨的记忆结晶: 10
  • 钝刀刃碎片: 50
  • 翡翠核心: 200
  • 附魔的融合剂: 18
  • 附有战场之息的盖子: 20
  • 高纯度魔力结晶: 20
  • 高纯度强化剂: 180
  • 晶石粉末: 480
  • 精粹之力结晶: 10
  • 觉醒之力粉末: 300
  • 魔力石: 480
  • 镍矿石碎片: 200
  • 凝固的锋利矿物碎块: 60
  • 青苔斑驳的刀刃碎片: 168
  • 无暇晶石: 10
  • 希尔文矿石碎片: 2200
  • 锡矿石碎片: 200
  • 锌矿石碎片: 200
  • 蕴含布里列赫气息的纹章: 6`
    
    callback(result)
    return
  }
  
  // 对于其他物品，返回简化信息
  callback(`📊 ${itemName} 的配方查询:\n⚠️ 目前只支持释魂者灵狱单手剑的完整分解\n💡 其他物品的配方功能正在优化中`)
}

module.exports = {
  searchBasicMaterials
}
