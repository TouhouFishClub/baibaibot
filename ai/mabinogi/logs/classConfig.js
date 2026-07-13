// 职业判定技能配置：命中任一技能即视为该职业（按顺序匹配，先命中先返回）
// 职业体系更新时只需改此文件
const CLASSES = [
  { name: '元素骑士', aliases: ['魔剑'], skills: ['突进斩', '雷霆重击'] },
  { name: '圣光颂唱者', aliases: ['圣歌', '奶'], skills: ['净化传播'] },
  { name: '黑魔导士', aliases: ['黑魔', '法师'], skills: ['龙炎', '闪电链'] },
  { name: '流星射手', aliases: ['弓', '流子', '瘤子'], skills: ['爆炎箭', '水流箭'] },
  { name: '圣盾骑士', aliases: ['圣盾', 'T', '坦克'], skills: ['铁壁猛击', '审判一击'] },
  { name: '爆裂骑士枪', aliases: ['骑士枪', '骑枪', '铳枪', '爆骑'], skills: ['爆裂冲刺', '湮灭'] },
  { name: '枪炮师', aliases: ['双枪', '枪炮'], skills: ['致命狙击', '迅捷射击'] },
  { name: '禁术炼金师', aliases: ['炼金'], skills: ['螺旋爆裂', '化学狂欢'] }
]

const UNKNOWN_CLASS = '未知'

function resolveClassQuery(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return null

  for (const cls of CLASSES) {
    const names = [cls.name, ...(cls.aliases || [])]
    if (names.some(name => name === kw)) {
      return cls.name
    }
  }

  for (const cls of CLASSES) {
    const names = [cls.name, ...(cls.aliases || [])]
    if (names.some(name => kw.includes(name) || name.includes(kw))) {
      return cls.name
    }
  }

  return kw
}

function formatClassHelpLine(cls) {
  if (!cls.aliases?.length) return cls.name
  return `${cls.name}（${cls.aliases.join('、')}）`
}

module.exports = {
  CLASSES,
  UNKNOWN_CLASS,
  resolveClassQuery,
  formatClassHelpLine
}
