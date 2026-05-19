const fs = require('fs')
const path = require('path')

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

const SCRAPBOOK_CSS = `
:root {
  --bg-paper: #fdfbf7;
  --ink-primary: #5d4037;
  --ink-secondary: #8d6e63;
  --color-yellow: #fff9c4;
  --color-pink: #ffccbc;
  --color-blue: #b3e5fc;
  --color-green: #c8e6c9;
  --color-purple: #e1bee7;
  --accent-orange: #ff7043;
  --mbti-bg: #ede7f6;
  --mbti-border: #9575cd;
  --mbti-text: #512da8;
  --title-bg: #fffde7;
  --title-border: #ffb74d;
  --title-text: #bf360c;
  --font-title: cursive, "Microsoft YaHei", KaiTi, "STKaiti", serif;
  --font-hand: cursive, KaiTi, "STKaiti", "Microsoft YaHei", serif;
  --font-body: "Microsoft YaHei", "PingFang SC", sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: var(--font-body);
  color: var(--ink-primary);
  background-color: var(--bg-paper);
  background-image: radial-gradient(#ddd 2px, transparent 2px);
  background-size: 20px 20px;
  min-height: 100vh;
  padding: 40px 20px;
  line-height: 1.6;
}
.container {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  background: #fff;
  border: 2px solid var(--ink-primary);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 8px 8px 0 var(--color-blue), 16px 16px 0 var(--color-pink), 0 20px 40px rgba(0,0,0,0.1);
}
.container::before {
  content: "";
  position: absolute;
  top: 12px; bottom: 12px; left: 12px; right: 12px;
  border: 2px dashed var(--ink-secondary);
  border-radius: 15px;
  pointer-events: none;
  opacity: 0.5;
}
.header { text-align: center; margin-bottom: 50px; position: relative; padding-top: 20px; }
.title-sticker {
  display: inline-block;
  background: #fff;
  padding: 20px 60px;
  border: 3px dashed var(--ink-primary);
  border-radius: 15px;
  box-shadow: 5px 5px 0 var(--color-blue);
  transform: rotate(-2deg);
  position: relative;
}
.title-sticker h1 {
  font-family: var(--font-title);
  font-size: 2.8rem;
  color: var(--accent-orange);
  margin: 0;
}
.date-badge {
  position: absolute;
  bottom: -15px;
  right: -20px;
  background: var(--color-yellow);
  padding: 5px 15px;
  font-family: var(--font-hand);
  font-size: 1.2rem;
  box-shadow: 2px 2px 3px rgba(0,0,0,0.1);
  transform: rotate(5deg);
  border: 1px solid var(--ink-primary);
}
.tape-header {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 25px;
  background: rgba(255, 171, 145, 0.7);
  opacity: 0.8;
}
.stats-wrapper { display: flex; gap: 25px; margin-bottom: 40px; align-items: stretch; }
.stats-grid { flex: 2; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.stamp {
  width: 100%;
  height: 100%;
  background: #fff;
  padding: 15px;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.1);
  border: 2px solid var(--ink-primary);
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.stamp::after {
  content: "";
  position: absolute;
  top: 5px; bottom: 5px; left: 5px; right: 5px;
  border: 1px dotted #e0e0e0;
  border-radius: 8px;
  pointer-events: none;
}
.stamp-num { font-family: var(--font-title); font-size: 1.8rem; color: var(--accent-orange); line-height: 1; margin: 5px 0; }
.stamp-label { font-family: var(--font-hand); font-size: 1rem; color: var(--ink-secondary); }
.highlight-section {
  flex: 1;
  background: var(--color-yellow);
  padding: 20px;
  border: 2px solid var(--ink-primary);
  border-radius: 20px;
  box-shadow: 6px 6px 0 var(--color-pink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px);
}
.tape-top {
  width: 60px; height: 20px;
  background: rgba(255,255,255,0.5);
  position: absolute;
  top: -10px; left: 50%;
  transform: translateX(-50%);
}
.time-big { font-family: var(--font-title); font-size: 2.2rem; color: var(--ink-primary); margin: 10px 0; }
.time-desc { font-family: var(--font-hand); color: var(--ink-secondary); font-size: 1.2rem; }
.grid-layout { display: grid; grid-template-columns: repeat(12, 1fr); gap: 30px; }
.section-title {
  font-family: var(--font-title);
  font-size: 1.5rem;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-orange);
}
.chart-section {
  grid-column: span 12;
  background: #fff;
  border: 2px solid var(--ink-primary);
  border-radius: 5px 20px 20px 5px;
  padding: 20px 20px 20px 40px;
  position: relative;
  box-shadow: 5px 5px 0 rgba(0,0,0,0.05);
}
.coil {
  position: absolute;
  left: 10px; top: 20px; bottom: 20px;
  width: 10px;
  background: repeating-linear-gradient(to bottom, #ccc 0, #ccc 2px, transparent 2px, transparent 15px);
  border-left: 2px solid #999;
}
.chart-section-horizontal {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 220px;
  padding: 20px 10px 5px 10px;
  margin-top: 15px;
  position: relative;
  border-bottom: 2px solid var(--ink-secondary);
}
.chart-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  flex: 1;
  margin: 0 2px;
  position: relative;
}
.chart-bar-vertical {
  width: 100%;
  border-radius: 5px 5px 0 0;
  min-height: 4px;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
}
.chart-label-xaxis {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--ink-secondary);
  font-family: var(--font-hand);
  text-align: center;
}
.chart-value-top {
  position: absolute;
  top: -20px;
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--ink-secondary);
  font-family: var(--font-hand);
  width: 100%;
  text-align: center;
}
.topic-section {
  grid-column: span 12;
  background: #fff;
  padding: 30px 30px 30px 50px;
  border: 1px solid #ddd;
  background-image: repeating-linear-gradient(transparent, transparent 39px, #b2ebf2 39px, #b2ebf2 40px);
  line-height: 40px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.03);
  position: relative;
}
.paper-holes {
  position: absolute;
  left: 15px; top: 0; bottom: 0;
  width: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}
.hole {
  width: 12px; height: 12px;
  background: var(--bg-paper);
  border-radius: 50%;
  box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
}
.topic-item { display: flex; align-items: flex-start; margin-bottom: 20px; padding-top: 4px; }
.check-box {
  width: 20px; height: 20px;
  border: 2px solid var(--ink-primary);
  margin-right: 15px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  flex-shrink: 0;
}
.check-tick {
  width: 14px; height: 14px;
  background: var(--accent-orange);
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
}
.topic-content { line-height: 1.5; padding-top: 6px; flex: 1; }
.topic-title {
  font-family: var(--font-title);
  font-size: 1.5rem;
  margin-right: 10px;
  background: linear-gradient(transparent 60%, var(--color-pink) 60%);
  display: inline-block;
}
.topic-item:nth-child(even) .topic-title { background: linear-gradient(transparent 60%, var(--color-blue) 60%); }
.topic-item:nth-child(3n) .topic-title { background: linear-gradient(transparent 60%, var(--color-green) 60%); }
.topic-index { font-family: var(--font-hand); color: var(--ink-secondary); font-size: 1rem; }
.topic-contributors { font-family: var(--font-hand); color: var(--ink-secondary); font-size: 1rem; margin: 4px 0; }
.topic-detail { font-family: var(--font-hand); color: #666; font-size: 1.1rem; margin-top: 8px; line-height: 1.6; }
.user-section { grid-column: span 12; margin-top: 20px; }
.masonry-grid { column-count: 2; column-gap: 25px; }
.user-card {
  break-inside: avoid;
  background: #fffbf0;
  border: 2px solid var(--ink-primary);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 4px 4px 0 rgba(70,80,100,0.1), 3px 3px 0 1px var(--ink-primary);
  position: relative;
  display: flex;
  flex-direction: column;
}
.user-card:nth-child(even) { transform: rotate(1deg); border-color: var(--color-blue); }
.user-card:nth-child(3n) { transform: rotate(-1.5deg); border-color: var(--color-pink); }
.user-card:nth-child(5n) { transform: rotate(0.5deg); border-color: var(--color-green); }
.card-tape {
  position: absolute;
  top: -12px; left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  width: 80px; height: 24px;
  background-color: var(--color-blue);
  opacity: 0.8;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 2px dashed rgba(255,255,255,0.3);
  border-right: 2px dashed rgba(255,255,255,0.3);
}
.user-card:nth-child(2n) .card-tape { background-color: var(--color-pink); transform: translateX(-50%) rotate(3deg); }
.user-card:nth-child(3n) .card-tape { background-color: var(--color-green); transform: translateX(-50%) rotate(-1deg); }
.user-header { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 15px; border-bottom: 2px dashed #f0f0f0; padding-bottom: 15px; }
.u-avatar { width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--ink-primary); background: #eee; flex-shrink: 0; overflow: hidden; }
.u-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.u-name { font-family: var(--font-title); font-size: 1.25rem; line-height: 1.2; word-break: break-all; }
.badges { display: flex; flex-wrap: wrap; gap: 8px; }
.badge { font-size: 0.85rem; padding: 2px 8px; border-radius: 6px; font-family: var(--font-hand); white-space: nowrap; box-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.badge.title { background: var(--title-bg); color: var(--title-text); border: 1px solid var(--title-border); }
.badge.mbti { background: var(--mbti-bg); color: var(--mbti-text); border: 1px solid var(--mbti-border); font-weight: bold; }
.u-reason {
  font-family: var(--font-hand);
  font-size: 1.05rem;
  color: #444;
  line-height: 1.6;
  background: #f8fbff;
  border-left: 4px solid var(--color-blue);
  padding: 12px 15px;
  margin-top: 15px;
  border-radius: 4px;
  word-break: break-all;
}
.quotes-section { grid-column: span 12; display: flex; flex-direction: column; gap: 35px; margin-top: 20px; margin-bottom: 30px; }
.quote-wrapper { display: flex; flex-direction: column; width: 100%; max-width: 90%; position: relative; }
.q-flex-container { display: flex; gap: 15px; align-items: flex-start; }
.q-user-col { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 70px; }
.q-avatar { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #fff; background: #fff; object-fit: cover; box-shadow: 2px 2px 0 rgba(0,0,0,0.1); }
.quote-wrapper:nth-child(odd) .q-avatar { box-shadow: 0 0 0 2px var(--color-blue); }
.quote-wrapper:nth-child(even) .q-avatar { box-shadow: 0 0 0 2px var(--accent-orange); }
.q-content-col { flex: 1; display: flex; flex-direction: column; min-width: 0; align-items: flex-start; }
.q-sender-name {
  font-family: var(--font-hand);
  font-size: 1.25rem;
  color: var(--ink-primary);
  margin-bottom: 2px;
  margin-left: 10px;
  line-height: 1.2;
  position: relative;
  display: inline-block;
}
.q-sender-name::after {
  content: "";
  display: block;
  width: 100%;
  height: 4px;
  background: var(--color-blue);
  opacity: 0.4;
  border-radius: 2px;
  margin-top: -6px;
}
.quote-wrapper:nth-child(even) .q-flex-container { flex-direction: row-reverse; }
.quote-wrapper:nth-child(even) .q-content-col { align-items: flex-end; }
.quote-wrapper:nth-child(even) .q-sender-name { margin-left: 0; margin-right: 15px; text-align: right; }
.quote-wrapper:nth-child(even) .q-sender-name::after { background: var(--accent-orange); }
.quote-wrapper:nth-child(odd) { align-self: flex-start; }
.quote-wrapper:nth-child(even) { align-self: flex-end; align-items: flex-end; }
.q-bubble {
  background: #fff;
  border: 2px solid var(--ink-primary);
  padding: 15px 25px;
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--color-blue);
  width: fit-content;
  max-width: 100%;
}
.quote-wrapper:nth-child(odd) .q-bubble { border-top-left-radius: 4px; }
.quote-wrapper:nth-child(even) .q-bubble {
  border-top-right-radius: 4px;
  background: var(--color-yellow);
  box-shadow: -4px 4px 0 var(--color-pink);
  text-align: right;
}
.q-content { font-family: var(--font-title); font-size: 1.2rem; line-height: 1.4; }
.q-analysis-note {
  background: #fffde7;
  padding: 10px 15px;
  font-size: 0.9rem;
  color: #666;
  width: fit-content;
  max-width: 100%;
  margin-top: -5px;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
  border: 1px solid #ddd;
  font-family: var(--font-body);
  line-height: 1.5;
  border-radius: 0 0 10px 10px;
}
.quote-wrapper:nth-child(odd) .q-analysis-note { transform: rotate(-1deg) translateX(10px); }
.quote-wrapper:nth-child(even) .q-analysis-note { transform: rotate(1deg) translateX(-10px); text-align: left; background: #f3e5f5; }
.note-label { font-weight: bold; color: var(--accent-orange); display: block; margin-bottom: 4px; font-family: var(--font-title); }
.quality-section { grid-column: span 12; margin-top: 10px; }
.quality-item {
  background: #fff9c4;
  border: 2px dashed var(--ink-secondary);
  border-radius: 12px;
  padding: 24px;
  position: relative;
  box-shadow: 4px 4px 0 var(--ink-secondary);
}
.quality-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid var(--ink-secondary); padding-bottom: 10px; flex-wrap: wrap; gap: 10px; }
.theme-title-badge {
  font-family: var(--font-title);
  background: #ff7043;
  color: white;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 1.4em;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
  border: 2px solid var(--ink-primary);
  transform: rotate(-2deg);
}
.time-range {
  font-family: var(--font-title);
  font-size: 1.2em;
  color: var(--title-text);
  background: #ffccbc;
  padding: 4px 15px;
  border-radius: 8px;
  transform: rotate(-2deg);
  border: 2px solid var(--ink-secondary);
}
.dimension-bar-container {
  margin: 25px 0;
  background: #fff;
  border-radius: 12px;
  border: 2px solid var(--ink-secondary);
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
}
.dimension-bar { display: flex; height: 35px; width: 100%; }
.dimension-segment {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-right: 1px solid rgba(0,0,0,0.15);
}
.dimension-segment:last-child { border-right: none; }
.segment-label { font-size: 0.85em; color: white; font-weight: bold; text-shadow: 1px 1px 0 rgba(0,0,0,0.4); padding: 0 4px; }
.dimension-comments-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; margin-top: 10px; }
.dim-sticker {
  position: relative;
  background-color: #fffaf0;
  padding: 12px 14px;
  border: 2px dashed #ccc;
  border-radius: 6px;
  font-size: 0.88em;
  line-height: 1.5;
  color: #444;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.06);
}
.dim-sticker-title { display: inline-block; font-weight: bold; padding-bottom: 2px; margin-bottom: 4px; border-bottom: 2px solid #ccc; }
.small-tape {
  position: absolute;
  top: -8px; left: 50%;
  transform: translateX(-50%);
  width: 30px; height: 14px;
  background-color: rgba(255,255,255,0.5);
  border: 1px solid rgba(0,0,0,0.1);
}
.speech-bubble {
  position: relative;
  background: #fcfcfc;
  border: 3px solid var(--ink-secondary);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  padding: 22px 28px;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.15);
  font-family: var(--font-hand);
  font-size: 1.15em;
  line-height: 1.8;
  color: var(--ink-primary);
  word-break: break-word;
  margin-top: 20px;
}
.footer {
  margin-top: 50px;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: space-between;
  gap: 20px;
  padding: 35px 25px;
  background: rgba(0,0,0,0.02);
  border-radius: 15px;
  border: 2px dashed #eee;
}
.footer-card {
  background-color: #fff;
  border: 2px solid var(--ink-primary);
  padding: 15px;
  position: relative;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.08);
  font-family: var(--font-hand);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
  text-align: center;
}
.footer-card .card-tape {
  position: absolute;
  top: -10px; left: 50%;
  transform: translateX(-50%);
  width: 60px; height: 20px;
  background: rgba(149,117,205,0.4);
  z-index: 2;
}
.footer-card.stats-card { background-color: #f5f0ff; transform: rotate(-0.5deg); border-color: #9575cd; }
.footer-card.info-card { background-color: #fffdf0; transform: rotate(-1deg); border-color: #ffb74d; }
.footer-card.info-card .card-tape { background: rgba(255,183,77,0.4); }
.footer-card-title { font-weight: bold; font-size: 1.15rem; color: var(--ink-primary); }
.footer-card-content { font-size: 0.95rem; color: #666; line-height: 1.4; }
.empty { color: #aaa; font-style: italic; padding: 8px 0; font-family: var(--font-hand); }
`

