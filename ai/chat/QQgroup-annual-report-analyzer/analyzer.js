/**
 * 聊天数据分析器 - Node.js版本
 */

const config = require('./config')
const STOPWORDS = require('./stopwords')
const {
  extractEmojis,
  isEmoji,
  cleanText,
  parseTimestamp,
  calculateEntropy,
  analyzeSingleChars
} = require('./utils')

// 尝试加载jieba分词库
let nodejieba = null
try {
  nodejieba = require('nodejieba')
} catch (e) {
  console.warn('nodejieba未安装，将使用简单分词')
}

/**
 * 简单的中文分词（当nodejieba不可用时）
 * @param {string} text 
 * @returns {string[]}
 */
function simpleCut(text) {
  if (!text) return []
  // 使用正则简单分词：按标点、空格分割，同时保留中文字符
  const words = []
  const segments = text.split(/[\s,，。！？；：、""''（）【】\[\]<>《》\n\r]+/)
  for (const seg of segments) {
    if (seg.trim()) {
      words.push(seg.trim())
    }
  }
  return words
}

/**
 * 分词函数
 * @param {string} text 
 * @returns {string[]}
 */
function cut(text) {
  if (nodejieba) {
    return nodejieba.cut(text)
  }
  return simpleCut(text)
}

class ChatAnalyzer {
  /**
   * @param {Object} options 配置选项
   * @param {string} options.chatName 群聊名称
   * @param {Array} options.messages 消息列表
   * @param {Object} options.userMap uid到昵称的映射
   * @param {boolean} options.useStopwords 是否使用停用词
   */
  constructor(options) {
    this.chatName = options.chatName || '未知群聊'
    this.messages = options.messages || []
    this.userMap = options.userMap || {}
    this.useStopwords = options.useStopwords !== false
    this.stopwords = this.useStopwords ? STOPWORDS : new Set()

    // 统计数据
    this.wordFreq = new Map()
    this.wordSamples = new Map()
    this.wordContributors = new Map()
    this.userMsgCount = new Map()
    this.userCharCount = new Map()
    this.userCharPerMsg = new Map()
    this.userImageCount = new Map()
    this.userForwardCount = new Map()
    this.userReplyCount = new Map()
    this.userRepliedCount = new Map()
    this.userAtCount = new Map()
    this.userAtedCount = new Map()
    this.userEmojiCount = new Map()
    this.userLinkCount = new Map()
    this.userNightCount = new Map()
    this.userMorningCount = new Map()
    this.userRepeatCount = new Map()
    this.hourDistribution = new Map()
    this.discoveredWords = new Set()
    this.mergedWords = new Map()
    this.singleCharStats = {}
    this.cleanedTexts = []
  }

  /**
   * 获取用户名称
   * @param {string|number} uid 
   * @returns {string}
   */
  getName(uid) {
    return this.userMap[uid] || `用户${uid}`
  }

  /**
   * 执行分析
   */
  analyze() {
    console.log(`📊 开始分析: ${this.chatName}`)
    console.log(`📝 消息总数: ${this.messages.length}`)

    console.log('🧹 预处理文本...')
    this._preprocessTexts()

    console.log('🔤 分析单字独立性...')
    this.singleCharStats = analyzeSingleChars(this.cleanedTexts)

    console.log('🔍 新词发现...')
    this._discoverNewWords()

    console.log('🔗 词组合并...')
    this._mergeWordPairs()

    console.log('📈 分词统计...')
    this._tokenizeAndCount()

    console.log('🎮 趣味统计...')
    this._funStatistics()

    console.log('🧹 过滤整理...')
    this._filterResults()

    console.log('✅ 分析完成!')
  }

  /**
   * 预处理所有文本
   */
  _preprocessTexts() {
    for (const msg of this.messages) {
      const text = msg.d || ''
      const cleaned = cleanText(text)
      if (cleaned && cleaned.length >= 1) {
        this.cleanedTexts.push(cleaned)
      }
    }
    console.log(`   有效文本: ${this.cleanedTexts.length} 条`)
  }

