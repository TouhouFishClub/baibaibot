const assert = require('assert')
const { CLASSES } = require('../classConfig')
const {
  REVIEW_TIERS,
  resolveAiReviewCommand,
  buildReviewSystemPrompt,
  normalizeReview
} = require('../aiReview')
const { generateAiReviewHtml } = require('../renderAiReview')

function run() {
  assert.deepStrictEqual(resolveAiReviewCommand('AI 锐评'), { force: false })
  assert.deepStrictEqual(resolveAiReviewCommand('重新生成AI锐评'), { force: true })
  assert.strictEqual(resolveAiReviewCommand('AI分析'), null)

  const review = normalizeReview({
    title: '模型不应覆盖固定标题',
    tiers: [
      {
        label: '夯',
        classes: [
          { name: CLASSES[0].name, verdict: '<强>', evidence: '全榜前列', bossFit: '站桩', roast: '很夯' },
          { name: CLASSES[0].name, verdict: '重复项' }
        ]
      }
    ]
  })

  const names = review.tiers.flatMap(tier => tier.classes.map(item => item.name))
  assert.deepStrictEqual(review.tiers.map(tier => tier.label), REVIEW_TIERS)
  assert.strictEqual(review.title, '从夯到拉，各阿尔卡纳职业对比')
  assert.strictEqual(names.length, CLASSES.length)
  assert.strictEqual(new Set(names).size, CLASSES.length)

  const prompt = buildReviewSystemPrompt()
  assert(prompt.includes('每个职业恰好出现一次'))
  assert(prompt.includes('current.bosses[].top20'))
  assert(prompt.includes('只评价其可观测伤害侧'))

  const html = generateAiReviewHtml(review)
  assert(html.includes('从夯到拉，各阿尔卡纳职业对比'))
  assert(html.includes('&lt;强&gt;'))
  assert(!html.includes('<强>'))

  console.log(`aiReviewUnit: ${names.length} classes, ${review.tiers.length} tiers passed`)
}

run()