const ROTATIONS = ['-1deg', '1.5deg', '-0.5deg', '1deg', '-1.5deg', '0.5deg']

function buildTopicsHtml(topics) {
  if (!topics || !topics.length) {
    return '<div class="topic-section"><div class="section-title">今日话题 Topics</div><div class="empty">暂无话题总结</div></div>'
  }
  const items = topics.map((t, i) => {
    const contributors = (t.contributors || []).join(' · ') || '群友'
    return `
    <div class="topic-item">
      <div class="check-box"><div class="check-tick"></div></div>
      <div class="topic-content">
        <div>
          <span class="topic-title">${escapeHtml(t.topic)}</span>
          <span class="topic-index">#${String(i + 1).padStart(2, '0')}</span>
        </div>
        <div class="topic-contributors">🙋‍♀️ 参与者：${escapeHtml(contributors)}</div>
        <div class="topic-detail">${escapeHtml(t.detail)}</div>
      </div>
    </div>`
  }).join('')
  return `
  <div class="topic-section">
    <div class="paper-holes">${Array(8).fill('<div class="hole"></div>').join('')}</div>
    <div class="section-title">今日话题 Topics</div>
    ${items}
  </div>`
}

function buildTitlesHtml(titles) {
  if (!titles || !titles.length) {
    return '<div class="user-section"><div class="section-title">群友画像 Portraits</div><div class="empty">暂无用户画像</div></div>'
  }
  const cards = titles.map(t => {
    const mbtiBadge = t.mbti
      ? '<div class="badge mbti">' + escapeHtml(t.mbti) + '</div>'
      : ''
    return `
    <div class="user-card">
      <div class="card-tape"></div>
      <div class="user-header">
        <img class="u-avatar" src="${getAvatarUrl(t.uid)}" alt="" onerror="this.style.visibility='hidden'">
        <div class="u-info">
          <div class="u-name">${escapeHtml(t.name)}</div>
          <div class="badges">
            <div class="badge title">${escapeHtml(t.title)}</div>
            ${mbtiBadge}
          </div>
        </div>
      </div>
      <div class="u-reason">${escapeHtml(t.reason)}</div>
    </div>`
  }).join('')
  return `
  <div class="user-section">
    <div class="section-title">群友画像 Portraits</div>
    <div class="masonry-grid">${cards}</div>
  </div>`
}

