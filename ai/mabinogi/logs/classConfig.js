// 职业判定技能配置：命中任一技能即视为该职业（按顺序匹配，先命中先返回）
// 职业体系更新时只需改此文件
const CLASSES = [
  { name: '元素骑士', aliases: ['魔剑'], skills: ['突进斩', '雷霆重击'], theme: { primary: '#FF3B2F', secondary: '#FFB020' } },
  { name: '圣光颂唱者', aliases: ['圣歌', '奶'], skills: ['净化传播'], theme: { primary: '#2EC8FF', secondary: '#A8F0FF' } },
  { name: '黑魔导士', aliases: ['黑魔', '法师'], skills: ['龙炎', '闪电链'], theme: { primary: '#9B2DFF', secondary: '#E85AFF' } },
  { name: '流星射手', aliases: ['弓', '流子', '瘤子'], skills: ['爆炎箭', '水流箭'], theme: { primary: '#FFD84A', secondary: '#FFF3A0' } },
  { name: '圣盾骑士', aliases: ['圣盾', 'T', '坦克'], skills: ['铁壁猛击', '审判一击'], theme: { primary: '#F0A020', secondary: '#FFE08A' } },
  { name: '爆裂骑士枪', aliases: ['骑士枪', '骑枪', '铳枪', '爆骑'], skills: ['爆裂冲刺', '湮灭'], theme: { primary: '#1AD4C0', secondary: '#7FF5E0' } },
  { name: '枪炮师', aliases: ['双枪', '枪炮'], skills: ['致命狙击', '迅捷射击'], theme: { primary: '#7B6CFF', secondary: '#C4B8FF' } },
  { name: '禁术炼金师', aliases: ['炼金'], skills: ['螺旋爆裂', '化学狂欢'], theme: { primary: '#C5D12A', secondary: '#F0E060' } },
  { name: '旋律操纵师', aliases: ['旋律', '操纵师', '人偶', '颂乐人偶'], skills: ['灵线织网'], theme: { primary: '#FF4FA3', secondary: '#4DE8D0' } },
  { name: '狂怒斗士', aliases: ['狂怒', '斗士', '格斗', '炎拳', '拳套'], skills: ['疾风突刺', '烈焰三击'], theme: { primary: '#E01830', secondary: '#8B0A28' } }
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
  // return `${cls.name}（${cls.aliases.join('、')}）`
  return `${cls.name}`
}

const UNKNOWN_THEME = { primary: '#6B7280', secondary: '#9CA3AF' }

function getClassTheme(className) {
  const name = String(className || '').trim()
  if (!name || name === UNKNOWN_CLASS) return UNKNOWN_THEME
  const found = CLASSES.find(cls => cls.name === name)
  return found?.theme || UNKNOWN_THEME
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '')
  if (raw.length !== 6) return `rgba(107, 114, 128, ${alpha})`
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

module.exports = {
  CLASSES,
  UNKNOWN_CLASS,
  UNKNOWN_THEME,
  resolveClassQuery,
  formatClassHelpLine,
  getClassTheme,
  hexToRgba
}
