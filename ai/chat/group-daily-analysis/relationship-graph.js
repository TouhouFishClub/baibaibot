const {
  MAX_RELATION_NODES,
  MAX_RELATION_EDGES,
  MAX_RELATION_FACTIONS
} = require('./config')

const RELATION_COLORS = {
  '互怼': '#f44336',
  '吐槽': '#ef5350',
  '搭档': '#e91e63',
  'CP': '#ec407a',
  '师徒': '#9c27b0',
  '导师': '#8e24aa',
  '水友': '#2196f3',
  '互动': '#42a5f5',
  '围观': '#4caf50',
  '零食': '#66bb6a',
  '潜水': '#78909c',
  '核心': '#ff7043'
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncateName(name, max = 5) {
  const s = String(name || '').trim()
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

function normalizeUid(id) {
  const s = String(id || '').trim()
  const m = s.match(/\d{5,12}/)
  return m ? m[0] : ''
}

function lookupName(uid, userMap) {
  return userMap[uid] || userMap[parseInt(uid, 10)] || ('用户' + uid)
}

function getRelationColor(type) {
  const t = String(type || '').trim()
  for (const key of Object.keys(RELATION_COLORS)) {
    if (t.includes(key)) return RELATION_COLORS[key]
  }
  return '#8d6e63'
}

function collectNodeUids(relations, factions, topUsers) {
  const uids = new Set()
  for (const rel of relations || []) {
    if (rel.from) uids.add(String(rel.from))
    if (rel.to) uids.add(String(rel.to))
  }
  for (const faction of factions || []) {
    for (const uid of faction.members || []) {
      const id = normalizeUid(uid)
      if (id) uids.add(id)
    }
  }
  for (const user of topUsers || []) {
    if (uids.size >= MAX_RELATION_NODES) break
    uids.add(String(user.uid))
  }
  return Array.from(uids).slice(0, MAX_RELATION_NODES)
}

function buildMessageCountMap(topUsers) {
  const map = new Map()
  for (const user of topUsers || []) {
    map.set(String(user.uid), user.messageCount || 1)
  }
  return map
}

function layoutCircularNodes(uids, width, height, msgCountMap) {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.34
  const nodes = uids.map((uid, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(uids.length, 1) - Math.PI / 2
    const count = msgCountMap.get(uid) || 1
    const r = 24 + Math.min(12, Math.sqrt(count) * 2)
    return {
      uid,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      r
    }
  })
  return { nodes, cx, cy }
}

function buildEdgePath(x1, y1, x2, y2, bendIndex) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const sign = bendIndex % 2 === 0 ? 1 : -1
  const offset = Math.min(48, 18 + bendIndex * 4) * sign
  const cx = mx - (dy / len) * offset
  const cy = my + (dx / len) * offset
  return 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1)
}

function trimEdge(x1, y1, x2, y2, r1, r2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len
  const uy = dy / len
  return {
    x1: x1 + ux * (r1 + 2),
    y1: y1 + uy * (r1 + 2),
    x2: x2 - ux * (r2 + 6),
    y2: y2 - uy * (r2 + 6),
    mx: (x1 + x2) / 2,
    my: (y1 + y2) / 2
  }
}