function buildQuotesHtml(quotes) {
  if (!quotes || !quotes.length) {
    return '<div class="quotes-section"><div class="section-title">群贤毕至 Bible Quotes</div><div class="empty">今日暂无金句</div></div>'
  }
  const items = quotes.map(q => {
    const uid = q.uid || ''
    const avatar = uid ? getAvatarUrl(uid) : ''
    const avatarHtml = avatar
      ? '<img class="q-avatar" src="' + avatar + '" alt="" onerror="this.style.visibility=\'hidden\'">'
      : '<div class="q-avatar"></div>'
    return `
    <div class="quote-wrapper">
      <div class="q-flex-container">
        <div class="q-user-col">${avatarHtml}</div>
        <div class="q-content-col">
          <div class="q-sender-name">${escapeHtml(q.sender)}</div>
          <div class="q-bubble">
            <div class="q-content">"${escapeHtml(q.content)}"</div>
          </div>
          <div class="q-analysis-note">
            <div class="note-label">🤣👉 AI 锐评：</div>
            ${escapeHtml(q.reason)}
          </div>
        </div>
      </div>
    </div>`
  }).join('')
  return `
  <div class="quotes-section">
    <div class="section-title">群贤毕至 Bible Quotes</div>
    ${items}
  </div>`
}

