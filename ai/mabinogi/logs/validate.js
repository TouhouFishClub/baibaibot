const zlib = require('zlib')
const {
  minBossMaxHp,
  minDuration,
  maxDuration,
  maxHistoryDays,
  maxFileBytes
} = require('./config')
const { matchesDungeonName, isKnownBossTarget, matchBossByHp, getBossMinDuration } = require('./bossConfig')

function centiToMs(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.floor(n / 100) * 1000
}

function parseGzipJson(buffer) {
  if (!buffer || !buffer.length) {
    return { ok: false, reason: 'empty_file' }
  }
  if (buffer.length > maxFileBytes) {
    return { ok: false, reason: 'file_too_large' }
  }

  let text
  try {
    text = zlib.gunzipSync(buffer).toString('utf8')
  } catch (error) {
    return { ok: false, reason: 'gzip_invalid' }
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { ok: false, reason: 'json_invalid' }
  }

  if (!data || !Array.isArray(data.targets) || !data.targets.length) {
    return { ok: false, reason: 'targets_missing' }
  }

  return { ok: true, data }
}

function isValidPlayerId(playerId) {
  return typeof playerId === 'string' && /^[0-9]{1,20}$/.test(playerId)
}

function validateUploadFields(fields) {
  const required = ['playerId', 'dungeonName', 'fileName', 'clientVersion', 'contentSha256']
  for (const key of required) {
    if (!fields[key] || !String(fields[key]).trim()) {
      return { ok: false, reason: `missing_${key}` }
    }
  }
  if (!isValidPlayerId(String(fields.playerId).trim())) {
    return { ok: false, reason: 'invalid_player_id' }
  }
  if (!/^[0-9a-f]{64}$/i.test(String(fields.contentSha256).trim())) {
    return { ok: false, reason: 'invalid_content_sha256' }
  }
  return { ok: true }
}

function validateSemantic(data, dungeonName) {
  if (!matchesDungeonName(dungeonName)) {
    return { ok: false, reason: 'dungeon_keyword_mismatch' }
  }

  const now = Date.now()
  const earliest = now - maxHistoryDays * 24 * 60 * 60 * 1000
  let validTargetCount = 0

  // 一场战斗包里常混有残局/秒退；不应因单个 target 不合格而整包拒绝
  for (const target of data.targets) {
    const maxHp = target?.bossHP?.maxHp
    if (!Number.isFinite(maxHp) || (maxHp < minBossMaxHp && !isKnownBossTarget(target))) {
      continue
    }

    const boss = matchBossByHp(maxHp)
    const requiredMinDuration = boss
      ? getBossMinDuration(boss, minDuration)
      : minDuration
    if (!Number.isFinite(target.duration) || target.duration < requiredMinDuration || target.duration > maxDuration) {
      continue
    }
    if (!Number.isFinite(target.totalDamage) || target.totalDamage <= 0) {
      continue
    }

    let timeOk = true
    for (const field of ['cleanedAt', 'appearedAt']) {
      const ms = centiToMs(target[field])
      if (ms == null || ms > now + 60 * 1000 || ms < earliest) {
        timeOk = false
        break
      }
    }
    if (!timeOk) continue

    validTargetCount++
  }

  if (!validTargetCount) {
    return { ok: false, reason: 'no_valid_targets' }
  }

  return { ok: true }
}

module.exports = {
  parseGzipJson,
  validateUploadFields,
  validateSemantic,
  isValidPlayerId,
  centiToMs
}
