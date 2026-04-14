/**
 * 读取 totems.json / potions.json，按期望收益贪心生成强化路径，并输出精美 SVG（默认可用）。
 * 手动「若成功则…若失败则…」分支规划见 renderManualPath.js（如罗希内：manual_path_roshinet_branching.svg）。
 * 若本机 canvas 原生模块可用，会额外尝试生成同名 PNG。
 * 用法: node planTotemEnhance.js [totemId]
 * totemId 须为 totems.json 中已录入的模型：lowen_advanced | roshinet_advanced | romantic_farm_daisy_advanced
 * 例: node planTotemEnhance.js lowen_advanced
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const totems = JSON.parse(fs.readFileSync(path.join(DIR, 'totems.json'), 'utf8'));
const potionsData = JSON.parse(fs.readFileSync(path.join(DIR, 'potions.json'), 'utf8'));

function getSuccessRate(statKey, tierId) {
  if (tierId === 'normal') return 1;
  const cat = potionsData.statToRateCategory[statKey];
  const table = potionsData.successRateByStatCategory[cat];
  const fallback = potionsData.successRateByStatCategory.default_other;
  if (!table) {
    return tierId === 'advanced' ? fallback.advanced : fallback.intermediate;
  }
  if (tierId === 'advanced') {
    if (table.advanced != null) return table.advanced;
    return fallback.advanced;
  }
  if (table.intermediate != null) return table.intermediate;
  return fallback.intermediate;
}

function discreteUniformExpectedMinGain(minG, maxG, room) {
  const n = maxG - minG + 1;
  let sum = 0;
  for (let g = minG; g <= maxG; g++) {
    sum += Math.min(g, room);
  }
  return sum / n;
}

function expectedGainForAction(statKey, tierId, room, usedCount) {
  const tiers = potionsData.tiers;
  if (room <= 0) return -1;
  if (tierId === 'normal') {
    if (usedCount < tiers.normal.minPriorEnhancements) return -1;
    return Math.min(tiers.normal.gainOnSuccess.max, room);
  }
  if (tierId === 'advanced') {
    if (usedCount < tiers.advanced.minPriorEnhancements) return -1;
    const p = getSuccessRate(statKey, 'advanced');
    const { min, max } = tiers.advanced.gainOnSuccess;
    return p * discreteUniformExpectedMinGain(min, max, room);
  }
  if (tierId === 'intermediate') {
    if (usedCount < tiers.intermediate.minPriorEnhancements) return -1;
    const p = getSuccessRate(statKey, 'intermediate');
    const { min, max } = tiers.intermediate.gainOnSuccess;
    return p * discreteUniformExpectedMinGain(min, max, room);
  }
  return -1;
}

function potionDisplayName(statKey, tierId) {
  const row = potionsData.potionsByStat.find((r) => r.statKey === statKey);
  if (!row) return `${statKey}(${tierId})`;
  const p = row.potions.find((x) => x.tier === tierId);
  return p ? p.displayName : `${row.statName}${potionsData.tiers[tierId].nameSuffix}`;
}

function planGreedy(totem) {
  const caps = {};
  for (const s of totem.stats) caps[s.key] = s.maxPoints;
  const curF = {};
  for (const s of totem.stats) curF[s.key] = 0;
  const maxN = totem.maxEnhancements;
  const steps = [];
  let used = 0;

  while (used < maxN) {
    let best = null;
    for (const s of totem.stats) {
      const room = caps[s.key] - Math.floor(curF[s.key]);
      if (room <= 0) continue;
      for (const tierId of ['intermediate', 'advanced', 'normal']) {
        const ev = expectedGainForAction(s.key, tierId, room, used);
        if (ev < 0) continue;
        const score = ev;
        const tiePrefer = tierId === 'normal' ? 2 : tierId === 'advanced' ? 1 : 0;
        if (
          !best ||
          score > best.score ||
          (Math.abs(score - best.score) < 1e-9 && tiePrefer > best.tiePrefer)
        ) {
          best = {
            score,
            tiePrefer,
            statKey: s.key,
            statName: s.name,
            tierId,
            room,
            p: tierId === 'normal' ? 1 : getSuccessRate(s.key, tierId),
          };
        }
      }
    }
    if (!best) break;

    const tier = potionsData.tiers[best.tierId];
    let projectedDelta;
    if (best.tierId === 'normal') {
      projectedDelta = 1;
    } else {
      const { min, max } = tier.gainOnSuccess;
      let acc = 0;
      for (let g = min; g <= max; g++) acc += Math.min(g, best.room);
      projectedDelta = best.p * (acc / (max - min + 1));
    }

    steps.push({
      index: used + 1,
      statKey: best.statKey,
      statName: best.statName,
      tierId: best.tierId,
      potionName: potionDisplayName(best.statKey, best.tierId),
      successProb: best.p,
      expectedGain: best.score,
      projectedDelta,
      roomBefore: best.room,
    });

    curF[best.statKey] += best.score;
    used += 1;
  }

  const cur = {};
  for (const s of totem.stats) cur[s.key] = Math.floor(curF[s.key]);
  return { cur, curF, caps, steps };
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function phaseLabel(index) {
  if (index <= 5) return '普通期';
  if (index <= 8) return '进阶可选期';
  return '中级可选期';
}

function renderSvg(totem, plan) {
  const W = 1200;
  const pad = 56;
  const rowH = 48;
  const headerH = 210;
  const footerH = 110;
  const n = plan.steps.length;
  const H = Math.min(3600, headerH + n * rowH + footerH + pad * 2);

  const colX = [40, 108, 248, 518, 798, 988];
  const rows = plan.steps
    .map((s, idx) => {
      const phase = phaseLabel(s.index);
      const pct = s.tierId === 'normal' ? '100%' : `${(s.successProb * 100).toFixed(0)}%`;
      const fill = idx % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)';
      const y = headerH + pad + idx * rowH;
      return `
  <g transform="translate(${pad},0)">
    <rect x="8" y="${y - 32}" width="${W - pad * 2 - 16}" height="${rowH - 4}" rx="8" fill="${fill}" stroke="rgba(212,175,55,0.08)"/>
    <text x="${colX[0]}" y="${y}" fill="#c8d4e0" font-size="15" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${s.index}</text>
    <text x="${colX[1]}" y="${y}" fill="#7eb8e8" font-size="14" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${esc(phase)}</text>
    <text x="${colX[2]}" y="${y}" fill="#e8dcc4" font-size="15" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${esc(s.statName)}</text>
    <text x="${colX[3]}" y="${y}" fill="#f2ead8" font-size="14" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${esc(s.potionName)}</text>
    <text x="${colX[4]}" y="${y}" fill="#9ec5f0" font-size="14" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${esc(pct)}</text>
    <text x="${colX[5]}" y="${y}" fill="#7ecf8a" font-size="14" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${s.expectedGain.toFixed(3)}</text>
  </g>`;
    })
    .join('');

  const summary = totem.stats.map((st) => `${st.name} ${plan.cur[st.key]}/${st.maxPoints}`).join('  ·  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e14"/>
      <stop offset="45%" stop-color="#152028"/>
      <stop offset="100%" stop-color="#0c1620"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#c9a227"/>
      <stop offset="50%" stop-color="#f4e4bc"/>
      <stop offset="100%" stop-color="#a67c00"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e8dcc4"/>
      <stop offset="100%" stop-color="#d4af37"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0L0 48" stroke="rgba(212,175,55,0.06)" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="22" fill="rgba(18,26,36,0.88)" stroke="url(#gold)" stroke-width="2" filter="url(#glow)"/>
  <polyline points="52,96 52,58 110,58" fill="none" stroke="rgba(212,175,55,0.5)" stroke-width="1.3" stroke-linecap="round"/>
  <polyline points="${W - 52},96 ${W - 52},58 ${W - 110},58" fill="none" stroke="rgba(212,175,55,0.5)" stroke-width="1.3" stroke-linecap="round"/>
  <polyline points="52,${H - 96} 52,${H - 58} 110,${H - 58}" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1.2" stroke-linecap="round"/>
  <polyline points="${W - 52},${H - 96} ${W - 52},${H - 58} ${W - 110},${H - 58}" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1.2" stroke-linecap="round"/>
  <text x="${pad + 24}" y="${pad + 42}" fill="url(#titleGrad)" font-size="32" font-weight="700" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">图腾强化路径（期望贪心）</text>
  <text x="${pad + 24}" y="${pad + 78}" fill="#d4af37" font-size="17" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">${esc(totem.name)}</text>
  <text x="${pad + 24}" y="${pad + 108}" fill="#8fa3b8" font-size="14" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">最大强化 ${totem.maxEnhancements} 次 · 失败仍消耗次数 · 进阶≥5 次后 · 中级≥8 次后</text>
  <line x1="${pad + 20}" y1="${pad + 128}" x2="${W - pad - 20}" y2="${pad + 128}" stroke="rgba(212,175,55,0.35)" stroke-width="1"/>
  <g transform="translate(${pad},0)" font-weight="600">
    <text x="${colX[0]}" y="${headerH - 8}" fill="#6b7d8f" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">#</text>
    <text x="${colX[1]}" y="${headerH - 8}" fill="#6b7d8f" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">阶段</text>
    <text x="${colX[2]}" y="${headerH - 8}" fill="#6b7d8f" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">能力</text>
    <text x="${colX[3]}" y="${headerH - 8}" fill="#6b7d8f" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">推荐药水</text>
    <text x="${colX[4]}" y="${headerH - 8}" fill="#6b7d8f" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">成功率</text>
    <text x="${colX[5]}" y="${headerH - 8}" fill="#6b7d8f" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">期望增益</text>
  </g>
  ${rows}
  <text x="${pad + 24}" y="${H - pad - 48}" fill="#7a8fa3" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">说明：每步在未满上限的属性中选「期望实际点数（含上限截断）」最高的药水；得分相同时优先普通药水以降低方差。</text>
  <text x="${pad + 24}" y="${H - pad - 22}" fill="#7a8fa3" font-size="13" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif">均值近似终点：${esc(summary)}</text>
</svg>`;
}

function tryRenderPng(totem, plan, outPath) {
  let createCanvas;
  try {
    createCanvas = require('canvas').createCanvas;
  } catch (e) {
    return false;
  }
  try {
    const W = 1200;
    const pad = 56;
    const rowH = 46;
    const headerH = 210;
    const footerH = 110;
    const n = plan.steps.length;
    const H = Math.min(3600, headerH + n * rowH + footerH + pad * 2);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const img = new (require('canvas').Image)();
    const svg = renderSvg(totem, plan);
    img.src = Buffer.from(svg);
    ctx.drawImage(img, 0, 0);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    return true;
  } catch (e) {
    return false;
  }
}

function main() {
  const id = process.argv[2] || 'lowen_advanced';
  const totem = totems.totems.find((t) => t.id === id);
  if (!totem) {
    console.error('未知 totemId:', id);
    console.error('可选:', totems.totems.map((t) => t.id).join(', '));
    process.exit(1);
  }
  const plan = planGreedy(totem);
  const base = path.join(DIR, `totem_path_${id}`);
  const svgPath = `${base}.svg`;
  fs.writeFileSync(svgPath, renderSvg(totem, plan), 'utf8');
  console.log('已生成 SVG:', svgPath);
  const pngPath = `${base}.png`;
  if (tryRenderPng(totem, plan, pngPath)) {
    console.log('已生成 PNG:', pngPath);
  } else {
    console.log('未生成 PNG（canvas 不可用或 SVG 转图失败），请用浏览器打开 SVG 或导出为图片。');
  }
  console.log('步数:', plan.steps.length);
}

main();
