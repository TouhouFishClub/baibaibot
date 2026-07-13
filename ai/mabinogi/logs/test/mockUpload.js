/**
 * 使用 test/mock/manifest.json 模拟客户端 multipart 上传。
 *
 * 用法:
 *   node ai/mabinogi/logs/test/mockUpload.js
 *   node ai/mabinogi/logs/test/mockUpload.js --only 01,02
 *   node ai/mabinogi/logs/test/mockUpload.js --endpoint http://127.0.0.1:10086/mabinogi/dpsPusher
 *   node ai/mabinogi/logs/test/mockUpload.js --secret blony-upload-test-secret
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const http = require('http')
const https = require('https')
const { URL } = require('url')

const MOCK_DIR = path.join(__dirname, 'mock')
const MANIFEST_PATH = path.join(MOCK_DIR, 'manifest.json')
const SECRET_PATH = path.join(__dirname, '..', '.secret.json')

function parseArgs(argv) {
  const args = { only: null, endpoint: null, secret: null }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--only') {
      args.only = String(argv[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean)
      i++
    } else if (argv[i] === '--endpoint') {
      args.endpoint = argv[i + 1]
      i++
    } else if (argv[i] === '--secret') {
      args.secret = argv[i + 1]
      i++
    }
  }
  return args
}

function resolveSecretKey(secret) {
  const trimmed = String(secret || '').trim()
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length >= 16) {
    const decoded = Buffer.from(trimmed, 'base64')
    if (decoded.length >= 16) return decoded
  }
  return Buffer.from(trimmed, 'utf8')
}

function loadDefaultEndpoint() {
  try {
    const secretFile = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'))
    if (secretFile.BLONY_UPLOAD_ENDPOINT) {
      return secretFile.BLONY_UPLOAD_ENDPOINT
    }
  } catch (error) {
    // ignore
  }
  return 'http://127.0.0.1:10086/mabinogi/dpsPusher'
}

function loadDefaultSecret() {
  try {
    const secretFile = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'))
    if (secretFile.BLONY_UPLOAD_SECRET) {
      return secretFile.BLONY_UPLOAD_SECRET
    }
  } catch (error) {
    // ignore
  }
  return 'blony-upload-test-secret'
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function buildSignature(secretKey, timestamp, nonce, playerId, contentSha256) {
  const payload = `${timestamp}\n${nonce}\n${playerId}\n${contentSha256}`
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex')
}

function buildMultipart(boundary, fields, fileFieldName, fileName, fileBuffer) {
  const chunks = []
  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${value}\r\n`
    )
  }
  chunks.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"\r\n` +
    `Content-Type: application/gzip\r\n\r\n`
  )
  const tail = `\r\n--${boundary}--\r\n`
  return Buffer.concat([
    Buffer.from(chunks.join('')),
    fileBuffer,
    Buffer.from(tail)
  ])
}

function postMultipart(urlString, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString)
    const transport = url.protocol === 'https:' ? https : http
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': body.length
      }
    }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try {
          json = JSON.parse(text)
        } catch (error) {
          // keep raw text
        }
        resolve({ status: res.statusCode, text, json })
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function uploadSample({ endpoint, secretKey, sample, useManifestAuth }) {
  const filePath = path.join(MOCK_DIR, sample.file)
  if (!fs.existsSync(filePath)) {
    throw new Error(`缺少样本文件: ${filePath}`)
  }
  const fileBuffer = fs.readFileSync(filePath)
  const contentSha256 = sha256Hex(fileBuffer)
  const fields = {
    playerId: sample.playerId,
    playerName: sample.playerName || '',
    dungeonName: sample.dungeonName,
    fileName: sample.fileName,
    clientVersion: sample.clientVersion || '2.2.2',
    contentSha256
  }

  let timestamp
  let nonce
  let signature
  if (useManifestAuth && sample.exampleRequest) {
    timestamp = sample.exampleRequest.timestamp
    nonce = sample.exampleRequest.nonce
    signature = String(sample.exampleRequest.authorization || '').replace(/^HMAC-SHA256\s+/i, '').trim()
  } else {
    timestamp = Math.floor(Date.now() / 1000)
    nonce = crypto.randomBytes(16).toString('hex')
    signature = buildSignature(secretKey, timestamp, nonce, fields.playerId, contentSha256)
  }

  const boundary = `----dpsMock${crypto.randomBytes(8).toString('hex')}`
  const body = buildMultipart(boundary, fields, 'file', sample.fileName, fileBuffer)
  const result = await postMultipart(endpoint, {
    Authorization: `HMAC-SHA256 ${signature}`,
    'X-Timestamp': String(timestamp),
    'X-Nonce': nonce,
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  }, body)

  return { sample: sample.id || sample.file, contentSha256, ...result }
}

async function main() {
  const args = parseArgs(process.argv)
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`未找到 ${MANIFEST_PATH}`)
    console.error('请把 mock 样本与 manifest.json 放到 ai/mabinogi/logs/test/mock/')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  const endpoint = args.endpoint || manifest.endpoint || loadDefaultEndpoint()
  const secret = args.secret || manifest.testSecret || loadDefaultSecret()
  const secretKey = resolveSecretKey(secret)
  const samples = (manifest.samples || []).filter(sample => {
    if (!args.only) return true
    const id = sample.id || ''
    return args.only.some(key => id.startsWith(key) || sample.file.startsWith(key))
  })

  if (!samples.length) {
    console.error('没有可上传的样本')
    process.exit(1)
  }

  console.log(`Endpoint: ${endpoint}`)
  console.log(`Samples: ${samples.length}`)

  for (const sample of samples) {
    const shouldUpload = sample.clientShouldUpload !== false
    const useManifestAuth = Boolean(sample.exampleRequest)
    try {
      const result = await uploadSample({ endpoint, secretKey, sample, useManifestAuth })
      const expect = shouldUpload ? 'accept' : 'reject-or-skip'
      console.log(`[${result.sample}] HTTP ${result.status} expect=${expect}`)
      console.log(result.json || result.text)
    } catch (error) {
      console.error(`[${sample.id || sample.file}] 上传失败:`, error.message)
    }
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
