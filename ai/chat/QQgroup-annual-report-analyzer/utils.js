/**
 * 工具函数模块
 */

/**
 * 提取文本中的emoji
 * @param {string} text 
 * @returns {string[]}
 */
function extractEmojis(text) {
  if (!text) return []
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2300}-\u{23FF}]/gu
  return text.match(emojiRegex) || []
}

/**
 * 判断字符是否为emoji
 * @param {string} char 
 * @returns {boolean}
 */
function isEmoji(char) {
  if (!char || char.length !== 1) return false
  const code = char.codePointAt(0)
  const emojiRanges = [
    [0x1F600, 0x1F64F], [0x1F300, 0x1F5FF], [0x1F680, 0x1F6FF],
    [0x1F1E0, 0x1F1FF], [0x2702, 0x27B0], [0x1F900, 0x1F9FF],
    [0x1FA00, 0x1FA6F], [0x1FA70, 0x1FAFF], [0x2600, 0x26FF], [0x2300, 0x23FF]
  ]
  return emojiRanges.some(([start, end]) => code >= start && code <= end)
}

/**
 * 清理文本，去除表情、@、回复等干扰内容
 * @param {string} text 
 * @returns {string}
 */
function cleanText(text) {
  if (!text) return ''
  
  // 去除CQ码（更宽松的匹配）
  text = text.replace(/\[CQ:[^\]]*\]/gi, '')
  
  // 去除常见的QQ消息标记（如 [QQ红包]、[图片]、[表情]、[疑问]、[码字] 等）
  text = text.replace(/\[[^\[\]]{1,20}\]/g, '')
  
  // 去除回复标记
  text = text.replace(/\[回复[^\]]*\]/g, '')
  
  // 去除@某人
  text = text.replace(/@[^\s\n]*\s*/g, '')
  
  // 循环去除所有剩余的方括号内容（处理嵌套）
  let prev = null
  while (prev !== text) {
    prev = text
    text = text.replace(/\[[^\[\]]*\]/g, '')
  }
  
  // 去除残留的各种括号（半角+全角）
  text = text.replace(/[\[\]【】《》<>〈〉「」『』（）()\{\}｛｝［］＜＞]/g, '')
  
  // 去除链接
  text = text.replace(/https?:\/\/\S+/g, '')
  text = text.replace(/www\.\S+/g, '')
  
  // 去除多余空白
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * 从时间戳获取小时数
 * @param {Date|number} timestamp 
 * @returns {number|null}
 */
function parseTimestamp(timestamp) {
  try {
    const date = new Date(timestamp)
    // 转换为东八区
    const utcHours = date.getUTCHours()
    const localHours = (utcHours + 8) % 24
    return localHours
  } catch (e) {
    return null
  }
}

/**
 * 计算信息熵
 * @param {Map|Object} neighborFreq 
 * @returns {number}
 */
function calculateEntropy(neighborFreq) {
  const values = neighborFreq instanceof Map 
    ? Array.from(neighborFreq.values()) 
    : Object.values(neighborFreq)
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  
  let entropy = 0
  for (const freq of values) {
    const p = freq / total
    if (p > 0) {
      entropy -= p * Math.log2(p)
    }
  }
  return entropy
}

/**
 * 清理文件名中的非法字符
 * @param {string} filename 
 * @returns {string}
 */
function sanitizeFilename(filename) {
  if (!filename) return '未命名'
  const illegalChars = '<>:"/\\|?*'
  let sanitized = filename
  for (const char of illegalChars) {
    sanitized = sanitized.split(char).join('_')
  }
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '')
  return sanitized || '未命名'
}

/**
 * 分析单字的独立出现情况
 * @param {string[]} texts 
 * @returns {Object}
 */
function analyzeSingleChars(texts) {
  const totalCount = new Map()
  const soloCount = new Map()
  const boundaryCount = new Map()
  // 标点符号集合（包含中英文标点）
  // 使用Unicode避免引号解析问题：\u2018=左单引号 \u2019=右单引号 \u201c=左双引号 \u201d=右双引号
  const punctuationChars = '\uff0c\u3002\uff01\uff1f\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09,.!?;:()[]【】《》<>…—～·\'"'
  const punctuation = new Set(punctuationChars.split(''))
  const charRegex = /^[\u4e00-\u9fffa-zA-Z]$/

  for (const text of texts) {
    // 统计每个字的总出现次数
    for (const char of text) {
      if (charRegex.test(char)) {
        totalCount.set(char, (totalCount.get(char) || 0) + 1)
      }
    }
    
    // 统计单字消息
    const cleanChars = Array.from(text).filter(c => charRegex.test(c))
    if (cleanChars.length === 1) {
      soloCount.set(cleanChars[0], (soloCount.get(cleanChars[0]) || 0) + 1)
    }
    
    // 统计在边界位置的出现
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (!charRegex.test(char)) continue
      
      const leftOk = i === 0 || punctuation.has(text[i-1]) || /\s/.test(text[i-1])
      const rightOk = i === text.length - 1 || punctuation.has(text[i+1]) || /\s/.test(text[i+1])
      
      if (leftOk && rightOk) {
        boundaryCount.set(char, (boundaryCount.get(char) || 0) + 1)
      }
    }
  }

  const result = {}
  for (const [char, total] of totalCount) {
    const solo = soloCount.get(char) || 0
    const boundary = boundaryCount.get(char) || 0
    const independent = solo + boundary * 0.5
    const ratio = total > 0 ? independent / total : 0
    result[char] = { total, independent, ratio }
  }
  
  return result
}

/**
 * 格式化数字（添加千位分隔符）
 * @param {number} value 
 * @returns {string}
 */
function formatNumber(value) {
  try {
    return parseInt(value).toLocaleString()
  } catch (e) {
    return String(value)
  }
}

/**
 * 截断文本
 * @param {string} text 
 * @param {number} length 
 * @returns {string}
 */
function truncateText(text, length = 50) {
  if (!text) return ''
  text = text.replace(/\n/g, ' ').trim()
  if (text.length > length) {
    return text.substring(0, length) + '...'
  }
  return text
}

/**
 * 获取QQ头像URL
 * @param {string|number} uin 
 * @returns {string}
 */
function getAvatarUrl(uin) {
  return `https://q1.qlogo.cn/g?b=qq&nk=${uin}&s=640`
}

/**
 * 随机选择备用锐评
 * @param {string[]} comments 
 * @returns {string}
 */
function getRandomComment(comments) {
  return comments[Math.floor(Math.random() * comments.length)]
}

module.exports = {
  extractEmojis,
  isEmoji,
  cleanText,
  parseTimestamp,
  calculateEntropy,
  sanitizeFilename,
  analyzeSingleChars,
  formatNumber,
  truncateText,
  getAvatarUrl,
  getRandomComment
}

