/**
 * 群友画像人格展示（对齐 astrbot scrapbook 默认 SBTI 模式）
 * LLM 仍输出 MBTI 四字母，卡片展示映射后的娱乐向 SBTI
 * @see https://github.com/SXP-Simon/astrbot_plugin_qq_group_daily_analysis
 */

/** MBTI -> SBTI（娱乐向） */
const SBTI_BY_MBTI = {
  INTJ: { code: 'CTRL', name_zh: '拿捏者' },
  INTP: { code: 'THIN-K', name_zh: '思考者' },
  ENTJ: { code: 'BOSS', name_zh: '领导者' },
  ENTP: { code: 'JOKE-R', name_zh: '小丑' },
  INFJ: { code: 'LOVE-R', name_zh: '多情者' },
  INFP: { code: 'SOLO', name_zh: '孤儿' },
  ENFJ: { code: 'THAN-K', name_zh: '感恩者' },
  ENFP: { code: 'GOGO', name_zh: '行者' },
  ISTJ: { code: 'OH-NO', name_zh: '哦不人' },
  ISTP: { code: 'POOR', name_zh: '贫困者' },
  ESTJ: { code: 'SHIT', name_zh: '愤世者' },
  ESTP: { code: 'WOC', name_zh: '握草人' },
  ISFJ: { code: 'MUM', name_zh: '妈妈' },
  ISFP: { code: 'MALO', name_zh: '吗喽' },
  ESFJ: { code: 'ATM-er', name_zh: '送钱者' },
  ESFP: { code: 'SEXY', name_zh: '尤物' }
}

/** MBTI 中文名（mbti 展示模式备用） */
const MBTI_NAME_ZH = {
  INTJ: '建筑师', INTP: '逻辑学家', ENTJ: '指挥官', ENTP: '辩论家',
  INFJ: '提倡者', INFP: '调停者', ENFJ: '主人公', ENFP: '竞选者',
  ISTJ: '物流师', ISFJ: '守卫者', ESTJ: '总经理', ESFP: '表演者',
  ISTP: '鉴赏家', ISFP: '探险家', ESFJ: '执政官', ESTP: '企业家'
}

function normalizeMbti(mbti) {
  const key = String(mbti || '').trim().toUpperCase().replace(/[^A-Z]/g, '')
  return key.length === 4 ? key : ''
}

function formatDisplay(code, nameZh) {
  return nameZh ? code + '（' + nameZh + '）' : code
}

/**
 * @param {string} mbti - LLM 给出的四字母 MBTI
 * @param {'sbti'|'mbti'} [mode]
 */
function resolveProfileInfo(mbti, mode = 'sbti') {
  const key = normalizeMbti(mbti)
  if (!key) {
    return { mbti: '', profile_code: '', profile_display: '', profile_mode: mode }
  }

  if (mode === 'mbti') {
    const nameZh = MBTI_NAME_ZH[key] || ''
    return {
      mbti: key,
      profile_code: key,
      profile_display: formatDisplay(key, nameZh),
      profile_mode: 'mbti'
    }
  }

  const sbti = SBTI_BY_MBTI[key]
  if (!sbti) {
    return {
      mbti: key,
      profile_code: key,
      profile_display: key,
      profile_mode: 'sbti'
    }
  }

  return {
    mbti: key,
    profile_code: sbti.code,
    profile_display: formatDisplay(sbti.code, sbti.name_zh),
    profile_mode: 'sbti'
  }
}

function enrichTitleProfile(title, mode = 'sbti') {
  if (!title || typeof title !== 'object') return title
  const profile = resolveProfileInfo(title.mbti, mode)
  return Object.assign({}, title, profile)
}

function enrichTitlesProfiles(titles, mode = 'sbti') {
  if (!Array.isArray(titles)) return []
  return titles.map(t => enrichTitleProfile(t, mode))
}

module.exports = {
  SBTI_BY_MBTI,
  MBTI_NAME_ZH,
  normalizeMbti,
  resolveProfileInfo,
  enrichTitleProfile,
  enrichTitlesProfiles
}
