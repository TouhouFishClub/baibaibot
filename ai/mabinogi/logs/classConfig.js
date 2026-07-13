// 职业判定技能配置：命中任一技能即视为该职业（按顺序匹配，先命中先返回）
// 职业体系更新时只需改此文件
const CLASSES = [
  { name: '元素骑士', skills: ['突进斩', '雷霆重击'] },
  { name: '圣光颂唱者', skills: ['净化传播'] },
  { name: '黑魔导士', skills: ['龙炎', '闪电链'] },
  { name: '流星射手', skills: ['爆炎箭', '水流箭'] },
  { name: '圣盾骑士', skills: ['铁壁猛击', '审判一击'] },
  { name: '爆裂骑士枪', skills: ['爆裂冲刺', '湮灭'] },
  { name: '枪炮师', skills: ['致命狙击', '迅捷射击'] },
  { name: '禁术炼金师', skills: ['螺旋爆裂', '化学狂欢'] }
]

const UNKNOWN_CLASS = '未知'

module.exports = {
  CLASSES,
  UNKNOWN_CLASS
}
