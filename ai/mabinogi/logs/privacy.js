const config = require('./config')

// Never include private service addresses or signing keys in logs or test output.
function maskUploadText(value, { endpoint, secret } = {}) {
  let text = String(value ?? '')
  for (const address of [endpoint, config.uploadEndpoint, config.rankingConsentEndpoint, config.announcementEndpoint]) {
    if (!address) continue
    text = text.split(address).join('[server]')
    try {
      const host = new URL(address).hostname
      const pattern = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      text = text.replace(new RegExp(pattern, 'gi'), '[server]')
    } catch (_) {}
  }
  for (const key of [secret, config.uploadSecret]) {
    if (!key) continue
    const variants = [key, encodeURIComponent(key), JSON.stringify(key).slice(1, -1)]
    if (/^[A-Za-z0-9+/]+=*$/.test(key)) {
      const decoded = Buffer.from(key, 'base64')
      if (decoded.length >= 16) variants.push(decoded.toString('utf8'), decoded.toString('hex'))
    }
    for (const variant of variants) {
      if (variant) text = text.split(variant).join('[secret]')
    }
  }
  return text
}

module.exports = { maskUploadText }
