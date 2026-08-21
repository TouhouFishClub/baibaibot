const assert = require('assert')
const { loadAllRecipes, getAllItems } = require('./dataLoader')
const { findRecipeTargets } = require('./searchRecipe')
const { serializeRecipeForRender } = require('./renderRecipe')

const findOne = (query, recipesByProduct, allItems) => {
  const targets = findRecipeTargets(query, recipesByProduct, allItems)
  assert.strictEqual(targets.length, 1, `${query} 应唯一命中，实际 ${targets.length}`)
  return targets[0]
}

async function test() {
  const [recipesByProduct, allItems] = await Promise.all([
    loadAllRecipes(),
    getAllItems(),
  ])

  assert.strictEqual(allItems.get(4200216).name, '祝福的工艺制品：音乐之神喇叭')
  assert.strictEqual(allItems.get(4200238).name, '发光的奇妙线团')

  const gatedRecipes = []
  for (const recipes of recipesByProduct.values()) {
    gatedRecipes.push(...recipes.filter(recipe =>
      recipe.unlockCondition === 'LifeSpeciality' || recipe.unlockCondition === 'Master'
    ))
  }

  assert.strictEqual(gatedRecipes.length, 45, 'R142 应包含 45 条名匠/特化配方')
  assert.strictEqual(gatedRecipes.filter(r => r.unlockCondition === 'LifeSpeciality').length, 27)
  assert.strictEqual(gatedRecipes.filter(r => r.unlockCondition === 'Master').length, 18)

  const unresolved = gatedRecipes.flatMap(recipe =>
    [...(recipe.materials || []), ...(recipe.completeMaterials || [])]
      .filter(material => material.id === 0)
      .map(material => `${recipe.title}: ${material.name}`)
  )
  assert.deepStrictEqual(unresolved, [], `存在未解析材料: ${unresolved.join(', ')}`)

  const azurite = findOne('特化：冶炼蓝铜块', recipesByProduct, allItems)
  assert.strictEqual(azurite.id, 5100398)
  assert.ok(azurite.recipes.every(r => r.unlockCondition === 'LifeSpeciality'))

  const knife = findOne('特化：坚固的采集用小刀', recipesByProduct, allItems)
  assert.strictEqual(knife.id, 41159)
  assert.ok(knife.recipes.every(r => r.unlockCondition === 'LifeSpeciality'))

  const gayageum = findOne('名匠：伽倻琴', recipesByProduct, allItems)
  assert.strictEqual(gayageum.id, 1080062)
  assert.ok(gayageum.recipes.every(r => r.unlockCondition === 'Master'))

  const lining = findOne('名匠：名匠的内衬', recipesByProduct, allItems)
  assert.strictEqual(lining.id, 5041105)
  assert.ok(lining.recipes.every(r => r.unlockCondition === 'Master'))

  const mushroomStew = findOne('名匠：记忆之蘑菇炖菜', recipesByProduct, allItems)
  assert.strictEqual(mushroomStew.id, 5010184)
  assert.ok(mushroomStew.recipes.every(r => r.unlockCondition === 'Master'))

  const renderedRecipe = serializeRecipeForRender(mushroomStew.recipes[0])
  assert.strictEqual(renderedRecipe.unlockCondition, 'Master')
  assert.strictEqual(renderedRecipe.specialityEffectValueId, 11)

  console.log(`R142 验证通过: ${gatedRecipes.length} 条名匠/特化配方，${allItems.size} 个物品`)
}

test().catch(err => {
  console.error(err)
  process.exitCode = 1
})
