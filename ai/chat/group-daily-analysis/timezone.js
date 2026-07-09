/** 业务时区：中国标准时间 UTC+8（与 MongoDB _id 存 UTC 无关，查询/展示按东八区日历） */
const OFFSET_MS = 8 * 60 * 60 * 1000

function chinaParts(atMs) {
  const c = new Date(atMs + OFFSET_MS)
  return {
    year: c.getUTCFullYear(),
    month: c.getUTCMonth(),
    date: c.getUTCDate(),
    hour: c.getUTCHours(),
    minute: c.getUTCMinutes()
  }
}

/** 东八区某日 00:00:00.000 对应的 UTC Date */
function chinaDayStart(year, month, date) {
  return new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - OFFSET_MS)
}

/**
 * 分析时间范围（按东八区自然日）
 * @param {number} days 天数，1 = 今天 0 点至今
 */
function getAnalysisRange(days) {
  const nowMs = Date.now()
  const { year, month, date } = chinaParts(nowMs)
  const startDate = chinaDayStart(year, month, date - days + 1)
  const endDate = new Date(nowMs)
  return { startDate, endDate }
}

/**
 * 指定东八区自然日（YYYYMMDD）的完整分析范围
 * @param {number} year
 * @param {number} month 0-11
 * @param {number} date 1-31
 */
function getAnalysisRangeByDate(year, month, date) {
  const startDate = chinaDayStart(year, month, date)
  const dayEnd = new Date(chinaDayStart(year, month, date + 1).getTime() - 1)
  const now = new Date()
  const today = chinaParts(Date.now())
  const isToday = year === today.year && month === today.month && date === today.date
  const endDate = isToday && now < dayEnd ? now : dayEnd
  const m = String(month + 1).padStart(2, '0')
  const d = String(date).padStart(2, '0')
  return {
    startDate,
    endDate,
    dateKey: year + '-' + m + '-' + d,
    dateLabel: year + '\u5e74' + parseInt(m, 10) + '\u6708' + parseInt(d, 10) + '\u65e5'
  }
}

/**
 * 指定东八区日期区间 [start, end]（含首尾自然日）
 * @param {{ year: number, month: number, date: number }} startParsed
 * @param {{ year: number, month: number, date: number }} endParsed
 */
function getAnalysisRangeByDateRange(startParsed, endParsed) {
  const startDate = chinaDayStart(startParsed.year, startParsed.month, startParsed.date)
  const dayEnd = new Date(chinaDayStart(endParsed.year, endParsed.month, endParsed.date + 1).getTime() - 1)
  const now = new Date()
  const today = chinaParts(Date.now())
  const isEndToday = endParsed.year === today.year && endParsed.month === today.month && endParsed.date === today.date
  const endDate = isEndToday && now < dayEnd ? now : dayEnd

  const sm = String(startParsed.month + 1).padStart(2, '0')
  const sd = String(startParsed.date).padStart(2, '0')
  const em = String(endParsed.month + 1).padStart(2, '0')
  const ed = String(endParsed.date).padStart(2, '0')
  const startLabel = startParsed.year + '\u5e74' + parseInt(sm, 10) + '\u6708' + parseInt(sd, 10) + '\u65e5'
  const endLabel = endParsed.year + '\u5e74' + parseInt(em, 10) + '\u6708' + parseInt(ed, 10) + '\u65e5'

  return {
    startDate,
    endDate,
    startLabel,
    endLabel,
    rangeLabel: startLabel + ' ~ ' + endLabel
  }
}

/** 东八区自然日区间天数（含首尾） */
function countChinaDaysInclusive(startParsed, endParsed) {
  const startMs = chinaDayStart(startParsed.year, startParsed.month, startParsed.date).getTime()
  const endMs = chinaDayStart(endParsed.year, endParsed.month, endParsed.date).getTime()
  return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1
}

/** 解析 YYYYMMDD，无效返回 null */
function parseYyyymmdd(str) {
  if (!/^\d{8}$/.test(str)) return null
  const year = parseInt(str.slice(0, 4), 10)
  const month = parseInt(str.slice(4, 6), 10) - 1
  const date = parseInt(str.slice(6, 8), 10)
  if (month < 0 || month > 11 || date < 1 || date > 31) return null
  const test = new Date(Date.UTC(year, month, date))
  if (test.getUTCFullYear() !== year || test.getUTCMonth() !== month || test.getUTCDate() !== date) {
    return null
  }
  return { year, month, date, yyyymmdd: str }
}

function getChinaDateKey(atMs) {
  const p = chinaParts(atMs == null ? Date.now() : atMs)
  const m = String(p.month + 1).padStart(2, '0')
  const d = String(p.date).padStart(2, '0')
  return p.year + '-' + m + '-' + d
}

function formatChinaDateTime(date) {
  const p = chinaParts(date.getTime())
  const m = String(p.month + 1).padStart(2, '0')
  const d = String(p.date).padStart(2, '0')
  const hh = String(p.hour).padStart(2, '0')
  const mm = String(p.minute).padStart(2, '0')
  return p.year + '/' + m + '/' + d + ' ' + hh + ':' + mm
}

function getChinaHour(date) {
  return chinaParts(date.getTime()).hour
}

function formatChinaTimeHm(date) {
  const p = chinaParts(date.getTime())
  return String(p.hour).padStart(2, '0') + ':' + String(p.minute).padStart(2, '0')
}

module.exports = {
  OFFSET_MS,
  getAnalysisRange,
  getAnalysisRangeByDate,
  getAnalysisRangeByDateRange,
  countChinaDaysInclusive,
  parseYyyymmdd,
  getChinaDateKey,
  formatChinaDateTime,
  formatChinaTimeHm,
  getChinaHour
}