  /**
   * 新词发现
   */
  _discoverNewWords() {
    const ngramFreq = new Map()
    const leftNeighbors = new Map()
    const rightNeighbors = new Map()
    let totalChars = 0

    for (const text of this.cleanedTexts) {
      const sentences = text.split(/[，。！？、；：""''（）\s\n\r,.!?()\[\]]+/)
      for (const sentence of sentences) {
        const trimmed = sentence.trim()
        if (trimmed.length < 2) continue
        totalChars += trimmed.length

        for (let n = 2; n <= Math.min(5, trimmed.length); n++) {
          for (let i = 0; i <= trimmed.length - n; i++) {
            const ngram = trimmed.substring(i, i + n)
            if (!ngram.trim()) continue

            ngramFreq.set(ngram, (ngramFreq.get(ngram) || 0) + 1)

            // 左邻居
            if (!leftNeighbors.has(ngram)) leftNeighbors.set(ngram, new Map())
            const leftChar = i > 0 ? trimmed[i-1] : '<BOS>'
            const leftMap = leftNeighbors.get(ngram)
            leftMap.set(leftChar, (leftMap.get(leftChar) || 0) + 1)

            // 右邻居
            if (!rightNeighbors.has(ngram)) rightNeighbors.set(ngram, new Map())
            const rightChar = i + n < trimmed.length ? trimmed[i+n] : '<EOS>'
            const rightMap = rightNeighbors.get(ngram)
            rightMap.set(rightChar, (rightMap.get(rightChar) || 0) + 1)
          }
        }
      }
    }

    // 计算并筛选新词
    for (const [word, freq] of ngramFreq) {
      if (freq < config.NEW_WORD_MIN_FREQ) continue

      // 邻接熵
      const leftEnt = calculateEntropy(leftNeighbors.get(word))
      const rightEnt = calculateEntropy(rightNeighbors.get(word))
      const minEnt = Math.min(leftEnt, rightEnt)
      if (minEnt < config.ENTROPY_THRESHOLD) continue

      // PMI
      let minPmi = Infinity
      for (let i = 1; i < word.length; i++) {
        const leftFreq = ngramFreq.get(word.substring(0, i)) || 0
        const rightFreq = ngramFreq.get(word.substring(i)) || 0
        if (leftFreq > 0 && rightFreq > 0) {
          const pmi = Math.log2((freq * totalChars) / (leftFreq * rightFreq + 1e-10))
          minPmi = Math.min(minPmi, pmi)
        }
      }
      if (minPmi === Infinity) minPmi = 0
      if (minPmi < config.PMI_THRESHOLD) continue

      this.discoveredWords.add(word)
    }

    // 添加新词到jieba词典
    if (nodejieba) {
      for (const word of this.discoveredWords) {
        nodejieba.insertWord(word)
      }
    }

    console.log(`   发现 ${this.discoveredWords.size} 个新词`)
  }

