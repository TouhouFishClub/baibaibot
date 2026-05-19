/**
 * 群聊日报分析模块
 * 参考 astrbot_plugin_qq_group_daily_analysis，从 MongoDB cl_chat 拉取记录并生成报告
 */

const fs = require('fs')
const path = require('path')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const {
  ADMIN_IDS,
  DEFAULT_DAYS,
  MAX_DAYS,
  MIN_MESSAGES,
  MAX_MESSAGES_FOR_LLM,
  MAX_LLM_TEXT_CHARS,
  DEEPSEEK_API_KEY
} = require('./config')
const {
  getAnalysisRange,
  getAnalysisRangeByDate,
  parseYyyymmdd,
  getChinaDateKey,
  formatChinaDateTime
} = require('./timezone')
const {
  fetchGroupMessages,
  buildUserMap,
  sampleMessages,
  formatMessagesForLlm
} = require('./data')
const { computeStatistics } = require('./statistics')
const { analyzeAll } = require('./llm')
const { renderReportImage } = require('./report')

const CACHE_DIR = path.join(IMAGE_DATA, 'group-daily-report')

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

/**
 * 解析群分析命令参数
 * @returns {{ mode: 'days', days: number } | { mode: 'date', yyyymmdd: string, year: number, month: number, date: number } | { mode: 'error', message: string } | null}
 */
function parseGroupAnalysisCommand(content) {
  const trimmed = (content || '').trim().replace(/^重新生成/, '').trim()
  const m = trimmed.match(/^群分析\s*(\S+)?$/)
  if (!m) return null

  const arg = m[1]
  if (!arg) return { mode: 'days', days: DEFAULT_DAYS }

  if (/^\d{8}$/.test(arg)) {
    const parsed = parseYyyymmdd(arg)
    if (!parsed) return { mode: 'error', message: '\u65e5\u671f\u65e0\u6548\uff1a' + arg + '\uff08\u8bf7\u4f7f\u7528 YYYYMMDD\uff0c\u5982 20260312\uff09' }
    return { mode: 'date', ...parsed }
  }

  if (!/^\d{1,2}$/.test(arg)) {
    return { mode: 'error', message: '\u8bf7\u4f7f\u7528\u300c\u7fa4\u5206\u6790\u300d\u300c\u7fa4\u5206\u6790 3\u300d\u6216\u300c\u7fa4\u5206\u6790 20260312\u300d' }
  }

  const days = parseInt(arg, 10)
  if (isNaN(days) || days < 1) return { mode: 'days', days: DEFAULT_DAYS }
  return { mode: 'days', days: Math.min(days, MAX_DAYS) }
}

/** @deprecated 兼容旧调用 */
function parseDays(content) {
  const spec = parseGroupAnalysisCommand(content)
  if (!spec || spec.mode === 'error') return null
  if (spec.mode === 'days') return spec.days
  return null
}

function formatDateRange(start, end) {
  return formatChinaDateTime(start) + ' ~ ' + formatChinaDateTime(end)
}

function getCachePath(groupId, spec) {
  if (spec.mode === 'date') {
    return path.join(CACHE_DIR, 'daily_' + groupId + '_date_' + spec.yyyymmdd + '.png')
  }
  const dayKey = getChinaDateKey()
  return path.join(CACHE_DIR, 'daily_' + groupId + '_' + spec.days + 'd_' + dayKey + '.png')
}

function getImageCQ(outputPath) {
  const rel = path.join('send', 'group-daily-report', path.basename(outputPath))
  return '[CQ:image,file=' + rel + ']'
}

function formatReportDate(spec) {
  if (spec.mode === 'date') {
    const m = String(spec.month + 1).padStart(2, '0')
    const d = String(spec.date).padStart(2, '0')
    return spec.year + '年' + m + '月' + d + '日'
  }
  const dayKey = getChinaDateKey()
  const [year, month, date] = dayKey.split('-')
  return year + '年' + month + '月' + date + '日'
}

function resolveRange(spec) {
  if (spec.mode === 'date') {
    const range = getAnalysisRangeByDate(spec.year, spec.month, spec.date)
    return {
      startDate: range.startDate,
      endDate: range.endDate,
      rangeDesc: formatDateRange(range.startDate, range.endDate) + '\uff08\u4e1c\u516b\u533a ' + range.dateLabel + '\uff09'
    }
  }
  const range = getAnalysisRange(spec.days)
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    rangeDesc: formatDateRange(range.startDate, range.endDate) + '\uff08\u4e1c\u516b\u533a\u8fd1' + spec.days + '\u5929\uff09'
  }
}

