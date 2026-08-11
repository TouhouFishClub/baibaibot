const crypto = require('crypto')
const zlib = require('zlib')
const { maxFileBytes } = require('./config')

const BUFF_MONITOR_SCHEMA_VERSION = 1
const MAX_JSON_BYTES = 8 * 1024 * 1024
const MAX_DEFINITIONS = 256
const MAX_TARGETS = 128
const MAX_PLAYERS_PER_TARGET = 100
const MAX_BUFFS_PER_PLAYER = 256
const MAX_SEGMENTS = 100000

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteOptional(value) {
  return value == null || Number.isFinite(value)
}

function hasMongoUnsafeKeys(value) {
  if (Array.isArray(value)) return value.some(hasMongoUnsafeKeys)
  if (!isObject(value)) return false
  return Object.entries(value).some(([key, child]) => (
    key.startsWith('$') || key.includes('.') || hasMongoUnsafeKeys(child)
  ))
}

function validateDefinition(definition) {
  return isObject(definition) &&
    Number.isInteger(definition.conditionId) &&
    definition.conditionId >= 0 &&
    definition.conditionId <= 0xffffffff &&
    typeof definition.conditionName === 'string' &&
    definition.conditionName.length > 0 &&
    definition.conditionName.length <= 100 &&
    (definition.iconId == null || (Number.isInteger(definition.iconId) && definition.iconId >= 0)) &&
    (definition.strengthField == null || (
      typeof definition.strengthField === 'string' && definition.strengthField.length <= 100
    ))
}

function validateDetails(details) {
  if (details == null) return true
  if (!isObject(details) || Object.keys(details).length > 256) return false
  return Object.values(details).every(item => (
    isObject(item) &&
    typeof item.type === 'string' && item.type.length <= 20 &&
    typeof item.value === 'string' && item.value.length <= 4096
  ))
}

function validateSegment(segment) {
  return isObject(segment) &&
    Number.isFinite(segment.startedAt) &&
    Number.isFinite(segment.endedAt) &&
    Number.isFinite(segment.startOffset) &&
    Number.isFinite(segment.endOffset) &&
    Number.isFinite(segment.activeSeconds) &&
    isFiniteOptional(segment.strength) &&
    (segment.rawDetail == null || (
      typeof segment.rawDetail === 'string' && segment.rawDetail.length <= 65536
    )) &&
    validateDetails(segment.details)
}

function validateBuff(buff) {
  return isObject(buff) &&
    Number.isInteger(buff.conditionId) &&
    buff.conditionId >= 0 &&
    buff.conditionId <= 0xffffffff &&
    typeof buff.conditionName === 'string' &&
    buff.conditionName.length > 0 &&
    buff.conditionName.length <= 100 &&
    (buff.iconId == null || (Number.isInteger(buff.iconId) && buff.iconId >= 0)) &&
    Number.isFinite(buff.activeSeconds) && buff.activeSeconds >= 0 &&
    Number.isFinite(buff.coveragePercent) &&
    buff.coveragePercent >= 0 && buff.coveragePercent <= 100.001 &&
    (buff.strengthField == null || (
      typeof buff.strengthField === 'string' && buff.strengthField.length <= 100
    )) &&
    isFiniteOptional(buff.averageStrength) &&
    isFiniteOptional(buff.minStrength) &&
    isFiniteOptional(buff.maxStrength) &&
    (buff.segments == null || Array.isArray(buff.segments))
}

function validateBuffMonitorData(data, primaryData) {
  if (!isObject(data) || data.schemaVersion !== BUFF_MONITOR_SCHEMA_VERSION) {
    return { ok: false, reason: 'buff_monitor_schema_unsupported' }
  }
  if (!Array.isArray(data.definitions) || data.definitions.length > MAX_DEFINITIONS) {
    return { ok: false, reason: 'buff_monitor_definitions_invalid' }
  }
  if (!Array.isArray(data.targets) || data.targets.length > MAX_TARGETS) {
    return { ok: false, reason: 'buff_monitor_targets_invalid' }
  }
  if (hasMongoUnsafeKeys(data)) {
    return { ok: false, reason: 'buff_monitor_keys_invalid' }
  }

  const definitionIds = new Set()
  for (const definition of data.definitions) {
    if (!validateDefinition(definition) || definitionIds.has(definition.conditionId)) {
      return { ok: false, reason: 'buff_monitor_definition_invalid' }
    }
    definitionIds.add(definition.conditionId)
  }

  const primaryTargetIds = new Set((primaryData?.targets || []).map(target => String(target?.targetId || '')))
  const targetIds = new Set()
  let playerCount = 0
  let buffCount = 0
  let segmentCount = 0

  for (const target of data.targets) {
    if (!isObject(target) || typeof target.targetId !== 'string' || !target.targetId ||
      target.targetId.length > 64 || targetIds.has(target.targetId) ||
      !primaryTargetIds.has(target.targetId) || !Array.isArray(target.players) ||
      target.players.length > MAX_PLAYERS_PER_TARGET) {
      return { ok: false, reason: 'buff_monitor_target_invalid' }
    }
    targetIds.add(target.targetId)
    playerCount += target.players.length

    const playerIds = new Set()
    for (const player of target.players) {
      if (!isObject(player) || typeof player.playerId !== 'string' || !player.playerId ||
        player.playerId.length > 64 || playerIds.has(player.playerId) ||
        typeof player.playerName !== 'string' || player.playerName.length > 100 ||
        typeof player.isSelf !== 'boolean' || !isFiniteOptional(player.battleSeconds) ||
        !Array.isArray(player.buffs) || player.buffs.length > MAX_BUFFS_PER_PLAYER) {
        return { ok: false, reason: 'buff_monitor_player_invalid' }
      }
      playerIds.add(player.playerId)
      buffCount += player.buffs.length

      const conditionIds = new Set()
      for (const buff of player.buffs) {
        if (!validateBuff(buff) || conditionIds.has(buff.conditionId) ||
          !definitionIds.has(buff.conditionId)) {
          return { ok: false, reason: 'buff_monitor_buff_invalid' }
        }
        conditionIds.add(buff.conditionId)
        const segments = buff.segments || []
        segmentCount += segments.length
        if (segmentCount > MAX_SEGMENTS || !segments.every(validateSegment)) {
          return { ok: false, reason: 'buff_monitor_segment_invalid' }
        }
      }
    }
  }

  return {
    ok: true,
    stats: {
      definitionCount: data.definitions.length,
      targetCount: data.targets.length,
      playerCount,
      buffCount,
      segmentCount
    }
  }
}

