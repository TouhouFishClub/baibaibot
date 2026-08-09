const path = require('path-extra')
const fs = require('fs')
const nodeHtmlToImage = require('node-html-to-image')
const font2base64 = require('node-font2base64')
const {
  formatHp,
  formatDuration,
  formatPercent,
  formatDps,
  formatDamage,
  shortRunId
} = require('./bossConfig')
const { getClassTheme, hexToRgba } = require('./classConfig')

const HANYIWENHEI = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'hk4e_zh-cn.ttf'))
const ORBITRON = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', '..', '..', 'font', 'Orbitron-VariableFont_wght.ttf'))
const FONT_DIR = path.join(__dirname, '..', '..', '..', 'font')
const encodeTtf = file => `data:font/ttf;base64,${fs.readFileSync(path.join(FONT_DIR, file)).toString('base64')}`
const FZJIHEI = encodeTtf('FZJiHJW.TTF')
const FZYOUSHANG = encodeTtf('FZYouSTJW-R.TTF')
const GEELY_DESIGN = encodeTtf('GeelyDesignType-R.TTF')
const ZZZ_DISPLAY = encodeTtf('ArupalaGroteskTrial-SuperBold.ttf')
const ANONYMOUS_CHARACTER_NAME = '神秘的米莱西安'
const ARCANA_ART = new Map()
const ARCANA_DIR = path.join(__dirname, 'arcana')
try {
  for (const file of fs.readdirSync(ARCANA_DIR)) {
    if (!file.toLowerCase().endsWith('.png')) continue
    const data = fs.readFileSync(path.join(ARCANA_DIR, file)).toString('base64')
    ARCANA_ART.set(path.basename(file, '.png'), `data:image/png;base64,${data}`)
  }
} catch (error) {
  console.warn('[mblogs] arcana assets unavailable', error.message)
}

function getArcanaArt(characterClass) {
  const name = String(characterClass || '').trim()
  const exact = ARCANA_ART.get(name)
  if (exact) return exact
  if (name.length < 2) return ''
  const prefix = name.slice(0, -1)
  const fallback = [...ARCANA_ART.entries()].find(([assetName]) => (
    assetName.length === name.length && assetName.slice(0, -1) === prefix
  ))
  return fallback?.[1] || ''
}

