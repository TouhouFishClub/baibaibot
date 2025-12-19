/**
 * AI锐评生成器 & AI智能选词器 - 使用DeepSeek API
 */

const https = require('https')
const path = require('path')
const fs = require('fs')
const config = require('./config')

// 读取API密钥
let apiKey = null
try {
  const secretPath = path.join(__dirname, '.secret.json')
  if (fs.existsSync(secretPath)) {
    const secret = JSON.parse(fs.readFileSync(secretPath, 'utf-8'))
    apiKey = secret.apiKey
  }
} catch (e) {
  console.warn('读取API密钥失败:', e.message)
}

// DeepSeek API配置
const DEEPSEEK_API_URL = 'api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-chat'

// AI锐评系统提示词
const COMMENT_SYSTEM_PROMPT = `你是一个幽默风趣的群聊分析师，擅长用犀利又不失温度的语言点评网络热词。

你的任务是为QQ群年度热词报告生成一句精辟的锐评。要求：
1. 简短有力，15-30字为宜
2. 可以调侃、可以感慨、可以哲理，但要有趣
3. 结合词语本身的含义和使用场景
4. 语气可以是：毒舌吐槽/温情感慨/哲学思考/冷幽默/谐音梗 等
5. 不要太正经，要有网感

风格参考：
- "哈哈哈" → "快乐是假的，但敷衍是真的"
- "牛逼" → "词汇量告急时的唯一出路"
- "好的" → "成年人最敷衍的三个字"
- "?" → "一个符号，十万种质疑"
- "6" → "当代网友最高效的赞美"`

// AI选词系统提示词
const SELECTOR_SYSTEM_PROMPT = `你是一个专业的群聊文化分析师，擅长识别最具代表性的群聊热词。

你的任务是从候选词列表中选出10个最适合作为年度热词的词汇。选词标准：
1. **使用量大**：高频出现的词更能代表群聊文化
2. **新颖有趣**：独特、有创意、有梗的词优先
3. **搞笑幽默**：能引发笑点的词、梗词、谐音梗等
4. **群聊特色**：体现这个群独特氛围和风格的词
5. **不避讳粗俗**：脏话、粗话、网络黑话如果有特色也可以选

优先考虑：
- 网络流行梗、热词
- 群内特有的黑话、缩写
- 搞笑表情、emoji组合
- 有趣的口头禅
- 独特的表达方式

请从提供的候选词中选出最能代表这个群聊文化的10个词。`

/**
 * 清理AI响应中的思考过程标记
 * @param {string} text AI响应文本
 * @returns {string} 清理后的文本
 */
function cleanAIResponse(text) {
  if (!text) return text
  
  // 移除常见的思考标记模式
  const patterns = [
    /\*Thinking[:.].*?\*.*?(?=\n\n|$)/gis,
    /\*\*Examining.*?\*\*.*?(?=\n\n|$)/gis,
    /<thinking>.*?<\/thinking>/gis,
    /【思考】.*?【\/思考】/gis,
    /\[思考过程\].*?(?=\n\n|$)/gis,
  ]
  
  let cleaned = text
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  
  // 如果整段都是thinking内容，尝试提取最后一行作为结论
  if (!cleaned.trim() || cleaned.trim().length < 5) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    // 尝试找到不是thinking标记的最后几行
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      const markers = ['thinking', 'examining', '思考', 'analysis']
      if (!markers.some(m => line.toLowerCase().includes(m))) {
        if (line.length > 5 && line.length < 100) {
          return line
        }
      }
    }
  }
  
  return cleaned.trim()
}

/**
 * 调用DeepSeek API
 * @param {string} userPrompt 用户提示词
 * @param {string} systemPrompt 系统提示词（可选，默认使用锐评提示词）
 * @param {Object} options 额外选项
 * @returns {Promise<string>}
 */
function callDeepSeekAPI(userPrompt, systemPrompt = COMMENT_SYSTEM_PROMPT, apiOptions = {}) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('API密钥未配置'))
      return
    }

    const requestBody = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: apiOptions.maxTokens || 100,
      temperature: apiOptions.temperature || 0.8
    })

    const requestOptions = {
      hostname: DEEPSEEK_API_URL,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 30000
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          if (response.choices && response.choices[0] && response.choices[0].message) {
            resolve(response.choices[0].message.content.trim())
          } else if (response.error) {
            reject(new Error(response.error.message || 'API返回错误'))
          } else {
            reject(new Error('API返回格式异常'))
          }
        } catch (e) {
          reject(new Error('解析API响应失败: ' + e.message))
        }
      })
    })

    req.on('error', (e) => {
      reject(new Error('API请求失败: ' + e.message))
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('API请求超时'))
    })

    req.write(requestBody)
    req.end()
  })
}

/**
 * 为单个词生成锐评
 * @param {string} word 词语
 * @param {number} freq 频次
 * @param {string[]} samples 样本
 * @returns {Promise<string>}
 */