function buildInlineBuffMonitorData(primaryData) {
  const targets = (primaryData?.targets || [])
    .filter(target => Array.isArray(target?.buffCoverage) && target.buffCoverage.length)
    .map(target => ({
      targetId: String(target.targetId || ''),
      players: target.buffCoverage.map(player => ({
        playerId: String(player.playerId || ''),
        playerName: String(player.playerName || ''),
        isSelf: Boolean(player.isSelf),
        battleSeconds: player.battleSeconds,
        buffs: player.buffs || []
      }))
    }))
  if (!targets.length) return null

  const definitions = []
  const definitionIds = new Set()
  for (const target of targets) {
    for (const player of target.players) {
      for (const buff of player.buffs) {
        if (!definitionIds.has(buff?.conditionId)) {
          definitionIds.add(buff?.conditionId)
          definitions.push({
            conditionId: buff?.conditionId,
            conditionName: buff?.conditionName,
            iconId: buff?.iconId,
            strengthField: buff?.strengthField
          })
        }
      }
    }
  }
  return { schemaVersion: BUFF_MONITOR_SCHEMA_VERSION, definitions, targets }
}

function parseBuffMonitorUpload(fields, files, primaryData) {
  const sidecars = (files || []).filter(file => file.fieldname === 'buffMonitorFile')
  const versionValue = fields?.buffMonitorSchemaVersion
  const hashValue = fields?.buffMonitorSha256
  const anyPresent = sidecars.length > 0 || versionValue != null || hashValue != null
  if (!anyPresent) {
    const extensionData = primaryData?.extensions?.buffMonitor
    if (extensionData != null) {
      const validation = validateBuffMonitorData(extensionData, primaryData)
      if (!validation.ok) return validation
      return {
        ok: true,
        present: true,
        source: 'extension',
        schemaVersion: extensionData.schemaVersion,
        contentSha256: null,
        buffer: null,
        data: extensionData,
        stats: validation.stats
      }
    }
    const inlineData = buildInlineBuffMonitorData(primaryData)
    if (!inlineData) return { ok: true, present: false }
    const validation = validateBuffMonitorData(inlineData, primaryData)
    if (!validation.ok) return validation
    return {
      ok: true,
      present: true,
      source: 'inline',
      inline: true,
      schemaVersion: BUFF_MONITOR_SCHEMA_VERSION,
      contentSha256: null,
      buffer: null,
      data: inlineData,
      stats: validation.stats
    }
  }

  if (sidecars.length !== 1 || versionValue == null || hashValue == null) {
    return { ok: false, reason: 'buff_monitor_fields_incomplete' }
  }
  const schemaVersion = Number(versionValue)
  if (!Number.isInteger(schemaVersion) || schemaVersion !== BUFF_MONITOR_SCHEMA_VERSION) {
    return { ok: false, reason: 'buff_monitor_schema_unsupported' }
  }
  const contentSha256 = String(hashValue).trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(contentSha256)) {
    return { ok: false, reason: 'buff_monitor_sha256_invalid' }
  }

  const buffer = sidecars[0].buffer
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return { ok: false, reason: 'buff_monitor_file_empty' }
  }
  if (buffer.length > maxFileBytes) {
    return { ok: false, reason: 'buff_monitor_file_too_large' }
  }
  if (sha256Hex(buffer) !== contentSha256) {
    return { ok: false, reason: 'buff_monitor_sha256_mismatch' }
  }

  let jsonBuffer
  try {
    jsonBuffer = zlib.gunzipSync(buffer, { maxOutputLength: MAX_JSON_BYTES })
  } catch (error) {
    return { ok: false, reason: 'buff_monitor_gzip_invalid' }
  }
  let data
  try {
    data = JSON.parse(jsonBuffer.toString('utf8'))
  } catch (error) {
    return { ok: false, reason: 'buff_monitor_json_invalid' }
  }
  if (data?.schemaVersion !== schemaVersion) {
    return { ok: false, reason: 'buff_monitor_schema_mismatch' }
  }

  const validation = validateBuffMonitorData(data, primaryData)
  if (!validation.ok) return validation
  return {
    ok: true,
    present: true,
    source: 'sidecar',
    schemaVersion,
    contentSha256,
    buffer,
    data,
    stats: validation.stats
  }
}

module.exports = {
  BUFF_MONITOR_SCHEMA_VERSION,
  parseBuffMonitorUpload,
  validateBuffMonitorData
}