const RANKING_VISIBILITY = {
  optOut: 'optOut',
  anonymous: 'anonymous',
  public: 'public'
}
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const addZero = n => (n < 10 ? `0${n}` : `${n}`)

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}`
}

function formatHpDamageShare(row) {
  return `${formatHp(row.bossHp)} / ${formatDamage(row.totalDamage)}（${formatPercent(row.damagePercent)}）`
}

function truncate(text, max = 20) {
  const value = String(text || '')
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function maskPersonName(name) {
  const value = String(name || '').trim()
  if (!value || value === '-') return '-'
  const chars = Array.from(value)
  if (chars.length <= 1) return chars[0] || '-'
  return `${chars[0]}${'*'.repeat(chars.length - 1)}`
}

function maskTeammateNames(text) {
  const value = String(text || '').trim()
  if (!value || value === '-') return '-'
  return value
    .split(/[、,，]/)
    .map(part => maskPersonName(part.trim()))
    .filter(Boolean)
    .join('、') || '-'
}

function normalizeRankingVisibility(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return RANKING_VISIBILITY.optOut
  if (['public', '公开', '公开排行', 'show', 'visible'].includes(raw)) {
    return RANKING_VISIBILITY.public
  }
  if (['anonymous', '匿名', '匿名排行', 'anon', 'masked'].includes(raw)) {
    return RANKING_VISIBILITY.anonymous
  }
  return RANKING_VISIBILITY.optOut
}

function getRankingVisibility(row) {
  return normalizeRankingVisibility(
    row?.rankingVisibility
      || row?.rankingMode
      || row?.rankVisibility
      || row?.privacyMode
  )
}

function getDefaultCharacterName(row) {
  const visibility = getRankingVisibility(row)
  if (visibility === RANKING_VISIBILITY.anonymous) return ANONYMOUS_CHARACTER_NAME
  if (visibility === RANKING_VISIBILITY.public) {
    return String(row?.characterName || '').trim()
      || String(row?.characterId || '').trim()
      || '-'
  }
  return ''
}

function resolveNameVisibility(showMode, rows = []) {
  const mode = showMode || 'hidden'
  if (mode === 'hidden') {
    return {
      showCharacter: rows.some(row => Boolean(getDefaultCharacterName(row))),
      showTeammates: false
    }
  }
  return {
    showCharacter: mode === 'all' || mode === 'character' || mode === 'mask' || mode === 'maskCharacter',
    showTeammates: mode === 'all' || mode === 'mask' || mode === 'maskTeammate'
  }
}

function buildLayout({ showCharacter, showTeammates, showRunId }) {
  return {
    gridTemplate: '180px minmax(0, 1fr) 64px 92px 106px 190px',
    bodyWidth: 1120,
    contentWidth: 1050
  }
}

function formatDisplayNames(row, showMode, visibility) {
  const { showCharacter, showTeammates } = visibility || resolveNameVisibility(showMode, [row])
  let characterName = ''
  let teammateNames = ''

  if (showCharacter) {
    if (showMode === 'hidden') {
      characterName = getDefaultCharacterName(row)
    } else if (showMode === 'mask' || showMode === 'maskCharacter') {
      characterName = maskPersonName(row.characterName)
    } else {
      characterName = row.characterName || '-'
    }
  }
  if (showTeammates) {
    if (showMode === 'mask' || showMode === 'maskTeammate') {
      teammateNames = maskTeammateNames(row.teammateNames)
    } else {
      teammateNames = row.teammateNames || '-'
    }
  }

  return { characterName, teammateNames, showCharacter, showTeammates }
}

// 上传者名：all/角色/上传者 → 全名；脱敏/脱敏角色名 → 脱敏；其余 → ***
function formatUploaderName(row, showMode) {
  const mode = showMode || 'hidden'
  const name = row.uploaderName || row.uploaderId || ''
  if (!name) return '未知'
  if (mode === 'all' || mode === 'character' || mode === 'uploader') return name
  if (mode === 'mask' || mode === 'maskCharacter') return maskPersonName(name)
  return '***'
}

function getDpsTone(dps) {
  const n = Number(dps)
  if (!Number.isFinite(n)) return 'white'
  if (n > 3_000_000) return 'legendary'
  if (n > 2_000_000) return 'rainbow'
  if (n >= 1_500_000) return 'gold'
  if (n >= 1_000_000) return 'magenta'
  if (n >= 700_000) return 'blue'
  if (n >= 400_000) return 'green'
  return 'white'
}

function skillSegColor(primary, index, isOther) {
  // 仅用主色，相邻段用高低透明度交替拉开对比
  if (isOther) return hexToRgba(primary, 0.22)
  const alphas = [0.92, 0.38, 0.78, 0.32, 0.62]
  return hexToRgba(primary, alphas[index] ?? 0.45)
}

function renderSkills(skills, theme) {
  if (!skills?.length) return ''
  const segments = skills.map((skill, index) => {
    const pct = Math.max(0, Math.min(100, Number(skill.percent) || 0))
    if (pct <= 0) return ''
    const isOther = skill.name === '其他'
    const bg = skillSegColor(theme.primary, index, isOther)
    const label = `${truncate(skill.name, 8)} ${pct.toFixed(0)}%`
    return `<div class="skill-seg" style="flex:${pct.toFixed(2)}; background:${bg}" title="${escapeHtml(label)}">${escapeHtml(label)}</div>`
  }).join('')

  return `<div class="skills">${segments}</div>`
}

function formatContributionValue(value) {
  return escapeHtml(value).replace(/([A-Za-z]+)$/, '<span class="damage-unit">$1</span>')
}

function formatContributionAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '-'
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return String(Math.round(amount))
}

function renderRow(row, index, withSkill, showMode, visibility, showRunId) {
  const theme = getClassTheme(row.characterClass)
  const bg = `linear-gradient(104deg, ${hexToRgba(theme.primary, 0.30)} 0%, ${hexToRgba(theme.primary, 0.20)} 32%, ${hexToRgba(theme.primary, 0.08)} 62%, #0c0d0b 100%)`
  const dpsTone = getDpsTone(row.dps)
  const dpsText = escapeHtml(formatDps(row.dps))
  const dpsTextAttr = dpsTone === 'legendary' ? ` data-text="${dpsText}"` : ''
  const skillsHtml = withSkill ? renderSkills(row.skills, theme) : ''
  const names = formatDisplayNames(row, showMode, visibility)
  const uploaderName = formatUploaderName(row, showMode)
  const characterClass = String(row.characterClass || '未知').trim()
  const art = getArcanaArt(characterClass)
  const characterName = names.characterName || '-'
  const teammateMeta = names.showTeammates
    ? `<small class="teammates" title="${escapeHtml(names.teammateNames)}">${escapeHtml(truncate(names.teammateNames, 18))}</small>`
    : ''
  const runIdCell = showRunId
    ? `<div class="run-cell"><span class="run-id">${escapeHtml(shortRunId(row.runId))}</span></div>`
    : ''
  const share = Number(row.damagePercent)
  const shareValue = Number.isFinite(share) ? Math.max(0, Math.min(100, share)) : 0
  const shareText = Number.isFinite(share) ? share.toFixed(0) : '-'
  const hpValue = formatContributionAmount(row.bossHp)
  const damageValue = formatContributionAmount(row.totalDamage)

  return `
    <div class="row${withSkill ? ' row-with-skills' : ''}" style="--class-color:${theme.primary}; background:${bg}">
      <div class="arcana-visual">
        ${art ? `<img src="${art}" alt="${escapeHtml(characterClass)}">` : ''}
        <span class="arcana-name">${escapeHtml(characterClass)}</span>
      </div>
      <div class="uploader-meta">UPLOADER · ${escapeHtml(uploaderName)}</div>
      <div class="player">
        <span class="rank">${String(index + 1).padStart(2, '0')}</span>
        <div class="player-copy"><strong>${escapeHtml(truncate(characterName, 12))}</strong>${teammateMeta}</div>
      </div>
      <div class="plain-value">${escapeHtml(row.teamSize ?? '-')}<small>TEAM SIZE</small></div>
      <div class="plain-value duration-value">${escapeHtml(formatDuration(row.duration))}<small>DURATION</small></div>
      <div class="dps dps-${dpsTone}"><strong${dpsTextAttr}>${dpsText}</strong><small>DAMAGE / SEC</small></div>
      <div class="contribution">
        <div class="share-ring" style="--share:${shareValue}"><span>${shareText}%</span></div>
        <div class="contribution-copy"><strong>${formatContributionValue(damageValue)} / ${formatContributionValue(hpValue)}</strong><small>DAMAGE / BOSS HP</small></div>
      </div>
      ${runIdCell}
      ${skillsHtml}
    </div>`
}