function normalizeRelations(parsed, userMap, topUsers) {
  const relations = []
  const seen = new Set()
  const rawRelations = Array.isArray(parsed) ? parsed : (parsed && parsed.relations) || []

  for (const item of rawRelations) {
    const from = normalizeUid(item.from || item.from_id || item.user_id || item.a)
    const to = normalizeUid(item.to || item.to_id || item.target_id || item.b)
    if (!from || !to || from === to) continue
    const key = [from, to].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    const type = String(item.type || item.relation || item.label || '互动').trim()
    const strength = Math.max(1, Math.min(5, Number(item.strength) || 3))
    const desc = String(item.desc || item.description || item.reason || '').trim()
    relations.push({
      from,
      to,
      fromName: lookupName(from, userMap),
      toName: lookupName(to, userMap),
      type,
      strength,
      desc,
      color: getRelationColor(type)
    })
    if (relations.length >= MAX_RELATION_EDGES) break
  }

  const rawFactions = Array.isArray(parsed) ? [] : (parsed && parsed.factions) || []
  const factions = rawFactions.slice(0, MAX_RELATION_FACTIONS)
    .map(f => ({
      name: String(f.name || f.title || '小圈子').trim(),
      desc: String(f.desc || f.description || '').trim(),
      members: (f.members || []).map(normalizeUid).filter(Boolean)
    }))
    .filter(f => f.name && f.members.length > 0)

  const nodeUids = collectNodeUids(relations, factions, topUsers)
  const summary = parsed && !Array.isArray(parsed) ? String(parsed.summary || '').trim() : ''
  return { summary, relations, factions, nodeUids }
}

function buildFallbackRelations(interactionHints, topUsers, userMap) {
  const relations = []
  const seen = new Set()

  for (const line of interactionHints || []) {
    const match = line.match(/\((\d{5,12})\).*?\((\d{5,12})\):\s*@互动\s*(\d+)/)
    if (!match) continue
    const from = match[1]
    const to = match[2]
    const count = parseInt(match[3], 10)
    const key = [from, to].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    relations.push({
      from,
      to,
      fromName: lookupName(from, userMap),
      toName: lookupName(to, userMap),
      type: '频繁互动',
      strength: Math.min(5, 2 + Math.floor(count / 3)),
      desc: '根据 @ 提及统计，互动较频繁',
      color: getRelationColor('互动')
    })
    if (relations.length >= MAX_RELATION_EDGES) break
  }

  if (relations.length === 0 && topUsers && topUsers.length >= 2) {
    const hub = String(topUsers[0].uid)
    for (let i = 1; i < Math.min(4, topUsers.length); i++) {
      const peer = String(topUsers[i].uid)
      relations.push({
        from: hub,
        to: peer,
        fromName: topUsers[0].name,
        toName: topUsers[i].name,
        type: '活跃同屏',
        strength: 3,
        desc: '同为当日高活跃成员',
        color: getRelationColor('核心')
      })
    }
  }

  return {
    summary: '根据 @ 互动与活跃度生成的关系草图（LLM 未返回有效关系数据）',
    relations,
    factions: [],
    nodeUids: collectNodeUids(relations, [], topUsers)
  }
}

