const MongoClient = require('mongodb').MongoClient
const { mongourl } = require('../../../baibaiConfigs')
const { BOT_IDS } = require('./config')
const { formatChinaTimeHm } = require('./timezone')

function cleanMessageContent(content) {
  if (!content) return ''
  let cleaned = content.replace(/\[CQ:image[^\]]*\]/gi, '[图片]')
  cleaned = cleaned.replace(/\[CQ:record[^\]]*\]/gi, '[语音]')
  cleaned = cleaned.replace(/\[CQ:video[^\]]*\]/gi, '[视频]')
  cleaned = cleaned.replace(/\[CQ:face[^\]]*\]/gi, '[表情]')
  cleaned = cleaned.replace(/\[CQ:reply[^\]]*\]/gi, '[回复]')
  cleaned = cleaned.replace(/\[CQ:forward[^\]]*\]/gi, '[转发]')
  cleaned = cleaned.replace(/\[CQ:json[^\]]*\]/gi, '[卡片]')
  cleaned = cleaned.replace(/\[CQ:at,qq=\d+,name=([^\]]+)\]/g, '@$1')
  cleaned = cleaned.replace(/\[CQ:at,qq=(\d+)\]/g, '@$1')
  cleaned = cleaned.replace(/&amp;/g, '&')
  return cleaned.replace(/\s+/g, ' ').trim()
}

function getMessageTime(msg) {
  if (msg.ts) return new Date(Number(msg.ts))
  if (msg._id) return new Date(msg._id)
  return new Date()
}

function isBotUid(uid) {
  const n = typeof uid === 'string' ? parseInt(uid, 10) : uid
  return BOT_IDS.has(n)
}

async function fetchGroupMessages(groupId, startDate, endDate) {
  let client
  try {
    client = await MongoClient.connect(mongourl)
    const collection = client.db('db_bot').collection('cl_chat')
    const numericGid = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId
    const query = {
      $or: [{ gid: numericGid }, { gid: String(numericGid) }],
      _id: { $gte: startDate, $lte: endDate }
    }
    const messages = await collection.find(query)
      .project({ _id: 1, uid: 1, n: 1, d: 1, ts: 1 })
      .sort({ _id: 1 })
      .toArray()
    return messages.filter(msg => !isBotUid(msg.uid))
  } finally {
    if (client) await client.close()
  }
}

function buildUserMap(messages) {
  const map = {}
  for (const msg of messages) {
    const uid = msg.uid
    if (!uid) continue
    const name = (msg.n || '').trim()
    if (!name) continue
    const uidStr = String(uid)
    map[uidStr] = name
    map[uid] = name
  }
  return map
}

function sampleMessages(messages, maxCount) {
  if (messages.length <= maxCount) return messages
  const sorted = [...messages].sort((a, b) => getMessageTime(a) - getMessageTime(b))
  const step = sorted.length / maxCount
  const sampled = []
  for (let i = 0; i < maxCount; i++) {
    sampled.push(sorted[Math.floor(i * step)])
  }
  if (sorted.length > 0) {
    sampled[0] = sorted[0]
    sampled[sampled.length - 1] = sorted[sorted.length - 1]
  }
  return sampled
}

function formatMessagesForLlm(messages, userMap, maxChars) {
  const lines = []
  let total = 0
  for (const msg of messages) {
    const raw = msg.d || ''
    const content = cleanMessageContent(raw)
    if (!content || content === '[图片]' || content === '[语音]' || content === '[视频]') continue
    if (content.startsWith('/')) continue
    const uid = String(msg.uid)
    const time = getMessageTime(msg)
    const line = '[' + formatChinaTimeHm(time) + '] [' + uid + ']: ' + content
    if (total + line.length + 1 > maxChars) break
    lines.push(line)
    total += line.length + 1
  }
  return lines.join('\n')
}

function extractInteractionHints(messages, userMap, limit = 25) {
  const pairCount = new Map()
  const atPattern = /\[CQ:at,qq=(\d+)/gi

  for (const msg of messages) {
    const fromUid = String(msg.uid || '')
    if (!fromUid) continue
    const content = msg.d || ''
    let match
    atPattern.lastIndex = 0
    while ((match = atPattern.exec(content)) !== null) {
      const toUid = match[1]
      if (!toUid || toUid === fromUid) continue
      const key = [fromUid, toUid].sort().join('|')
      pairCount.set(key, (pairCount.get(key) || 0) + 1)
    }
  }

  return Array.from(pairCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [a, b] = key.split('|')
      const nameA = userMap[a] || userMap[parseInt(a, 10)] || a
      const nameB = userMap[b] || userMap[parseInt(b, 10)] || b
      return nameA + ' (' + a + ') <-> ' + nameB + ' (' + b + '): @互动 ' + count + ' 次'
    })
}

function toLlmRecords(messages, userMap) {
  return messages.map(msg => {
    const content = cleanMessageContent(msg.d || '')
    return {
      uid: String(msg.uid),
      nickname: userMap[msg.uid] || msg.n || `用户${msg.uid}`,
      time: getMessageTime(msg),
      content
    }
  }).filter(r => r.content && r.content.length >= 2)
}

module.exports = {
  cleanMessageContent,
  getMessageTime,
  fetchGroupMessages,
  buildUserMap,
  sampleMessages,
  formatMessagesForLlm,
  extractInteractionHints,
  toLlmRecords
}
