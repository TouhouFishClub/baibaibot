const fs = require('fs')
const path = require('path')
const { SOURCE_ROOT } = require('./config')

function ensureSourceRoot() {
  fs.mkdirSync(SOURCE_ROOT, { recursive: true })
}

function sanitizeDirSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 50)
}

function buildPlayerDir(playerId, playerName) {
  const id = String(playerId || '').trim()
  const name = sanitizeDirSegment(playerName)
  if (!id) return name || 'unknown'
  return name ? `${id}_${name}` : id
}

function buildRelativePath(playerId, playerName, contentSha256) {
  return path.join(buildPlayerDir(playerId, playerName), `${contentSha256}.json.gz`)
}

function buildAbsolutePath(relativePath) {
  return path.join(SOURCE_ROOT, relativePath)
}

function saveSourceFile(playerId, playerName, contentSha256, buffer) {
  ensureSourceRoot()
  const relativePath = buildRelativePath(playerId, playerName, contentSha256)
  const absolutePath = buildAbsolutePath(relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, buffer)
  return relativePath.replace(/\\/g, '/')
}

function readSourceFile(relativePath) {
  const absolutePath = buildAbsolutePath(relativePath)
  if (!fs.existsSync(absolutePath)) {
    return null
  }
  return fs.readFileSync(absolutePath)
}

module.exports = {
  SOURCE_ROOT,
  buildPlayerDir,
  saveSourceFile,
  readSourceFile,
  buildRelativePath
}
