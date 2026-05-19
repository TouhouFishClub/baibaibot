/**
 * 话题正文：将昵称替换为带头像的 user-pill 内联标签
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getAvatarUrl(uid) {
  return 'https://q1.qlogo.cn/g?b=qq&nk=' + uid + '&s=100'
}

function buildMentionList(userMap, contributors) {
  const list = []
  const seenNames = new Set()

  const addByUid = uid => {
    const key = String(uid)
    const name = userMap[key] || userMap[parseInt(key, 10)]
    if (!name || seenNames.has(name)) return
    seenNames.add(name)
    list.push({ name, uid: key })
  }

  if (Array.isArray(contributors)) {
    for (const c of contributors) {
      if (/^\d{5,12}$/.test(String(c))) addByUid(c)
      else if (c && seenNames.has(c)) { /* nickname in contributors */ }
      else if (c) {
        for (const key of Object.keys(userMap)) {
          if (userMap[key] === c) {
            addByUid(key)
            break
          }
        }
      }
    }
  }

  for (const key of Object.keys(userMap)) {
    if (!/^\d{5,12}$/.test(String(key))) continue
    const name = userMap[key]
    if (name && !seenNames.has(name)) {
      seenNames.add(name)
      list.push({ name, uid: String(key) })
    }
  }

  list.sort((a, b) => b.name.length - a.name.length)
  return list
}

function userPillHtml(name, uid) {
  return '<span class="user-pill">'
    + '<img class="user-pill-avatar" src="' + getAvatarUrl(uid) + '" alt="" onerror="this.style.display=\'none\'">'
    + '<span class="user-pill-name">' + escapeHtml(name) + '</span>'
    + '</span>'
}

/** 去掉 「昵称（QQ）」 中的 QQ 括号，便于按昵称匹配 */
function normalizeDetailText(detail) {
  let text = detail || ''
  text = text.replace(/([^\s（(]+)[（(]\d{5,12}[）)]/g, '$1')
  return text
}

function renderTopicDetailHtml(detail, userMap, contributors) {
  const raw = normalizeDetailText(detail)
  if (!raw) return ''

  const mentions = buildMentionList(userMap, contributors)
  if (!mentions.length) return escapeHtml(raw)

  let segments = [{ type: 'text', value: raw }]

  for (const { name, uid } of mentions) {
    if (!name || name.length < 2) continue
    const next = []
    for (const seg of segments) {
      if (seg.type !== 'text') {
        next.push(seg)
        continue
      }
      const parts = seg.value.split(name)
      if (parts.length === 1) {
        next.push(seg)
        continue
      }
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) next.push({ type: 'text', value: parts[i] })
        if (i < parts.length - 1) next.push({ type: 'mention', name, uid })
      }
    }
    segments = next
  }

  return segments.map(seg => {
    if (seg.type === 'text') return escapeHtml(seg.value)
    return userPillHtml(seg.name, seg.uid)
  }).join('')
}

module.exports = {
  renderTopicDetailHtml,
  escapeHtml,
  getAvatarUrl
}