function buildQualityReviewHtml(qualityReview) {
  if (!qualityReview) return ''
  const dims = (qualityReview.dimensions || []).filter(d => d.percentage > 0)
  if (!dims.length && !qualityReview.summary) return ''

  const barSegments = dims.map(d => {
    const color = d.color || '#607d8b'
    return '<div class="dimension-segment" style="width:' + d.percentage + '%;background:' + color + '">' +
      (d.percentage >= 8 ? '<div class="segment-label">' + escapeHtml(d.name) + '</div>' : '') +
      '</div>'
  }).join('')

  const stickers = dims.map((d, i) => {
    const color = d.color || '#607d8b'
    const rot = ROTATIONS[i % ROTATIONS.length]
    return `
    <div class="dim-sticker" style="border-color:${color};transform:rotate(${rot})">
      <div class="small-tape"></div>
      <div class="dim-sticker-title" style="border-color:${color};color:${color}">${escapeHtml(d.name)} ${d.percentage}%</div>
      <div>${escapeHtml(d.comment)}</div>
    </div>`
  }).join('')

  const summary = qualityReview.summary
    ? '<div class="speech-bubble">' + escapeHtml(qualityReview.summary) + '</div>'
    : ''

  return `
  <div class="quality-section">
    <div class="section-title">群聊质量锐评</div>
    <div class="quality-item">
      <div class="quality-header">
        <div class="theme-title-badge">${escapeHtml(qualityReview.title || '聊天质量锐评')}</div>
        <div class="time-range">${escapeHtml(qualityReview.subtitle || '')}</div>
      </div>
      ${barSegments ? '<div class="dimension-bar-container"><div class="dimension-bar">' + barSegments + '</div></div>' : ''}
      ${stickers ? '<div class="dimension-comments-grid">' + stickers + '</div>' : ''}
      ${summary}
    </div>
  </div>`
}