  /**
   * 词组合并
   */
  _mergeWordPairs() {
    const bigramCounter = new Map()
    const wordRightCounter = new Map()

    for (const text of this.cleanedTexts) {
      const words = cut(text).filter(w => w.trim())
      for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i].trim()
        const w2 = words[i+1].trim()
        if (!w1 || !w2) continue
        if (/^[\d\W]+$/.test(w1) || /^[\d\W]+$/.test(w2)) continue

        const key = `${w1}|${w2}`
        bigramCounter.set(key, (bigramCounter.get(key) || 0) + 1)
        wordRightCounter.set(w1, (wordRightCounter.get(w1) || 0) + 1)
      }
    }

    for (const [key, count] of bigramCounter) {
      const [w1, w2] = key.split('|')
      const merged = w1 + w2
      if (merged.length > config.MERGE_MAX_LEN) continue
      if (count < config.MERGE_MIN_FREQ) continue

      const rightCount = wordRightCounter.get(w1) || 0
      if (rightCount > 0) {
        const prob = count / rightCount
        if (prob >= config.MERGE_MIN_PROB) {
          this.mergedWords.set(merged, { w1, w2, count, prob })
          if (nodejieba) {
            nodejieba.insertWord(merged)
          }
        }
      }
    }

    console.log(`   合并 ${this.mergedWords.size} 个词组`)
  }

  /**
   * 分词统计
   */
  _tokenizeAndCount() {
    for (const msg of this.messages) {
      const senderUid = msg.uid
      const text = msg.d || ''
      const cleaned = cleanText(text)

      if (!cleaned) continue

      const words = cut(cleaned)
      const emojis = extractEmojis(cleaned)
      const filteredWords = words.filter(w => !isEmoji(w))
      const allTokens = [...filteredWords, ...emojis]

      for (const word of allTokens) {
        const trimmed = word.trim()
        if (!trimmed) continue
        if (this.useStopwords && this.stopwords.has(trimmed)) continue
        if (config.BLACKLIST.has(trimmed)) continue

        this.wordFreq.set(trimmed, (this.wordFreq.get(trimmed) || 0) + 1)

        if (senderUid) {
          if (!this.wordContributors.has(trimmed)) {
            this.wordContributors.set(trimmed, new Map())
          }
          const contrib = this.wordContributors.get(trimmed)
          contrib.set(senderUid, (contrib.get(senderUid) || 0) + 1)
        }

        // 样本收集
        if (!this.wordSamples.has(trimmed)) {
          this.wordSamples.set(trimmed, [])
        }
        const samples = this.wordSamples.get(trimmed)
        if (samples.length < config.SAMPLE_COUNT * 3) {
          samples.push(cleaned)
        }
      }
    }
  }

  /**
   * 趣味统计
   */
  _funStatistics() {
    let prevClean = null
    let prevSender = null

    for (const msg of this.messages) {
      const senderUid = msg.uid
      if (!senderUid) continue

      const text = msg.d || ''
      const timestamp = msg._id || msg.ts

      // 消息计数
      this.userMsgCount.set(senderUid, (this.userMsgCount.get(senderUid) || 0) + 1)

      const clean = cleanText(text)
      this.userCharCount.set(senderUid, (this.userCharCount.get(senderUid) || 0) + clean.length)

      // 图片检测
      if (text.includes('[CQ:image') && !text.toLowerCase().includes('.gif')) {
        this.userImageCount.set(senderUid, (this.userImageCount.get(senderUid) || 0) + 1)
      }

      // 转发检测
      if (text.includes('[CQ:forward') || text.includes('合并转发')) {
        this.userForwardCount.set(senderUid, (this.userForwardCount.get(senderUid) || 0) + 1)
      }

      // 回复检测
      if (text.includes('[CQ:reply')) {
        this.userReplyCount.set(senderUid, (this.userReplyCount.get(senderUid) || 0) + 1)
        // 提取被回复者
        const replyMatch = text.match(/\[CQ:reply,id=(-?\d+)\]/)
        if (replyMatch) {
          // 这里简化处理，不追踪具体被回复者
        }
      }

      // @统计
      const atMatches = text.match(/\[CQ:at,qq=(\d+)/g) || []
      if (atMatches.length > 0) {
        this.userAtCount.set(senderUid, (this.userAtCount.get(senderUid) || 0) + atMatches.length)
        for (const match of atMatches) {
          const atUid = match.match(/qq=(\d+)/)[1]
          this.userAtedCount.set(atUid, (this.userAtedCount.get(atUid) || 0) + 1)
        }
      }

      // 表情统计
      const emojis = extractEmojis(clean)
      const gifCount = (text.toLowerCase().match(/\.gif/g) || []).length
      const faceCount = (text.match(/\[CQ:face/g) || []).length
      const emojiCount = emojis.length + gifCount + faceCount
      if (emojiCount > 0) {
        this.userEmojiCount.set(senderUid, (this.userEmojiCount.get(senderUid) || 0) + emojiCount)
      }

      // 链接统计
      if (text.includes('http://') || text.includes('https://') || text.includes('[CQ:json')) {
        this.userLinkCount.set(senderUid, (this.userLinkCount.get(senderUid) || 0) + 1)
      }

      // 时段统计
      const hour = parseTimestamp(timestamp)
      if (hour !== null) {
        this.hourDistribution.set(hour, (this.hourDistribution.get(hour) || 0) + 1)
        if (config.NIGHT_OWL_HOURS.includes(hour)) {
          this.userNightCount.set(senderUid, (this.userNightCount.get(senderUid) || 0) + 1)
        }
        if (config.EARLY_BIRD_HOURS.includes(hour)) {
          this.userMorningCount.set(senderUid, (this.userMorningCount.get(senderUid) || 0) + 1)
        }
      }

      // 复读统计
      if (clean && clean.length >= 2) {
        if (clean === prevClean && senderUid !== prevSender) {
          this.userRepeatCount.set(senderUid, (this.userRepeatCount.get(senderUid) || 0) + 1)
        }
      }

      prevClean = clean || prevClean
      prevSender = senderUid
    }

    // 计算人均字数
    for (const [uid, msgCount] of this.userMsgCount) {
      if (msgCount >= 10) {
        const charCount = this.userCharCount.get(uid) || 0
        this.userCharPerMsg.set(uid, charCount / msgCount)
      }
    }
  }

  /**
   * 过滤结果
   */
  _filterResults() {
    const filteredFreq = new Map()

    for (const [word, freq] of this.wordFreq) {
      if (word.length < config.MIN_WORD_LEN || word.length > config.MAX_WORD_LEN) continue
      if (freq < config.MIN_FREQ) continue

      if (config.WHITELIST.has(word)) {
        filteredFreq.set(word, freq)
        continue
      }

      if (config.BLACKLIST.has(word)) continue

      // 单字特殊处理
      if (word.length === 1) {
        if (isEmoji(word)) {
          // emoji保留
        } else {
          // 单个符号跳过
          if (/[，。！？；：、""''（）【】\(\)\[\]<>]/.test(word)) continue
          
          // 其他单字走独立性检查
          const stats = this.singleCharStats[word]
          if (stats) {
            if (stats.ratio < config.SINGLE_MIN_SOLO_RATIO || 
                stats.independent < config.SINGLE_MIN_SOLO_COUNT) {
              continue
            }
          } else {
            continue
          }
        }
      }

      filteredFreq.set(word, freq)
    }

    this.wordFreq = filteredFreq

    // 随机采样
    for (const [word, samples] of this.wordSamples) {
      if (samples.length > config.SAMPLE_COUNT) {
        // 随机选择
        const shuffled = samples.sort(() => Math.random() - 0.5)
        this.wordSamples.set(word, shuffled.slice(0, config.SAMPLE_COUNT))
      }
    }

    console.log(`   过滤后 ${this.wordFreq.size} 个词`)
  }

  /**
   * 获取热词排行
   * @param {number} n 
   * @returns {Array}
   */
  getTopWords(n = config.TOP_N) {
    return Array.from(this.wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([word, freq]) => ({ word, freq }))
  }

  /**
   * 导出JSON格式结果
   * @returns {Object}
   */
  exportJson() {
    const topWords = []
    for (const { word, freq } of this.getTopWords()) {
      if (this.useStopwords && this.stopwords.has(word)) continue

      const contributors = []
      const contribMap = this.wordContributors.get(word) || new Map()
      const sortedContrib = Array.from(contribMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, config.CONTRIBUTOR_TOP_N)

      for (const [uid, count] of sortedContrib) {
        contributors.push({
          name: this.getName(uid),
          uin: uid,
          count
        })
      }

      topWords.push({
        word,
        freq,
        contributors,
        samples: (this.wordSamples.get(word) || []).slice(0, config.SAMPLE_COUNT)
      })
    }

    const result = {
      chatName: this.chatName,
      messageCount: this.messages.length,
      topWords,
      rankings: {},
      hourDistribution: {}
    }

    // 时段分布
    for (let h = 0; h < 24; h++) {
      result.hourDistribution[String(h)] = this.hourDistribution.get(h) || 0
    }

    // 榜单数据
    const fmtWithUin = (counter, topN = config.RANK_TOP_N) => {
      return Array.from(counter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([uid, value]) => ({
          name: this.getName(uid),
          uin: uid,
          value
        }))
    }

    result.rankings['话痨榜'] = fmtWithUin(this.userMsgCount)
    result.rankings['字数榜'] = fmtWithUin(this.userCharCount)
    
    // 长文王特殊处理
    const sortedAvg = Array.from(this.userCharPerMsg.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, config.RANK_TOP_N)
    result.rankings['长文王'] = sortedAvg.map(([uid, avg]) => ({
      name: this.getName(uid),
      uin: uid,
      value: `${avg.toFixed(1)}字/条`
    }))

    result.rankings['图片狂魔'] = fmtWithUin(this.userImageCount)
    result.rankings['合并转发王'] = fmtWithUin(this.userForwardCount)
    result.rankings['回复狂'] = fmtWithUin(this.userReplyCount)
    result.rankings['被回复最多'] = fmtWithUin(this.userRepliedCount)
    result.rankings['艾特狂'] = fmtWithUin(this.userAtCount)
    result.rankings['被艾特最多'] = fmtWithUin(this.userAtedCount)
    result.rankings['表情帝'] = fmtWithUin(this.userEmojiCount)
    result.rankings['链接分享王'] = fmtWithUin(this.userLinkCount)
    result.rankings['深夜党'] = fmtWithUin(this.userNightCount)
    result.rankings['早起鸟'] = fmtWithUin(this.userMorningCount)
    result.rankings['复读机'] = fmtWithUin(this.userRepeatCount)

    return result
  }
}

module.exports = ChatAnalyzer

