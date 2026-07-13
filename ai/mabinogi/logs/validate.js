const zlib = require('zlib')
const {
  dungeonKeyword,
  minBossMaxHp,
  minDuration,
  maxDuration,
  maxHistoryDays,
  maxFileBytes
} = require('./config')

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
  if (!dungeonName || !String(dungeonName).includes(dungeonKeyword)) {
    return { ok: false, reason: 'dungeon_keyword_mismatch' }
  }

  const now = Date.now()
  const earliest = now - maxHistoryDays * 24 * 60 * 60 * 1000

  for (const target of data.targets) {
    const maxHp = target?.bossHP?.maxHp
    if (!Number.isFinite(maxHp) || maxHp < minBossMaxHp) {
      return { ok: false, reason: 'boss_hp_too_low' }
    }
    if (!Number.isFinite(target.duration) || target.duration < minDuration || target.duration > maxDuration) {
      return { ok: false, reason: 'invalid_duration' }
    }
    if (!Number.isFinite(target.totalDamage) || target.totalDamage <= 0) {
      return { ok: false, reason: 'invalid_total_damage' }
    }

    for (const field of ['cleanedAt', 'appearedAt']) {
      const ms = centiToMs(target[field])
      if (ms == null) {
        return { ok: false, reason: `invalid_${field}` }
      }
      if (ms > now + 60 * 1000) {
        return { ok: false, reason: 'future_timestamp' }
      }
      if (ms < earliest) {
        return { ok: false, reason: 'timestamp_too_old' }
      }
    }
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
