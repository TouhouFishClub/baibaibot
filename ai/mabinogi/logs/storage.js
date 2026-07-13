const fs = require('fs')
const path = require('path')
const { SOURCE_ROOT } = require('./config')

function ensureSourceRoot() {
  fs.mkdirSync(SOURCE_ROOT, { recursive: true })
}

function buildRelativePath(playerId, contentSha256) {
  return path.join(String(playerId), `${contentSha256}.json.gz`)
}

function buildAbsolutePath(relativePath) {
  return path.join(SOURCE_ROOT, relativePath)
}

function saveSourceFile(playerId, contentSha256, buffer) {
  ensureSourceRoot()
  const relativePath = buildRelativePath(playerId, contentSha256)
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
  saveSourceFile,
  readSourceFile,
  buildRelativePath
}