async function generateComment(word, freq, samples) {
  if (!apiKey) {
    return getRandomFallbackComment()
  }

  const samplesText = samples && samples.length > 0
    ? samples.slice(0, 5).map(s => `- ${s.substring(0, 50)}`).join('\n')
    : '无'

  const userPrompt = `请为这个群聊热词生成一句锐评：

词语：${word}
出现次数：${freq}次
使用样本：
${samplesText}

直接输出锐评内容，不要加引号或其他格式。`

  try {
    const comment = await callDeepSeekAPI(userPrompt)
    // 清理可能的引号
    return comment.replace(/^["'""'']+|["'""'']+$/g, '').trim()
  } catch (e) {
    console.warn(`   ⚠️ AI生成失败(${word}): ${e.message}`)
    return getRandomFallbackComment()
  }
}

/**
 * 获取随机备用锐评
 * @returns {string}
 */
function getRandomFallbackComment() {
  const comments = config.FALLBACK_COMMENTS
  return comments[Math.floor(Math.random() * comments.length)]
}

/**
 * 批量生成锐评
 * @param {Array} wordsData 热词数据数组
 * @returns {Promise<Object>} 词语到锐评的映射
 */
async function generateBatchComments(wordsData) {
  if (!apiKey) {
    console.warn('⚠️ AI未启用（无API密钥），使用默认锐评')
    const result = {}
    for (const word of wordsData) {
      result[word.word] = getRandomFallbackComment()
    }
    return result
  }

  console.log('🤖 正在生成AI锐评...')
  const comments = {}
  
  for (let i = 0; i < wordsData.length; i++) {
    const wordInfo = wordsData[i]
    const word = wordInfo.word
    process.stdout.write(`   [${i + 1}/${wordsData.length}] ${word}...`)
    
    try {
      const comment = await generateComment(
        word,
        wordInfo.freq,
        wordInfo.samples || []
      )
      comments[word] = comment
      console.log(' ✓')
    } catch (e) {
      comments[word] = getRandomFallbackComment()
      console.log(' (使用备用)')
    }
    
    // 避免API限流，每个请求之间稍微等待
    if (i < wordsData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  console.log('✅ AI锐评生成完成!')
  return comments
}

/**
 * 检查AI功能是否可用
 * @returns {boolean}
 */
function isAIEnabled() {
  return !!apiKey
}

/**
 * AI智能选词 - 从候选词中选出最有趣的年度热词
 * 注意：不是从全部词中选择，而是从前 topN 个高频词（默认200）中选择10个最有趣的
 * 
 * @param {Array} candidateWords 候选词数组，每项包含 {word, freq, samples}
 * @param {number} topN 候选词范围，默认200（从前200个高频词中选）
 * @param {number} selectCount 选出的词数量，默认10
 * @returns {Promise<Array|null>} 选中的词数组，失败返回null
 */
async function selectWords(candidateWords, topN = 200, selectCount = 10) {
  if (!apiKey) {
    console.error('❌ AI未启用，请配置API Key')
    return null
  }

  // 从前 topN 个候选词中选择（这是候选区域的范围）
  const candidates = candidateWords.slice(0, topN)
  
  if (candidates.length === 0) {
    console.error('❌ 没有候选词')
    return null
  }

  // 构建候选词信息
  const wordsInfo = candidates.map((wordData, idx) => {
    const word = wordData.word
    const freq = wordData.freq
    const samples = wordData.samples || []
    const samplePreview = samples.length > 0 ? samples[0].substring(0, 30) : '无样本'
    return `${idx + 1}. ${word} (${freq}次) - 样本: ${samplePreview}`
  })

  const wordsText = wordsInfo.join('\n')

  const userPrompt = `请从以下${candidates.length}个候选词中选出${selectCount}个最适合作为年度热词的词汇：

${wordsText}

要求：
1. 选出的词要有代表性、有趣味、有群聊特色
2. 优先选择使用量大且有特色的词
3. 不要回避脏话粗话，只要有特色就可以
4. 直接输出${selectCount}个序号，用逗号分隔，例如: 1,5,8,12,15,23,30,42,56,78
5. 只输出序号，不要有其他文字
6. 尽量选择前100的，除非后面有特别有趣的词
7. 尽量不要选择"啊"等无意义填充词，除非在例句中使用的特别有趣`

  try {
    console.log('🤖 AI正在分析并选择年度热词...')
    
    const rawResult = await callDeepSeekAPI(userPrompt, SELECTOR_SYSTEM_PROMPT, {
      maxTokens: 100,
      temperature: 0.7
    })
    
    // 清理响应中的思考过程
    let result = cleanAIResponse(rawResult)
    if (!result) {
      result = rawResult
    }
    
    console.log(`   AI返回: ${result}`)

    // 解析序号
    const indices = []
    const parts = result.replace(/，/g, ',').split(',')
    for (const part of parts) {
      try {
        const idx = parseInt(part.trim(), 10)
        if (idx >= 1 && idx <= candidates.length) {
          indices.push(idx - 1) // 转为0索引
        }
      } catch (e) {
        continue
      }
    }

    // 如果选出的词不够，自动补充前面的词
    if (indices.length < selectCount) {
      console.warn(`⚠️ AI只选出${indices.length}个词，自动补充前几个...`)
      for (let i = 0; i < candidates.length && indices.length < selectCount; i++) {
        if (!indices.includes(i)) {
          indices.push(i)
        }
      }
    }

    // 取前 selectCount 个
    const finalIndices = indices.slice(0, selectCount)
    const selected = finalIndices.map(i => candidates[i])

    console.log('\n✅ AI选词完成:')
    selected.forEach((wordData, i) => {
      console.log(`   ${i + 1}. ${wordData.word} (${wordData.freq}次)`)
    })

    return selected
  } catch (e) {
    console.error(`❌ AI选词失败: ${e.message}`)
    return null
  }
}

module.exports = {
  generateComment,
  generateBatchComments,
  getRandomFallbackComment,
  isAIEnabled,
  selectWords,
  cleanAIResponse
}

