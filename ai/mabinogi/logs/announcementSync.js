const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { parse } = require('node-html-parser')
const { publishAnnouncement } = require('./db')

const ANNOUNCEMENT_FILE = path.join(__dirname, 'announcement.html')
const WATCH_INTERVAL_MS = 1000
const DEBOUNCE_MS = 300

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseAnnouncementHtml(source) {
  const root = parse(String(source || ''))
  const title = normalizeText(
    root.querySelector('title')?.textContent
      || root.querySelector('h1')?.textContent
      || '服务公告'
  )
  const body = root.querySelector('body')
  const html = String(body ? body.innerHTML : source || '').trim()
  const visibleText = normalizeText(body ? body.textContent : root.textContent)

  if (!html || !visibleText) return null
  return { title, html }
}

function announcementHash({ title, html }) {
  return crypto.createHash('sha256').update(`${title}\n${html}`).digest('hex')
}

async function syncAnnouncementFile({ filePath = ANNOUNCEMENT_FILE, publish = publishAnnouncement } = {}) {
  let stat
  let source
  try {
    stat = fs.statSync(filePath)
    source = fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 'missing' }
    throw error
  }

  const parsed = parseAnnouncementHtml(source)
  if (!parsed) return { status: 'empty' }

  const result = await publish({
    ...parsed,
    sourceHash: announcementHash(parsed),
    sourceMtimeMs: stat.mtimeMs
  })
  return {
    status: result.created ? 'published' : 'unchanged',
    announcement: result.announcement
  }
}

function startAnnouncementSync({ filePath = ANNOUNCEMENT_FILE } = {}) {
  let debounceTimer = null
  let syncing = false
  let pending = false

  const run = async () => {
    if (syncing) {
      pending = true
      return
    }
    syncing = true
    try {
      const result = await syncAnnouncementFile({ filePath })
      if (result.status === 'published') {
        console.log(`[dps-logs] 公告已发布 timestamp=${result.announcement.timestamp} title=${result.announcement.title}`)
      }
    } catch (error) {
      console.error('[dps-logs] 公告同步失败', error)
    } finally {
      syncing = false
      if (pending) {
        pending = false
        run()
      }
    }
  }

  const schedule = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(run, DEBOUNCE_MS)
  }

  run()
  fs.watchFile(filePath, { interval: WATCH_INTERVAL_MS, persistent: false }, (current, previous) => {
    if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size) schedule()
  })

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    fs.unwatchFile(filePath)
  }
}

module.exports = {
  ANNOUNCEMENT_FILE,
  parseAnnouncementHtml,
  announcementHash,
  syncAnnouncementFile,
  startAnnouncementSync
}
