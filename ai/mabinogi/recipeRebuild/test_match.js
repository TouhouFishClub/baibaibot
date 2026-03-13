const { loadAllItems, matchCategory } = require('./dataLoader')

async function test() {
  const items = await loadAllItems()
  
  // 查找 yarn 相关物品
  const yarnItems = []
  const leatherItems = []
  for (const [id, item] of items) {
    if (item.category.includes('/weaving/yarn/') || item.category.includes('/spinning/')) {
      yarnItems.push(item)
    }
    if (item.category.includes('/tailor/leather/')) {
      leatherItems.push(item)
    }
  }
  
  console.log('=== Yarn/Spinning 物品 (前10) ===')
  yarnItems.slice(0, 10).forEach(i => console.log(`  ${i.id}: ${i.name} | ${i.category}`))
  
  console.log('\n=== Leather 物品 (前10) ===')
  leatherItems.slice(0, 10).forEach(i => console.log(`  ${i.id}: ${i.name} | ${i.category}`))
  
  // 测试 matchCategory
  console.log('\n=== matchCategory 测试 ===')
  const testCases = [
    ['/material/weaving/yarn/01/*', '/stack_item/material/weaving/yarn/01/'],
    ['/material/tailor/leather/04/*', '/stack_item/material/tailor/leather/04/'],
    ['*/tailor/texture/01/', '/stack_item/material/tailor/texture/01/'],
    ['*/tailor/silk/01/*', '/stack_item/material/tailor/silk/01/'],
    ['/material/spinning/wool/*', '/stack_item/material/spinning/wool/'],
  ]
  
  for (const [pattern, category] of testCases) {
    const result = matchCategory(pattern, category)
    console.log(`  ${result ? 'OK' : 'FAIL'}: pattern="${pattern}" vs category="${category}"`)
  }
}

test()
