const { buildSkillBreakdownFromTargets } = require('../skillBreakdown')

const targets = [{
  attackers: [{
    id: 'c1',
    isPC: true,
    skillsDetail: [
      { name: '龙炎', hitRecords: [{ damage: 500 }, { damage: 300 }] },
      { name: '闪电链', hitRecords: [{ damage: 200 }] },
      { name: '火球', totalDamage: 100 }
    ]
  }]
}]

const skills = buildSkillBreakdownFromTargets(targets, 'c1')
console.log(JSON.stringify(skills, null, 2))
console.log('ok', skills[0].name === '龙炎' && Math.abs(skills[0].percent - 72.727) < 0.01)
