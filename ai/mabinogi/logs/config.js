const fs = require('fs')
const path = require('path')

const MODULE_DIR = __dirname
const PROJECT_ROOT = path.resolve(MODULE_DIR, '../../..')
const SECRET_PATH = path.join(MODULE_DIR, '.secret.json')
// 与 baibaiConfigs 中 ../coolq-data 同理：从仓库根目录向上一级的 mabidata/logs
const SOURCE_ROOT = path.resolve(PROJECT_ROOT, '../mabidata/logs')
const ARCH_ROOT = path.resolve(PROJECT_ROOT, '../mabidata/arch')

const DEFAULTS = {
  signatureMaxSkewSeconds: 300,
  nonceTtlSeconds: 600,
  maxFileBytes: 10 * 1024 * 1024,
  dungeonKeyword: '布里列赫',
  minBossMaxHp: 200_000_000,
  minDuration: 10,
  maxDuration: 7200,
  maxHistoryDays: 30,
  // 每日备份到 mabidata/arch/YYYY-MM-DD（本地 03:00）
  backupHourLocal: 3,
  rateLimit: {
    perIpPerMinute: 30,
    perPlayerPerHour: 20,
    globalPerMinute: 500
  }
}

function loadSecretFile() {
  const envConfig = {
    BLONY_UPLOAD_SECRET: process.env.BLONY_UPLOAD_SECRET,
    BLONY_UPLOAD_ENDPOINT: process.env.BLONY_UPLOAD_ENDPOINT,
    BLONY_RANKING_CONSENT_ENDPOINT: process.env.BLONY_RANKING_CONSENT_ENDPOINT,
    BLONY_ANNOUNCEMENT_ENDPOINT: process.env.BLONY_ANNOUNCEMENT_ENDPOINT
  }
  try {
    const fileConfig = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'))
    const merged = { ...fileConfig }
    for (const [key, value] of Object.entries(envConfig)) {
      if (value !== undefined) merged[key] = value
    }
    return merged
  } catch (error) {
    if (envConfig.BLONY_UPLOAD_SECRET) return envConfig
    console.warn('[dps-logs] 未找到 .secret.json，上传鉴权将不可用:', error.message)
    console.warn(`[dps-logs] 请在 ${SECRET_PATH} 配置 BLONY_UPLOAD_SECRET，或设置环境变量 BLONY_UPLOAD_SECRET`)
    return {}
  }
}

function resolveSecretKey(secret) {
  if (!secret) return Buffer.alloc(0)
  const trimmed = String(secret).trim()
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length >= 16) {
    const decoded = Buffer.from(trimmed, 'base64')
    if (decoded.length >= 16) {
      return decoded
    }
  }
  return Buffer.from(trimmed, 'utf8')
}

const secretFile = loadSecretFile()

module.exports = {
  MODULE_DIR,
  PROJECT_ROOT,
  SOURCE_ROOT,
  ARCH_ROOT,
  uploadSecret: secretFile.BLONY_UPLOAD_SECRET || '',
  uploadSecretKey: resolveSecretKey(secretFile.BLONY_UPLOAD_SECRET || ''),
  uploadEndpoint: secretFile.BLONY_UPLOAD_ENDPOINT || '',
  rankingConsentEndpoint: secretFile.BLONY_RANKING_CONSENT_ENDPOINT || '',
  announcementEndpoint: secretFile.BLONY_ANNOUNCEMENT_ENDPOINT || '',
  ...DEFAULTS
}
