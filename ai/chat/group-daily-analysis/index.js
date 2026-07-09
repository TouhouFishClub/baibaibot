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
  MAX_RANGE_DAYS,
  MIN_MESSAGES,
  MAX_MESSAGES_FOR_LLM,
  MAX_LLM_TEXT_CHARS,
  DEEPSEEK_API_KEY
} = require('./config')
const {
  getAnalysisRange,
  getAnalysisRangeByDate,
  getAnalysisRangeByDateRange,
  countChinaDaysInclusive,
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

const USAGE_HINT = '\u8bf7\u4f7f\u7528\u300c\u7fa4\u5206\u6790\u300d\u300c\u7fa4\u5206\u6790 3\u300d\u300c\u7fa4\u5206\u6790 20260312\u300d\u300c\u7fa4\u5206\u6790 -g \u7fa4\u53f7\u300d\u6216\u300c\u7fa4\u5206\u6790 -g \u7fa4\u53f7 20260312-20260412\u300d'

/**
 * 解析群分析命令参数
 * @returns {{ mode: 'days', days: number, targetGroupId: string | null } | { mode: 'date', yyyymmdd: string, year: number, month: number, date: number, targetGroupId: string | null } | { mode: 'range', startYyyymmdd: string, endYyyymmdd: string, startYear: number, startMonth: number, startDate: number, endYear: number, endMonth: number, endDate: number, targetGroupId: string | null } | { mode: 'error', message: string, targetGroupId: string | null } | null}
 */
function parseGroupAnalysisCommand(content) {
  const trimmed = (content || '').trim().replace(/^重新生成/, '').trim()
  if (!/^群分析(?:\s|$)/.test(trimmed)) return null

  const rest = trimmed.replace(/^群分析\s*/, '').trim()
  if (!rest) return { mode: 'days', days: DEFAULT_DAYS, targetGroupId: null }

  const tokens = rest.split(/\s+/).filter(Boolean)
  let targetGroupId = null
  const timeTokens = []

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '-g' && i + 1 < tokens.length && /^\d+$/.test(tokens[i + 1])) {
      targetGroupId = tokens[i + 1]
      i++
    } else {
      timeTokens.push(tokens[i])
    }
  }

  const base = { targetGroupId }

  if (timeTokens.length === 0) {
    return { mode: 'days', days: DEFAULT_DAYS, ...base }
  }
  if (timeTokens.length > 1) {
    return { mode: 'error', message: USAGE_HINT, ...base }
  }

  const arg = timeTokens[0]
  const rangeMatch = arg.match(/^(\d{8})-(\d{8})$/)
  if (rangeMatch) {
    const start = parseYyyymmdd(rangeMatch[1])
    const end = parseYyyymmdd(rangeMatch[2])
    if (!start) return { mode: 'error', message: '\u8d77\u59cb\u65e5\u671f\u65e0\u6548\uff1a' + rangeMatch[1] + '\uff08\u8bf7\u4f7f\u7528 YYYYMMDD\uff09', ...base }
    if (!end) return { mode: 'error', message: '\u7ed3\u675f\u65e5\u671f\u65e0\u6548\uff1a' + rangeMatch[2] + '\uff08\u8bf7\u4f7f\u7528 YYYYMMDD\uff09', ...base }
    if (rangeMatch[1] > rangeMatch[2]) {
      return { mode: 'error', message: '\u8d77\u59cb\u65e5\u671f\u4e0d\u80fd\u665a\u4e8e\u7ed3\u675f\u65e5\u671f', ...base }
    }
    const spanDays = countChinaDaysInclusive(start, end)
    if (spanDays > MAX_RANGE_DAYS) {
      return { mode: 'error', message: '\u65e5\u671f\u533a\u95f4\u4e0d\u80fd\u8d85\u8fc7 ' + MAX_RANGE_DAYS + ' \u5929\uff08\u5f53\u524d ' + spanDays + ' \u5929\uff09', ...base }
    }
    return {
      mode: 'range',
      startYyyymmdd: rangeMatch[1],
      endYyyymmdd: rangeMatch[2],
      startYear: start.year,
      startMonth: start.month,
      startDate: start.date,
      endYear: end.year,
      endMonth: end.month,
      endDate: end.date,
      ...base
    }
  }

  if (/^\d{8}$/.test(arg)) {
    const parsed = parseYyyymmdd(arg)
    if (!parsed) return { mode: 'error', message: '\u65e5\u671f\u65e0\u6548\uff1a' + arg + '\uff08\u8bf7\u4f7f\u7528 YYYYMMDD\uff0c\u5982 20260312\uff09', ...base }
    return { mode: 'date', ...parsed, ...base }
  }

  if (!/^\d{1,2}$/.test(arg)) {
    return { mode: 'error', message: USAGE_HINT, ...base }
  }

  const days = parseInt(arg, 10)
  if (isNaN(days) || days < 1) return { mode: 'days', days: DEFAULT_DAYS, ...base }
  return { mode: 'days', days: Math.min(days, MAX_DAYS), ...base }
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
  if (spec.mode === 'range') {
    return path.join(CACHE_DIR, 'daily_' + groupId + '_range_' + spec.startYyyymmdd + '_' + spec.endYyyymmdd + '.png')
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
  if (spec.mode === 'range') {
    const sm = String(spec.startMonth + 1).padStart(2, '0')
    const sd = String(spec.startDate).padStart(2, '0')
    const em = String(spec.endMonth + 1).padStart(2, '0')
    const ed = String(spec.endDate).padStart(2, '0')
    return spec.startYear + '年' + sm + '月' + sd + '日 ~ ' + spec.endYear + '年' + em + '月' + ed + '日'
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
  if (spec.mode === 'range') {
    const range = getAnalysisRangeByDateRange(
      { year: spec.startYear, month: spec.startMonth, date: spec.startDate },
      { year: spec.endYear, month: spec.endMonth, date: spec.endDate }
    )
    return {
      startDate: range.startDate,
      endDate: range.endDate,
      rangeDesc: formatDateRange(range.startDate, range.endDate) + '\uff08\u4e1c\u516b\u533a ' + range.rangeLabel + '\uff09'
    }
  }
  const range = getAnalysisRange(spec.days)
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    rangeDesc: formatDateRange(range.startDate, range.endDate) + '\uff08\u4e1c\u516b\u533a\u8fd1' + spec.days + '\u5929\uff09'
  }
}