function buildRelationshipGraphSvg(groupRelations, userMap, topUsers) {
  const relations = groupRelations.relations || []
  const nodeUids = groupRelations.nodeUids || collectNodeUids(relations, groupRelations.factions, topUsers)
  if (!nodeUids.length) return ''

  const width = 920
  const height = 520
  const msgCountMap = buildMessageCountMap(topUsers)
  const { nodes } = layoutCircularNodes(nodeUids, width, height, msgCountMap)
  const nodeByUid = new Map(nodes.map(n => [n.uid, n]))

  let edgeSvg = ''
  relations.forEach((rel, index) => {
    const a = nodeByUid.get(rel.from)
    const b = nodeByUid.get(rel.to)
    if (!a || !b) return
    const trimmed = trimEdge(a.x, a.y, b.x, b.y, a.r, b.r)
    const path = buildEdgePath(trimmed.x1, trimmed.y1, trimmed.x2, trimmed.y2, index)
    const strokeWidth = 1.5 + rel.strength * 0.8
    edgeSvg += '<path d="' + path + '" fill="none" stroke="' + rel.color + '" stroke-width="' + strokeWidth.toFixed(1) + '" stroke-opacity="0.82" />'
    edgeSvg += '<text x="' + trimmed.mx.toFixed(1) + '" y="' + (trimmed.my - 6).toFixed(1) + '" text-anchor="middle" font-size="11" fill="' + rel.color + '" font-family="sans-serif">' + escapeXml(rel.type) + '</text>'
  })

  let nodeSvg = ''
  for (const node of nodes) {
    const name = truncateName(lookupName(node.uid, userMap), 6)
    const avatar = 'https://q1.qlogo.cn/g?b=qq&nk=' + node.uid + '&s=100'
    nodeSvg += '<g>'
    nodeSvg += '<circle cx="' + node.x.toFixed(1) + '" cy="' + node.y.toFixed(1) + '" r="' + node.r.toFixed(1) + '" fill="#fff" stroke="#5d4037" stroke-width="2.5" />'
    nodeSvg += '<clipPath id="clip-' + node.uid + '"><circle cx="' + node.x.toFixed(1) + '" cy="' + node.y.toFixed(1) + '" r="' + (node.r - 2).toFixed(1) + '" /></clipPath>'
    nodeSvg += '<image href="' + avatar + '" x="' + (node.x - node.r + 2).toFixed(1) + '" y="' + (node.y - node.r + 2).toFixed(1) + '" width="' + ((node.r - 2) * 2).toFixed(1) + '" height="' + ((node.r - 2) * 2).toFixed(1) + '" clip-path="url(#clip-' + node.uid + ')" preserveAspectRatio="xMidYMid slice" />'
    nodeSvg += '<text x="' + node.x.toFixed(1) + '" y="' + (node.y + node.r + 18).toFixed(1) + '" text-anchor="middle" font-size="13" fill="#5d4037" font-family="sans-serif" font-weight="600">' + escapeXml(name) + '</text>'
    nodeSvg += '</g>'
  }

  return '<svg class="relation-graph-svg" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="群关系图">' +
    '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" fill="#fffdf8" stroke="#d7ccc8" stroke-width="2" stroke-dasharray="8 6" />' +
    edgeSvg + nodeSvg +
    '</svg>'
}

function buildRelationLegendHtml(relations) {
  const types = []
  const seen = new Set()
  for (const rel of relations || []) {
    if (!rel.type || seen.has(rel.type)) continue
    seen.add(rel.type)
    types.push(rel)
    if (types.length >= 6) break
  }
  if (!types.length) return ''
  return '<div class="relation-legend">' + types.map(rel =>
    '<span class="relation-legend-item"><i style="background:' + rel.color + '"></i>' + escapeXml(rel.type) + '</span>'
  ).join('') + '</div>'
}

function buildRelationCardsHtml(relations) {
  if (!relations || !relations.length) return ''
  return '<div class="relation-cards">' + relations.map(rel => `
    <div class="relation-card" style="border-color:${rel.color}">
      <div class="relation-card-head">
        <span class="relation-type" style="color:${rel.color}">${escapeXml(rel.type)}</span>
        <span class="relation-strength">${'★'.repeat(rel.strength)}${'☆'.repeat(5 - rel.strength)}</span>
      </div>
      <div class="relation-pair">${escapeXml(rel.fromName)} ↔ ${escapeXml(rel.toName)}</div>
      <div class="relation-desc">${escapeXml(rel.desc)}</div>
    </div>`).join('') + '</div>'
}

function buildFactionTagsHtml(factions, userMap) {
  if (!factions || !factions.length) return ''
  return '<div class="relation-factions">' + factions.map(f => {
    const members = (f.members || [])
      .map(uid => lookupName(uid, userMap))
      .slice(0, 5)
      .join(' · ')
    return '<div class="relation-faction"><div class="relation-faction-name">🧩 ' + escapeXml(f.name) + '</div>' +
      (members ? '<div class="relation-faction-members">' + escapeXml(members) + '</div>' : '') +
      (f.desc ? '<div class="relation-faction-desc">' + escapeXml(f.desc) + '</div>' : '') +
      '</div>'
  }).join('') + '</div>'
}

module.exports = {
  normalizeRelations,
  buildFallbackRelations,
  buildRelationshipGraphSvg,
  buildRelationLegendHtml,
  buildRelationCardsHtml,
  buildFactionTagsHtml,
  getRelationColor
}
