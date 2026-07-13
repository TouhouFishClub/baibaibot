const multer = require('multer')
const { verifyUploadHeaders, verifySignature } = require('./auth')
const { reserveNonce } = require('./db')
const { uploadSecretKey } = require('./config')
const { isRateLimited, isLoopback } = require('./ratelimit')
const { parseGzipJson, validateUploadFields } = require('./validate')
const { saveSourceFile, readSourceFile } = require('./storage')
const {
  newReportId,
  findDuplicate,
  findTeamDuplicate,
  insertPendingReport,
  getReportById,
  listReports
} = require('./db')
const { enqueueParseJob } = require('./queue')
const { maxFileBytes } = require('./config')
const { buildTeamSignature } = require('./team')
const { extractSummary } = require('./parser')
const { logReceive } = require('./receiveLog')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileBytes }
})

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return String(forwarded).split(',')[0].trim()
  }
  return req.socket?.remoteAddress || ''
}

function sendJson(res, status, body) {
  res.status(status).json(body)
}

function logUploadReject(ip, reason, fields = {}, extra = {}) {
  logReceive({
    event: 'upload_reject',
    ip,
    reason,
    playerId: fields.playerId ? String(fields.playerId).trim() : undefined,
    playerName: fields.playerName ? String(fields.playerName).trim() : undefined,
    dungeonName: fields.dungeonName ? String(fields.dungeonName).trim() : undefined,
    fileName: fields.fileName ? String(fields.fileName).trim() : undefined,
    ...extra
  })
}

async function handleUpload(req, res) {
  const ip = getClientIp(req)
  const fields = req.body || {}
  const fieldCheck = validateUploadFields(fields)
  if (!fieldCheck.ok) {
    logUploadReject(ip, fieldCheck.reason, fields)
    return sendJson(res, 400, { ok: false, error: fieldCheck.reason })
  }

  if (!uploadSecretKey.length) {
    logUploadReject(ip, 'server_secret_missing', fields)
    return sendJson(res, 401, { ok: false, error: 'server_secret_missing' })
  }

  const headerResult = await verifyUploadHeaders(req, { reserve: false })
  if (!headerResult.ok) {
    logUploadReject(ip, headerResult.reason, fields)
    return sendJson(res, 401, { ok: false, error: headerResult.reason })
  }

  const playerId = String(fields.playerId).trim()
  const playerName = String(fields.playerName || '').trim()
  const dungeonName = String(fields.dungeonName).trim()
  const fileName = String(fields.fileName).trim()
  const clientVersion = String(fields.clientVersion).trim()
  const contentSha256 = String(fields.contentSha256).trim().toLowerCase()

  const rate = isRateLimited(ip, playerId)
  if (rate.limited) {
    logUploadReject(ip, 'rate_limited', fields, { scope: rate.reason })
    return sendJson(res, 429, { ok: false, error: 'rate_limited', scope: rate.reason })
  }

  const file = (req.files || []).find(item => item.fieldname === 'file') || req.file
  if (!file || !file.buffer) {
    logUploadReject(ip, 'missing_file', fields)
    return sendJson(res, 400, { ok: false, error: 'missing_file' })
  }

  const gzData = file.buffer
  const authHeader = req.headers.authorization || req.headers.Authorization
  const signResult = verifySignature(headerResult.timestamp, headerResult.nonce, playerId, gzData, authHeader)
  if (!signResult.ok) {
    logUploadReject(ip, signResult.reason, fields)
    return sendJson(res, 401, { ok: false, error: signResult.reason })
  }

  const nonceOk = await reserveNonce(headerResult.nonce)
  if (!nonceOk) {
    logUploadReject(ip, 'nonce_replay', fields)
    return sendJson(res, 401, { ok: false, error: 'nonce_replay' })
  }

  if (signResult.fileHashHex !== contentSha256) {
    logUploadReject(ip, 'content_sha256_mismatch', fields)
    return sendJson(res, 400, { ok: false, error: 'content_sha256_mismatch' })
  }

  const duplicate = await findDuplicate({ playerId, contentSha256, fileName })
  if (duplicate) {
    logReceive({
      event: 'upload_duplicate',
      ip,
      reason: 'content_or_filename_duplicate',
      duplicate: true,
      playerId,
      playerName,
      dungeonName,
      fileName,
      reportId: duplicate._id
    })
    return sendJson(res, 200, {
      ok: true,
      reportId: duplicate._id,
      duplicate: true,
      reason: 'content_or_filename_duplicate'
    })
  }

  const parsed = parseGzipJson(gzData)
  if (!parsed.ok) {
    logUploadReject(ip, parsed.reason, fields, { fileBytes: gzData.length })
    return sendJson(res, 400, { ok: false, error: parsed.reason })
  }

  const teamSignature = buildTeamSignature(parsed.data)
  const skipTeamDedup = isLoopback(ip) && String(req.headers['x-mock-skip-team-dedup'] || '') === '1'
  if (!skipTeamDedup) {
    const teamDuplicate = await findTeamDuplicate({ dungeonName, teamSignature })
    if (teamDuplicate) {
      const summary = extractSummary(parsed.data)
      logReceive({
        event: 'upload_duplicate',
        ip,
        reason: 'team_duplicate',
        duplicate: true,
        playerId,
        playerName,
        dungeonName,
        fileName,
        reportId: teamDuplicate._id,
        targetCount: summary.targetCount,
        targets: summary.targets.map(item => ({
          targetName: item.targetName,
          maxHp: item.maxHp,
          totalDamage: item.totalDamage,
          duration: item.duration
        }))
      })
      return sendJson(res, 200, {
        ok: true,
        reportId: teamDuplicate._id,
        duplicate: true,
        reason: 'team_duplicate'
      })
    }
  }

  const sourceRelPath = saveSourceFile(playerId, playerName, contentSha256, gzData)
  const reportId = newReportId()
  const now = new Date()

  try {
    await insertPendingReport({
      _id: reportId,
      playerId,
      playerName,
      dungeonName,
      fileName,
      clientVersion,
      contentSha256,
      sourceRelPath,
      teamSignature,
      status: 'pending',
      parseError: null,
      uploadedAt: now,
      uploadedTs: now.getTime(),
      ip
    })
  } catch (error) {
    if (error && error.code === 11000) {
      const dup = await findDuplicate({ playerId, contentSha256, fileName })
      logReceive({
        event: 'upload_duplicate',
        ip,
        reason: 'content_or_filename_duplicate',
        duplicate: true,
        playerId,
        playerName,
        dungeonName,
        fileName,
        reportId: dup?._id
      })
      return sendJson(res, 200, {
        ok: true,
        reportId: dup?._id,
        duplicate: true,
        reason: 'content_or_filename_duplicate'
      })
    }
    throw error
  }

  const summary = extractSummary(parsed.data)
  logReceive({
    event: 'upload_accept',
    ip,
    playerId,
    playerName,
    dungeonName,
    fileName,
    clientVersion,
    contentSha256,
    fileBytes: gzData.length,
    reportId,
    targetCount: summary.targetCount,
    totalDamage: summary.totalDamage,
    targets: summary.targets.map(item => ({
      targetName: item.targetName,
      maxHp: item.maxHp,
      totalDamage: item.totalDamage,
      duration: item.duration,
      attackerCount: item.attackerCount
    }))
  })

  enqueueParseJob({ reportId, sourceRelPath, dungeonName })
  return sendJson(res, 200, { ok: true, reportId })
}