function getLogLabel(spec) {
  if (spec.mode === 'date') return '指定日 ' + spec.yyyymmdd
  if (spec.mode === 'range') return '指定区间 ' + spec.startYyyymmdd + '-' + spec.endYyyymmdd
  return '近' + spec.days + '天'
}

function buildAnalysisHint(spec, targetGroupId) {
  const groupLabel = targetGroupId ? ('群 ' + targetGroupId) : '本群'
  if (spec.mode === 'date') {
    return '\ud83d\udcca \u6b63\u5728\u5206\u6790 ' + groupLabel + ' ' + spec.yyyymmdd.slice(0, 4) + '\u5e74' + parseInt(spec.yyyymmdd.slice(4, 6), 10) + '\u6708' + parseInt(spec.yyyymmdd.slice(6, 8), 10) + '\u65e5\u804a\u5929\u8bb0\u5f55\uff0c\u8bf7\u7a0d\u5019\uff08\u7ea6 1-3 \u5206\u949f\uff09...'
  }
  if (spec.mode === 'range') {
    return '\ud83d\udcca \u6b63\u5728\u5206\u6790 ' + groupLabel + ' ' + spec.startYyyymmdd + ' ~ ' + spec.endYyyymmdd + ' \u804a\u5929\u8bb0\u5f55\uff0c\u8bf7\u7a0d\u5019\uff08\u7ea6 1-3 \u5206\u949f\uff09...'
  }
  return '\ud83d\udcca \u6b63\u5728\u5206\u6790 ' + groupLabel + ' \u8fd1 ' + spec.days + ' \u5929\u804a\u5929\u8bb0\u5f55\uff0c\u8bf7\u7a0d\u5019\uff08\u7ea6 1-3 \u5206\u949f\uff09...'
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

  const logLabel = getLogLabel(spec)
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
    tokenUsage,
    userMap
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

  const targetGroupId = spec.targetGroupId || groupId
  const targetGroupName = spec.targetGroupId ? ('群' + spec.targetGroupId) : groupName

  try {
    if (forceRegenerate) {
      const cachePath = getCachePath(targetGroupId, spec)
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath)
    }

    callback(buildAnalysisHint(spec, spec.targetGroupId))

    const imgMsg = await generateGroupDailyReport({
      groupId: targetGroupId,
      groupName: targetGroupName,
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
