const { cleanMessageContent, getMessageTime } = require('./data')
const { getChinaHour } = require('./timezone')

function countEmojis(text) {
  if (!text) return 0
  const faceCount = (text.match(/\[CQ:face/gi) || []).length
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu
  const unicodeCount = (text.match(emojiRegex) || []).length
  return faceCount + unicodeCount
}

function computeStatistics(messages, userMap) {
  const userMsgCount = new Map()
  const hourDistribution = new Map()
  let totalCharacters = 0
  let emojiCount = 0
  const participants = new Set()

  for (const msg of messages) {
    const uid = msg.uid
    if (!uid) continue
    participants.add(String(uid))
    userMsgCount.set(uid, (userMsgCount.get(uid) || 0) + 1)

    const raw = msg.d || ''
    const cleaned = cleanMessageContent(raw)
    totalCharacters += cleaned.length
    emojiCount += countEmojis(raw)

    const hour = getChinaHour(getMessageTime(msg))
    hourDistribution.set(hour, (hourDistribution.get(hour) || 0) + 1)
  }

  let peakHour = 0
  let peakCount = 0
  const hourlyChart = []
  for (let h = 0; h < 24; h++) {
    const count = hourDistribution.get(h) || 0
    hourlyChart.push({ hour: h, count })
    if (count > peakCount) {
      peakCount = count
      peakHour = h
    }
  }

  const topUsers = Array.from(userMsgCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([uid, count]) => ({
      uid: String(uid),
      name: userMap[uid] || `用户${uid}`,
      messageCount: count
    }))

  const maxHourCount = Math.max(...hourlyChart.map(x => x.count), 1)
  const hourlyChartHtml = hourlyChart.map(({ hour, count }) => {
    const pct = Math.max((count / maxHourCount) * 100, 3)
    return '<div class="bar-col"><div class="bar-fill" style="height:' + pct.toFixed(1) + '%"></div><span class="bar-label">' + hour + '</span><span class="bar-count">' + count + '</span></div>'
  }).join('')

  return {
    messageCount: messages.length,
    participantCount: participants.size,
    totalCharacters,
    emojiCount,
    mostActivePeriod: String(peakHour).padStart(2, '0') + ':00 - ' + String(peakHour).padStart(2, '0') + ':59',
    peakHour,
    hourlyChart,
    hourlyChartHtml: '<div class="hour-chart">' + hourlyChartHtml + '</div>',
    topUsers
  }
}

module.exports = { computeStatistics }
