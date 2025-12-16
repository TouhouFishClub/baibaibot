/**
 * AI锐评生成器 - 使用DeepSeek API
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
const SYSTEM_PROMPT = `你是一个幽默风趣的群聊分析师，擅长用犀利又不失温度的语言点评网络热词。

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

/**
 * 调用DeepSeek API
 * @param {string} userPrompt 用户提示词
 * @returns {Promise<string>}
 */
function callDeepSeekAPI(userPrompt) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('API密钥未配置'))
      return
    }

    const requestBody = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.8
    })

    const options = {
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

    const req = https.request(options, (res) => {
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

module.exports = {
  generateComment,
  generateBatchComments,
  getRandomFallbackComment,
  isAIEnabled
}

