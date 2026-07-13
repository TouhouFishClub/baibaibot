/**
 * 本地单元测试：验签、解析、摘要提取（不依赖 Mongo / HTTP）。
 *
 * 用法: node ai/mabinogi/logs/test/localSmoke.js
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { buildSignature } = require('../auth')
const { parseGzipJson, validateSemantic } = require('../validate')
const { extractSummary } = require('../parser')

const MOCK_DIR = path.join(__dirname, 'mock')
const TEST_SECRET = 'blony-upload-test-secret'

function sign(secret, timestamp, nonce, playerId, buffer) {
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')
  return buildSignature(timestamp, nonce, playerId, fileHash)
}

function runForFile(fileName, playerId, dungeonName) {
  const filePath = path.join(MOCK_DIR, fileName)
  if (!fs.existsSync(filePath)) {
    console.log(`[skip] ${fileName} 不存在`)
    return
  }
  const buffer = fs.readFileSync(filePath)
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomBytes(16).toString('hex')
  const signature = sign(TEST_SECRET, timestamp, nonce, playerId, buffer)
  console.log(`[sign] ${fileName} => ${signature.slice(0, 16)}...`)

  const parsed = parseGzipJson(buffer)
  if (!parsed.ok) {
    console.log(`[parse-fail] ${fileName}: ${parsed.reason}`)
    return
  }
  const semantic = validateSemantic(parsed.data, dungeonName)
  console.log(`[semantic] ${fileName}: ${semantic.ok ? 'ok' : semantic.reason}`)
  if (semantic.ok) {
    const summary = extractSummary(parsed.data)
    console.log(`[summary] targets=${summary.targetCount} totalDamage=${summary.totalDamage}`)
  }
}

function main() {
  runForFile('01_minimal_single_boss.json.gz', '123456789', '布里列赫')
  runForFile('05_should_be_filtered_out.json.gz', '123456789', '布里列赫')
}

main()
