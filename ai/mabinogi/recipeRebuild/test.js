const { loadAllRecipes, getAllItems, getNameToIds } = require('./dataLoader')

async function test() {
  try {
    console.log('=== 加载物品数据 ===')
    const allItems = await getAllItems()
    console.log(`物品总数: ${allItems.size}`)
    
    // 显示一些样本物品
    let count = 0
    for (const [id, item] of allItems) {
      if (count++ >= 5) break
      console.log(`  ${id}: ${item.name} [${item.category.substring(0, 50)}...]`)
    }

    console.log('\n=== 加载配方数据 ===')
    const recipes = await loadAllRecipes()
    console.log(`配方产品数: ${recipes.size}`)
    
    // 显示一些样本配方
    count = 0
    for (const [productId, recipeList] of recipes) {
      if (count++ >= 5) break
      const item = allItems.get(productId)
      const name = item ? item.name : '未知'
      console.log(`  ${productId}: ${name} (${recipeList.length}个配方)`)
      for (const r of recipeList) {
        console.log(`    - ${r.skillName} [${r.type}] 材料: ${r.materials.map(m => `${m.name}x${m.count}`).join(', ')}`)
      }
    }

    console.log('\n=== 搜索测试: "薄布" ===')
    const nameToIds = await getNameToIds()
    const searchTerm = '薄布'
    const matched = Array.from(nameToIds.keys()).filter(name => name.includes(searchTerm))
    console.log(`匹配名称: ${matched.join(', ')}`)
    for (const name of matched.slice(0, 3)) {
      const ids = nameToIds.get(name)
      for (const id of ids) {
        if (recipes.has(id)) {
          console.log(`  ${name} (${id}) 有 ${recipes.get(id).length} 个配方`)
        }
      }
    }

    console.log('\n=== 搜索测试: 物品ID 15020 ===')
    const item15020 = allItems.get(15020)
    if (item15020) {
      console.log(`物品: ${item15020.name}`)
      if (recipes.has(15020)) {
        const r = recipes.get(15020)
        console.log(`配方数: ${r.length}`)
        for (const recipe of r) {
          console.log(`  ${recipe.skillName} - ${recipe.title || recipe.manualName || ''}`)
          console.log(`  材料: ${recipe.materials.map(m => `${m.name}x${m.count}`).join(', ')}`)
          if (recipe.completeMaterials && recipe.completeMaterials.length) {
            console.log(`  完成材料: ${recipe.completeMaterials.map(m => `${m.name}x${m.count}`).join(', ')}`)
          }
        }
      }
    }

    console.log('\n=== 测试完成 ===')
  } catch (err) {
    console.error('测试错误:', err)
  }
}

test()
