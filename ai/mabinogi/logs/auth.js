const crypto = require('crypto')
const { uploadSecretKey, signatureMaxSkewSeconds } = require('./config')
const { reserveNonce } = require('./db')

const AUTH_PREFIX = 'HMAC-SHA256 '

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function buildSignatureWithKey(secretKey, timestamp, nonce, playerId, fileHashHex) {
  const payload = `${timestamp}\n${nonce}\n${playerId}\n${fileHashHex}`
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex')
}

function buildSignature(timestamp, nonce, playerId, fileHashHex) {
  return buildSignatureWithKey(uploadSecretKey, timestamp, nonce, playerId, fileHashHex)
}

function verifyTimestamp(timestamp) {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: 'invalid_timestamp' }
  }
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > signatureMaxSkewSeconds) {
    return { ok: false, reason: 'timestamp_expired' }
  }
  return { ok: true, timestamp: ts }
}

function verifyNonceFormat(nonce) {
  if (!nonce || !/^[0-9a-fA-F]{32}$/.test(nonce)) {
    return { ok: false, reason: 'invalid_nonce' }
  }
  return { ok: true }
}

function verifySignature(timestamp, nonce, playerId, gzData, authHeader) {
  if (!uploadSecretKey.length) {
    return { ok: false, reason: 'server_secret_missing' }
  }
  if (!authHeader || !authHeader.startsWith(AUTH_PREFIX)) {
    return { ok: false, reason: 'invalid_auth_header' }
  }

  const provided = authHeader.slice(AUTH_PREFIX.length).trim()
  const fileHashHex = sha256Hex(gzData)
  const expected = buildSignature(timestamp, nonce, playerId, fileHashHex)
  const expectedBuf = Buffer.from(expected, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: 'signature_mismatch' }
  }

  return { ok: true, fileHashHex }
}

async function verifyUploadHeaders(req, { reserve = true } = {}) {
  const timestamp = req.headers['x-timestamp'] || req.headers['X-Timestamp']
  const nonce = req.headers['x-nonce'] || req.headers['X-Nonce']

  const tsResult = verifyTimestamp(timestamp)
  if (!tsResult.ok) return tsResult

  const nonceFormat = verifyNonceFormat(nonce)
  if (!nonceFormat.ok) return nonceFormat

  if (reserve) {
    const nonceOk = await reserveNonce(nonce)
    if (!nonceOk) {
      return { ok: false, reason: 'nonce_replay' }
    }
  }

  return { ok: true, timestamp: tsResult.timestamp, nonce }
}

async function verifyUploadRequest(req, gzData, playerId) {
  const headerResult = await verifyUploadHeaders(req)
  if (!headerResult.ok) {
    return headerResult
  }

  const authHeader = req.headers.authorization || req.headers.Authorization
  const signResult = verifySignature(
    headerResult.timestamp,
    headerResult.nonce,
    playerId,
    gzData,
    authHeader
  )
  if (!signResult.ok) {
    return signResult
  }

  return { ok: true, fileHashHex: signResult.fileHashHex }
}

module.exports = {
  sha256Hex,
  buildSignature,
  buildSignatureWithKey,
  verifyUploadHeaders,
  verifySignature,
  verifyUploadRequest
}
