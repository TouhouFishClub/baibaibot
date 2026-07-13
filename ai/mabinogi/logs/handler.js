const multer = require('multer')
const { verifyUploadHeaders, verifySignature } = require('./auth')
const { reserveNonce } = require('./db')
const { uploadSecretKey } = require('./config')
const { isRateLimited } = require('./ratelimit')
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

async function handleUpload(req, res) {
  const ip = getClientIp(req)
  const fields = req.body || {}
  const fieldCheck = validateUploadFields(fields)
  if (!fieldCheck.ok) {
    return sendJson(res, 400, { ok: false, error: fieldCheck.reason })
  }

  if (!uploadSecretKey.length) {
    return sendJson(res, 401, { ok: false, error: 'server_secret_missing' })
  }

  const headerResult = await verifyUploadHeaders(req, { reserve: false })
  if (!headerResult.ok) {
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
    return sendJson(res, 429, { ok: false, error: 'rate_limited', scope: rate.reason })
  }

  const file = (req.files || []).find(item => item.fieldname === 'file') || req.file
  if (!file || !file.buffer) {
    return sendJson(res, 400, { ok: false, error: 'missing_file' })
  }

  const gzData = file.buffer
  const authHeader = req.headers.authorization || req.headers.Authorization
  const signResult = verifySignature(headerResult.timestamp, headerResult.nonce, playerId, gzData, authHeader)
  if (!signResult.ok) {
    return sendJson(res, 401, { ok: false, error: signResult.reason })
  }

  const nonceOk = await reserveNonce(headerResult.nonce)
  if (!nonceOk) {
    return sendJson(res, 401, { ok: false, error: 'nonce_replay' })
  }

  if (signResult.fileHashHex !== contentSha256) {
    return sendJson(res, 400, { ok: false, error: 'content_sha256_mismatch' })
  }

  const duplicate = await findDuplicate({ playerId, contentSha256, fileName })
  if (duplicate) {
    return sendJson(res, 200, { ok: true, reportId: duplicate._id, duplicate: true })
  }

  const parsed = parseGzipJson(gzData)
  if (!parsed.ok) {
    return sendJson(res, 400, { ok: false, error: parsed.reason })
  }

  const teamSignature = buildTeamSignature(parsed.data)
  const teamDuplicate = await findTeamDuplicate({ dungeonName, teamSignature })
  if (teamDuplicate) {
    return sendJson(res, 200, {
      ok: true,
      reportId: teamDuplicate._id,
      duplicate: true,
      reason: 'team_duplicate'
    })
  }

  const sourceRelPath = saveSourceFile(playerId, contentSha256, gzData)
  const reportId = newReportId()
  const now = new Date()

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
