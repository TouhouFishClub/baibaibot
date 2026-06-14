const path = require('path')
const fs = require('fs')

const ADMIN_IDS = new Set([799018865, 1224099915])

const BOT_IDS = new Set([
  2854196310, 981069482, 3291864216, 1840239061, 2771362647,
  384901015, 10000, 2730629054, 1561267174, 2136421688,
  2363759162, 2854207387, 1315153795, 3889652245, 2186702980,
  2704057269, 3652811667, 3815102062, 3611589471
])

const DEFAULT_DAYS = 1
const MAX_DAYS = 7
const MAX_MESSAGES_FOR_LLM = 2500
const MAX_LLM_TEXT_CHARS = 14000
const MAX_TOPICS = 5
const MAX_USER_TITLES = 8
const MAX_GOLDEN_QUOTES = 5
const TOP_ACTIVE_USERS = 15
const MIN_MESSAGES = 20

/** 群友画像人格展示：sbti=娱乐向 SBTI（原版默认），mbti=原始四字母 */
const PROFILE_DISPLAY_MODE = 'sbti'

let DEEPSEEK_API_KEY = ''
const secretPaths = [
  path.join(__dirname, '../core/.secret.json'),
  path.join(__dirname, '../../llm/.secret.json')
]
for (const secretPath of secretPaths) {
  try {
    if (fs.existsSync(secretPath)) {
      const secret = JSON.parse(fs.readFileSync(secretPath, 'utf8'))
      DEEPSEEK_API_KEY = secret.apiKey || secret.deepseek_api_key || DEEPSEEK_API_KEY
      if (DEEPSEEK_API_KEY) break
    }
  } catch (e) {
    // ignore
  }
}

module.exports = {
  ADMIN_IDS,
  BOT_IDS,
  DEFAULT_DAYS,
  MAX_DAYS,
  MAX_MESSAGES_FOR_LLM,
  MAX_LLM_TEXT_CHARS,
  MAX_TOPICS,
  MAX_USER_TITLES,
  MAX_GOLDEN_QUOTES,
  TOP_ACTIVE_USERS,
  MIN_MESSAGES,
  PROFILE_DISPLAY_MODE,
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: 'https://api.deepseek.com/chat/completions',
  DEEPSEEK_MODEL: 'deepseek-chat'
}