function buildFooterHtml(generatedAt, tokenUsage) {
  const usage = tokenUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  return `
  <div class="footer">
    <div class="footer-card info-card">
      <div class="card-tape"></div>
      <div class="footer-card-title">百百机器人</div>
      <div class="footer-card-content">
        <div>群聊日报分析</div>
        <div>${escapeHtml(generatedAt)}</div>
      </div>
    </div>
    <div class="footer-card stats-card">
      <div class="card-tape"></div>
      <div class="footer-card-title">LLM Token 消耗</div>
      <div class="footer-card-content">
        <div>Total: ${usage.total_tokens || 0} Tokens</div>
        <div>Prompt/Compl: ${usage.prompt_tokens || 0}/${usage.completion_tokens || 0}</div>
      </div>
    </div>
  </div>`
}

function generateHtml(reportData) {
  const {
    groupName,
    reportDate,
    dateRangeText,
    generatedAt,
    stats,
    topics,
    titles,
    quotes,
    qualityReview,
    tokenUsage
  } = reportData

  const headerTitle = escapeHtml(groupName) + ' 群聊日报'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(groupName)} 群聊日报</title>
<style>${SCRAPBOOK_CSS}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="title-sticker">
      <div class="tape-header"></div>
      <h1>${headerTitle}</h1>
      <div class="date-badge">${escapeHtml(reportDate || '')}</div>
    </div>
    <div style="margin-top:20px;font-family:var(--font-hand);color:var(--ink-secondary);font-size:1rem;">${escapeHtml(dateRangeText)}</div>
  </div>

  <div class="stats-wrapper">
    <div class="stats-grid">
      <div class="stamp"><div class="stamp-num">${stats.messageCount}</div><div class="stamp-label">消息总数</div></div>
      <div class="stamp"><div class="stamp-num">${stats.participantCount}</div><div class="stamp-label">参与人数</div></div>
      <div class="stamp"><div class="stamp-num">${stats.emojiCount}</div><div class="stamp-label">表情统计</div></div>
      <div class="stamp"><div class="stamp-num">${stats.totalCharacters}</div><div class="stamp-label">总字符数</div></div>
    </div>
    <div class="highlight-section">
      <div class="tape-top"></div>
      <div class="time-desc">✨ Highlight Time</div>
      <div class="time-big">${escapeHtml(stats.mostActivePeriod)}</div>
      <div class="time-desc">（此刻，世界色彩斑斓）</div>
    </div>
  </div>

  <div class="grid-layout">
    <div class="chart-section">
      <div class="coil"></div>
      <div class="section-title">24H 活跃轨迹</div>
      ${stats.hourlyChartHtml || ''}
    </div>

    ${buildTopicsHtml(topics)}
    ${buildTitlesHtml(titles)}
    ${buildQuotesHtml(quotes)}
    ${buildQualityReviewHtml(qualityReview)}
  </div>

  ${buildFooterHtml(generatedAt, tokenUsage)}
</div>
</body>
</html>`
}

async function renderReportImage(reportData, outputPath) {
  const html = generateHtml(reportData)
  const nodeHtmlToImage = require('node-html-to-image')
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  await nodeHtmlToImage({
    output: outputPath,
    html,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  })

  const htmlPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.html')
  fs.writeFileSync(htmlPath, html, 'utf-8')
  return outputPath
}

module.exports = {
  escapeHtml,
  getAvatarUrl,
  generateHtml,
  renderReportImage
}
