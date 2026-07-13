const {
  rateLimit: { perIpPerMinute, perPlayerPerHour, globalPerMinute }
} = require('./config')

const buckets = {
  ip: new Map(),
  player: new Map(),
  global: []
}

function pruneTimestamps(list, windowMs, now) {
  while (list.length && list[0] <= now - windowMs) {
    list.shift()
  }
}

function hitBucket(map, key, windowMs, limit, now) {
  if (!key) return false
  let list = map.get(key)
  if (!list) {
    list = []
    map.set(key, list)
  }
  pruneTimestamps(list, windowMs, now)
  if (list.length >= limit) {
    return true
  }
  list.push(now)
  return false
}

function isLoopback(ip) {
  if (!ip) return false
  const normalized = String(ip).replace(/^::ffff:/, '')
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost'
}

function isRateLimited(ip, playerId) {
  if (isLoopback(ip)) {
    return { limited: false }
  }
  const now = Date.now()
  pruneTimestamps(buckets.global, 60 * 1000, now)

  if (buckets.global.length >= globalPerMinute) {
    return { limited: true, reason: 'global' }
  }
  if (hitBucket(buckets.ip, ip, 60 * 1000, perIpPerMinute, now)) {
    return { limited: true, reason: 'ip' }
  }
  if (hitBucket(buckets.player, playerId, 60 * 60 * 1000, perPlayerPerHour, now)) {
    return { limited: true, reason: 'player' }
  }

  buckets.global.push(now)
  return { limited: false }
}

module.exports = {
  isRateLimited
}