async function handleListReports(req, res) {
  const { playerId, limit, skip } = req.query
  const rows = await listReports({
    playerId,
    limit: limit ? Number(limit) : 20,
    skip: skip ? Number(skip) : 0
  })
  sendJson(res, 200, { ok: true, data: rows })
}

async function handleGetReport(req, res) {
  const report = await getReportById(req.params.reportId)
  if (!report) {
    return sendJson(res, 404, { ok: false, error: 'not_found' })
  }
  const { sourceRelPath, ...safe } = report
  sendJson(res, 200, { ok: true, data: safe })
}

async function handleGetReportDetail(req, res) {
  const report = await getReportById(req.params.reportId)
  if (!report) {
    return sendJson(res, 404, { ok: false, error: 'not_found' })
  }
  if (report.status === 'pending') {
    return sendJson(res, 202, { ok: false, error: 'still_parsing', data: { reportId: report._id, status: report.status } })
  }
  if (report.status === 'failed') {
    return sendJson(res, 422, { ok: false, error: report.parseError || 'parse_failed', data: { reportId: report._id, status: report.status } })
  }

  const buffer = readSourceFile(report.sourceRelPath)
  if (!buffer) {
    return sendJson(res, 404, { ok: false, error: 'source_file_missing' })
  }
  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) {
    return sendJson(res, 500, { ok: false, error: parsed.reason })
  }
  sendJson(res, 200, { ok: true, data: parsed.data })
}

function registerRoutes(app) {
  app.post('/mabinogi/dpsPusher', upload.any(), (req, res) => {
    handleUpload(req, res).catch(error => {
      console.error('[dps-logs] upload error', error)
      sendJson(res, 500, { ok: false, error: 'internal_error' })
    })
  })

  app.get('/mabinogi/dps/reports', (req, res) => {
    handleListReports(req, res).catch(error => {
      console.error('[dps-logs] list error', error)
      sendJson(res, 500, { ok: false, error: 'internal_error' })
    })
  })

  app.get('/mabinogi/dps/reports/:reportId', (req, res) => {
    handleGetReport(req, res).catch(error => {
      console.error('[dps-logs] get error', error)
      sendJson(res, 500, { ok: false, error: 'internal_error' })
    })
  })

  app.get('/mabinogi/dps/reports/:reportId/detail', (req, res) => {
    handleGetReportDetail(req, res).catch(error => {
      console.error('[dps-logs] detail error', error)
      sendJson(res, 500, { ok: false, error: 'internal_error' })
    })
  })
}

module.exports = {
  registerRoutes,
  handleUpload
}