function renderSection(section, withSkill, showMode, globalVisibility, showRunId) {
  const rows = section.rows || []
  const sectionName = section.title || rows[0]?.bossName || ''
  const title = sectionName
    ? `<div class="section-head"><div class="section-title"><h2>${escapeHtml(sectionName)}</h2></div><span class="record-count">${String(rows.length).padStart(2, '0')} RECORDS</span></div>`
    : ''
  const visibility = showMode === 'hidden'
    ? globalVisibility
    : resolveNameVisibility(showMode, rows)
  const { showCharacter, showTeammates } = visibility

  if (!rows.length) {
    return `<div class="section">${title}<div class="empty">暂无记录</div></div>`
  }

  return `
    <div class="section">
      ${title}
      <div class="list-body">
        ${rows.map((row, index) => renderRow(row, index, withSkill, showMode, visibility, showRunId)).join('')}
      </div>
    </div>`
}

function buildHtml(option) {
  const sections = option.sections || [{ rows: option.rows || [] }]
  const withSkill = Boolean(option.withSkill)
  const showMode = option.showMode || 'hidden'
  const showRunId = true
  const allRows = sections.flatMap(section => section.rows || [])
  const visibility = resolveNameVisibility(showMode, allRows)
  const layout = buildLayout({ ...visibility, showRunId })

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: "MabiHei"; src: url(${HANYIWENHEI}) format("truetype"); }
    @font-face { font-family: "Orbitron"; src: url(${ORBITRON}) format("truetype"); font-weight: 400 900; }
    @font-face { font-family: "FZJiHei"; src: url(${FZJIHEI}) format("truetype"); }
    @font-face { font-family: "FZYouShang"; src: url(${FZYOUSHANG}) format("truetype"); }
    @font-face { font-family: "GeelyDesign"; src: url(${GEELY_DESIGN}) format("truetype"); }
    @font-face { font-family: "ZZZDisplay"; src: url(${ZZZ_DISPLAY}) format("truetype"); }
    :root {
      --paper: #090a08;
      --surface: #11130f;
      --muted: #7f8479;
      --line: rgba(255,255,255,.14);
      --ink: #11120f;
      --acid: #eaff19;
      --orange: #ff6b35;
      --cyan: #35d8ff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; }
    body {
      width: ${layout.bodyWidth}px;
      padding: 24px 0 34px;
      color: #f4f5f1;
      background:
        linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px),
        var(--paper);
      background-size: 26px 26px;
      font-family: "MabiHei", sans-serif;
    }
    .section { width: ${layout.contentWidth}px; margin: 0 auto 30px; }
    .section-head {
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 0 8px 12px;
    }
    .section-title h2 {
      color: #fff;
      font: 900 25px/1 "ZZZDisplay", "MabiHei", sans-serif;
      text-shadow: 3px 4px 0 #000;
    }
    .record-count {
      padding: 7px 9px;
      color: var(--ink);
      background: var(--acid);
      box-shadow: 3px 3px 0 #000;
      font: 800 8px/1 "Orbitron", sans-serif;
    }
    .list-body { display: flex; flex-direction: column; gap: 10px; }
    .row {
      position: relative;
      display: grid;
      grid-template-columns: ${layout.gridTemplate};
      grid-template-rows: 60px;
      column-gap: 12px;
      align-items: center;
      width: 100%;
      height: 60px;
      min-height: 0;
      padding: 0 12px 0 0;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      overflow: hidden;
      transition: background .15s ease, transform .15s ease;
    }
    .row-with-skills {
      grid-template-rows: 60px 20px;
      height: 80px;
    }
    .row:hover {
      transform: translateX(3px);
      background: linear-gradient(104deg, color-mix(in srgb, var(--class-color) 36%, #1b1d18) 0%, color-mix(in srgb, var(--class-color) 24%, #171914) 34%, color-mix(in srgb, var(--class-color) 10%, #12140f) 64%, #0e0f0d 100%) !important;
    }
    .arcana-visual {
      position: relative;
      grid-row: 1;
      align-self: stretch;
      width: 100%;
      height: 100%;
      min-height: 60px;
      background: transparent;
      clip-path: polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%);
    }
    .row-with-skills .arcana-visual { border-radius: 7px 0 0 0; }
    .arcana-visual::before { content: ""; position: absolute; inset: 0; z-index: 1; background: transparent; pointer-events: none; }
    .arcana-visual img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
      -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 36%, transparent 78%);
      mask-image: linear-gradient(to bottom, #000 0%, #000 36%, transparent 78%);
    }
    .arcana-name {
      position: absolute;
      z-index: 2;
      left: 10px;
      right: 22px;
      bottom: 0;
      display: block;
      overflow: hidden;
      color: transparent;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 400 28px/.9 "FZYouShang", "MabiHei", sans-serif;
      background: linear-gradient(to bottom, transparent 0%, var(--class-color) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .player {
      position: relative;
      z-index: 2;
      min-width: 0;
      padding-right: 44px;
    }
    .rank {
      position: absolute;
      z-index: 4;
      top: -35px;
      right: 10px;
      color: rgba(255,255,255,.2);
      font: 400 60px/.9 "FZJiHei", "MabiHei", sans-serif;
      pointer-events: none;
    }
    .row:nth-child(1) .rank { color: rgba(255,199,46,.2); }
    .row:nth-child(2) .rank { color: rgba(216,224,232,.2); }
    .row:nth-child(3) .rank { color: rgba(205,127,50,.2); }
    .player-copy strong {
      display: block;
      overflow: hidden;
      color: transparent;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 400 35px/.95 "FZJiHei", "MabiHei", sans-serif;
      background: linear-gradient(to bottom, #f4f5f1 10%, #b9bcb5 88%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 0 #000);
    }
    .player-copy .teammates {
      display: block;
      margin-top: 4px;
      overflow: hidden;
      color: var(--muted);
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 700 7px/1 "Orbitron", sans-serif;
    }
    .uploader-meta {
      position: absolute;
      z-index: 4;
      top: 4px;
      left: 192px;
      color: #7f8479;
      font: 700 6px/1 "Orbitron", sans-serif;
    }
    .plain-value, .dps, .contribution { position: relative; z-index: 2; }
    .plain-value { color: #f4f5f1; font: 800 14px/1.3 "Orbitron", sans-serif; }
    .plain-value small,
    .dps small {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font: 700 7px/1 "Orbitron", sans-serif;
    }
    .duration-value, .duration-value small { font-family: "GeelyDesign", sans-serif; }
    .dps strong { display: block; font: 900 17px/1 "Orbitron", sans-serif; }
    .dps-legendary strong { position: relative; z-index: 0; isolation: isolate; color: #fff; font-family: 'Orbitron', sans-serif; }
    .dps-legendary strong::before,
    .dps-legendary strong::after {
      content: attr(data-text);
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      mix-blend-mode: screen;
      white-space: nowrap;
    }
    .dps-legendary strong::before { color: #ff2f45; transform: translate(-2px, 1.5px); }
    .dps-legendary strong::after { color: #00f0ff; transform: translate(2px, -1.5px); }
    .dps-rainbow strong {
      color: transparent;
      background: linear-gradient(90deg, #ff4d4d, #ffb84d, #ffe14d, #5dff8a, #4db8ff, #b84dff, #ff4da6);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .dps-gold strong { color: #ffd54f; }
    .dps-magenta strong { color: #ff4fcf; }
    .dps-blue strong { color: #4da3ff; }
    .dps-green strong { color: #52d67a; }
    .dps-white strong { color: #fff; }
    .contribution { display: flex; align-items: center; justify-content: flex-start; gap: 11px; min-width: 0; }
    .share-ring {
      position: relative;
      display: grid;
      place-items: center;
      flex: 0 0 52px;
      width: 52px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: conic-gradient(var(--class-color) calc(var(--share) * 1%), #26302c 0);
    }
    .share-ring::before { content: ""; position: absolute; inset: 6px; border-radius: 50%; background: #11130f; }
    .share-ring span { position: relative; z-index: 1; color: #fff; font: 900 10px/1 "Orbitron", sans-serif; }
    .contribution-copy { min-width: 0; margin-top: 12px; }
    .contribution-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 800 11px/1 "Orbitron", sans-serif; }
    .contribution-copy small { display: block; margin-top: 5px; color: var(--muted); font: 700 7px/1 "Orbitron", sans-serif; }
    .damage-unit { margin-left: 5px; }
    .run-cell { position: absolute; z-index: 5; top: -5px; right: 0; display: block; }
    .run-id { display: inline-block; padding: 4px 6px; color: #d9dcd1; border: 1px solid rgba(255,255,255,.28); border-top: 0; border-right: 0; background: rgba(9,10,8,.82); font: 400 10px/1 "Orbitron", sans-serif; }
    .skills { position: absolute; z-index: 3; grid-column: 1 / -1; left: 0; right: -12px; bottom: 0; display: flex; height: 20px; border-top: 1px solid rgba(255,255,255,.12); border-radius: 0; background: #080906; overflow: hidden; }
    .skill-seg { display: flex; align-items: center; min-width: 0; height: 100%; padding: 0 6px; overflow: hidden; color: rgba(255,255,255,.95); border-right: 1px solid rgba(0,0,0,.45); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); white-space: nowrap; text-overflow: ellipsis; font: 800 14px/1 "GeelyDesign", "MabiHei", sans-serif; }
    .skill-seg:last-child { border-right: 0; }
    .empty { padding: 18px; color: #777; text-align: center; background: rgba(255,255,255,.03); border-radius: 8px; }
  </style>
</head>
<body>
  ${sections.map(section => renderSection(section, withSkill, showMode, visibility, showRunId)).join('')}
</body>
</html>`
}

function buildLegacyHtml(option) {
  const sections = option.sections || [{ rows: option.rows || [] }]
  const withSkill = Boolean(option.withSkill)
  const showMode = option.showMode || 'hidden'
  const showRunId = showMode === 'all'
  const allRows = sections.flatMap(section => section.rows || [])
  const visibility = resolveNameVisibility(showMode, allRows)
  const layout = buildLayout({ ...visibility, showRunId })
  const width = layout.bodyWidth

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'HANYIWENHEI';
      src: url(${HANYIWENHEI}) format('truetype');
    }
    @font-face {
      font-family: 'Orbitron';
      src: url(${ORBITRON}) format('truetype');
      font-style: normal;
      font-weight: 400 900;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${width}px;
      background: #12141a;
      color: #e8eaed;
      font-family: HANYIWENHEI, sans-serif;
      padding: 28px 32px 36px;
    }
    .header {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .title {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #f5f6f8;
    }
    .desc {
      margin-top: 8px;
      font-size: 15px;
      color: #8b919a;
    }
    .section { margin-top: 20px; }
    .section:first-of-type { margin-top: 0; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      color: #d0d4db;
      margin-bottom: 10px;
      padding-left: 4px;
    }
    .section-count {
      font-size: 12px;
      color: #9aa0a8;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      padding: 2px 8px;
    }
    .list-head,
    .main {
      display: grid;
      grid-template-columns: ${layout.gridTemplate};
      align-items: center;
      column-gap: 8px;
    }
    .list-head {
      height: 30px;
      margin: 0 12px 6px 14px;
      color: #7d848e;
      font-size: 13px;
      letter-spacing: 0.3px;
    }
    .list-head .cell {
      color: #7d848e;
      font-family: HANYIWENHEI, sans-serif;
      font-size: 13px;
      font-weight: 400;
    }
    .list-head .dps {
      color: #fff;
    }
    .list-body { display: flex; flex-direction: column; gap: 6px; }
    .row {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 56px;
      border-radius: 10px;
      font-size: 15px;
      line-height: 1.35;
      color: #eef0f3;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
      padding: 18px 12px 12px 14px;
    }
    .row-with-skills {
      padding-bottom: 10px;
    }
    .main {
      width: 100%;
    }
    .meta {
      position: absolute;
      top: 5px;
      left: 14px;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.2px;
      pointer-events: none;
    }
    .cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #eef0f3; }
    .class { color: #fff; font-weight: 400; }
    .name { font-weight: 700; }
    .row .teammates {
      color: #9aa3ad;
      font-family: monospace;
      font-size: 13px;
    }
    .dps { font-weight: 700; }
    .dps-rainbow {
      background: linear-gradient(90deg, #ff4d4d, #ffb84d, #ffe14d, #5dff8a, #4db8ff, #b84dff, #ff4da6);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }
    .dps-legendary {
      position: relative;
      z-index: 0;
      isolation: isolate;
      font-family: 'Orbitron', HANYIWENHEI, sans-serif;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: #fff;
      -webkit-text-fill-color: #fff;
    }
    .dps-legendary::before,
    .dps-legendary::after {
      content: attr(data-text);
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      mix-blend-mode: screen;
      white-space: nowrap;
    }
    .dps-legendary::before {
      color: #ff2f45;
      -webkit-text-fill-color: #ff2f45;
      transform: translate(-1px, -0.8px);
    }
    .dps-legendary::after {
      color: #00f0ff;
      -webkit-text-fill-color: #00f0ff;
      transform: translate(1px, 0.8px);
    }
    .dps-gold { color: #ffd54f; }
    .dps-magenta { color: #ff4fcf; }
    .dps-blue { color: #4da3ff; }
    .dps-green { color: #52d67a; }
    .dps-white { color: #ffffff; }
    .share { color: #cfd6df; font-size: 14px; }
    .runid {
      color: #eef0f3;
      font-family: HANYIWENHEI, sans-serif;
      font-size: 14px;
    }
    .skills {
      display: flex;
      width: 100%;
      height: 18px;
      margin-top: 8px;
      border-radius: 4px;
      overflow: hidden;
      background: rgba(0,0,0,0.22);
    }
    .skill-seg {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-width: 0;
      height: 100%;
      padding: 0 6px;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.95);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-right: 1px solid rgba(0,0,0,0.45);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }
    .skill-seg:last-child {
      border-right: 0;
    }
    .empty {
      padding: 18px;
      color: #777;
      text-align: center;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(option.title)}</div>
    <div class="desc">${escapeHtml(option.description)}</div>
  </div>
  ${sections.map(section => renderSection(section, withSkill, showMode, visibility, showRunId)).join('')}
</body>
</html>`
}

async function renderMblogsList(option) {
  const html = buildHtml(option)
  await nodeHtmlToImage({
    output: option.output,
    html,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })
}

module.exports = {
  renderMblogsList,
  buildHtml,
  getDpsTone,
  normalizeRankingVisibility,
  getDefaultCharacterName,
  resolveNameVisibility,
  ANONYMOUS_CHARACTER_NAME,
  RANKING_VISIBILITY
}