async function generateGroupDailyReport(options) {
  const {
    groupId,
    groupName,
    spec,
    forceRegenerate = false
  } = options

  const { startDate, endDate, rangeDesc } = resolveRange(spec)
  const cachePath = getCachePath(groupId, spec)

  if (!forceRegenerate && fs.existsSync(cachePath)) {
    console.log('[群分析] 使用缓存:', cachePath)
    return getImageCQ(cachePath)
  }

  const logLabel = spec.mode === 'date'
    ? ('指定日 ' + spec.yyyymmdd)
    : ('近' + spec.days + '天')
  console.log('[群分析] 拉取消息 群' + groupId + ' ' + logLabel)

  const messages = await fetchGroupMessages(groupId, startDate, endDate)
  if (messages.length < MIN_MESSAGES) {
    throw new Error('\u6d88\u606f\u592a\u5c11\uff08' + messages.length + ' \u6761\uff09\uff0c\u81f3\u5c11\u9700\u8981 ' + MIN_MESSAGES + ' \u6761\u624d\u80fd\u5206\u6790')
  }

  const userMap = buildUserMap(messages)
  const stats = computeStatistics(messages, userMap)
  const sampled = sampleMessages(messages, MAX_MESSAGES_FOR_LLM)
  const messagesText = formatMessagesForLlm(sampled, userMap, MAX_LLM_TEXT_CHARS)

  let topics = []
  let titles = []
  let quotes = []
  let qualityReview = null
  let tokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  if (DEEPSEEK_API_KEY && messagesText) {
    console.log('[群分析] 调用 LLM 分析...')
    const llmResult = await analyzeAll(messagesText, stats.topUsers, userMap)
    topics = llmResult.topics
    titles = llmResult.titles
    quotes = llmResult.quotes
    qualityReview = llmResult.qualityReview
    tokenUsage = llmResult.tokenUsage
  } else {
    console.warn('[群分析] 未配置 DeepSeek，仅输出统计数据')
  }

  const reportData = {
    groupName: groupName || ('群' + groupId),
    reportDate: formatReportDate(spec),
    dateRangeText: rangeDesc,
    generatedAt: formatChinaDateTime(new Date()),
    stats,
    topics,
    titles,
    quotes,
    qualityReview,
    tokenUsage
  }

  console.log('[群分析] 生成报告图片...')
  await renderReportImage(reportData, cachePath)
  return getImageCQ(cachePath)
}

async function handleGroupDailyAnalysisCommand(groupId, userId, content, groupName, callback, forceRegenerate = false) {
  const spec = parseGroupAnalysisCommand(content.replace(/^重新生成/, '').trim())
  if (!spec) return

  if (!ADMIN_IDS.has(userId)) {
    return
  }

  if (spec.mode === 'error') {
    callback('\u274c ' + spec.message)
    return
  }

  try {
    if (forceRegenerate) {
      const cachePath = getCachePath(groupId, spec)
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath)
    }

    const hint = spec.mode === 'date'
      ? ('\ud83d\udcca \u6b63\u5728\u5206\u6790 ' + spec.yyyymmdd.slice(0, 4) + '\u5e74' + parseInt(spec.yyyymmdd.slice(4, 6), 10) + '\u6708' + parseInt(spec.yyyymmdd.slice(6, 8), 10) + '\u65e5\u7fa4\u804a\u8bb0\u5f55\uff0c\u8bf7\u7a0d\u5019\uff08\u7ea6 1-3 \u5206\u949f\uff09...')
      : ('\ud83d\udcca \u6b63\u5728\u5206\u6790\u8fd1 ' + spec.days + ' \u5929\u7fa4\u804a\u8bb0\u5f55\uff0c\u8bf7\u7a0d\u5019\uff08\u7ea6 1-3 \u5206\u949f\uff09...')
    callback(hint)

    const imgMsg = await generateGroupDailyReport({
      groupId,
      groupName,
      spec,
      forceRegenerate
    })

    callback(imgMsg)
  } catch (error) {
    console.error('[群分析] 失败:', error)
    callback('\u274c \u7fa4\u5206\u6790\u5931\u8d25: ' + error.message)
  }
}

function matchGroupAnalysisCommand(content) {
  const trimmed = (content || '').trim()
  if (/^重新生成群分析/.test(trimmed)) {
    const spec = parseGroupAnalysisCommand(trimmed.replace(/^重新生成/, ''))
    if (spec && spec.mode !== 'error') return { matched: true, spec, force: true }
    if (spec && spec.mode === 'error') return { matched: true, spec, force: true }
  }
  if (/^群分析/.test(trimmed)) {
    const spec = parseGroupAnalysisCommand(trimmed)
    if (spec) return { matched: true, spec, force: false }
  }
  return { matched: false }
}

module.exports = {
  handleGroupDailyAnalysisCommand,
  generateGroupDailyReport,
  matchGroupAnalysisCommand,
  parseGroupAnalysisCommand,
  parseDays
}
