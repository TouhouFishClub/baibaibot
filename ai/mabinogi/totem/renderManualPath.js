/**
 * 生成三个图腾模型的「手动分支规划」流程图 SVG。
 * 用法: node renderManualPath.js
 * 产物: manual_path_lowen_advanced.svg / manual_path_roshinet_advanced.svg / manual_path_romantic_farm_daisy_advanced.svg
 */
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const F = 'Microsoft YaHei,PingFang SC,SimHei,sans-serif';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgOpen(w, h) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0,0 10,3.5 0,7" fill="#999"/></marker>
  <filter id="sh"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.08"/></filter>
</defs>
<rect width="100%" height="100%" fill="#faf6ed"/>`;
}

function pill(cx, cy, w, h, text) {
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fef3cd" stroke="#d4a827" stroke-width="1.5" filter="url(#sh)"/>
<text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#8b6914" font-size="15" font-weight="600" font-family="${F}">${esc(text)}</text>`;
}

function box(cx, cy, w, h, lines) {
  const lh = 17;
  const sy = cy - ((lines.length - 1) * lh) / 2 + 5;
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="8" fill="#d4e6f1" stroke="#5b9bd5" stroke-width="1.5" filter="url(#sh)"/>
${lines.map((l, i) => `<text x="${cx}" y="${sy + i * lh}" text-anchor="middle" fill="#333" font-size="13" font-family="${F}">${esc(l)}</text>`).join('\n')}`;
}

function dia(cx, cy, w, h, lines) {
  const lh = 15;
  const sy = cy - ((lines.length - 1) * lh) / 2 + 4;
  return `<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="#fce4e4" stroke="#cc6666" stroke-width="1.5" filter="url(#sh)"/>
${lines.map((l, i) => `<text x="${cx}" y="${sy + i * lh}" text-anchor="middle" fill="#b33" font-size="12" font-weight="600" font-family="${F}">${esc(l)}</text>`).join('\n')}`;
}

function arr(pts) {
  return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#999" stroke-width="1.5" marker-end="url(#ah)"/>`;
}

function lbl(x, y, text, color, anchor, size) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor || 'start'}" fill="${color || '#c33'}" font-size="${size || 12}" font-weight="600" font-family="${F}">${esc(text)}</text>`;
}

function card(x, y, w, name, fixed, stats) {
  const lh = 18;
  const h = 58 + 24 + stats.length * lh + 16;
  const t = [];
  t.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#f5efe0" stroke="#c9a84c" stroke-width="1.5" filter="url(#sh)"/>`);
  let yy = y + 22;
  t.push(`<text x="${x + w / 2}" y="${yy}" text-anchor="middle" fill="#8b6914" font-size="14" font-weight="700" font-family="${F}">${esc(name)}</text>`);
  yy += 22;
  t.push(`<text x="${x + 10}" y="${yy}" fill="#666" font-size="11" font-weight="600" font-family="${F}">固定能力值：</text>`);
  yy += 16;
  t.push(`<text x="${x + 14}" y="${yy}" fill="#333" font-size="12" font-family="${F}">${esc(fixed)}</text>`);
  yy += 20;
  t.push(`<text x="${x + 10}" y="${yy}" fill="#666" font-size="11" font-weight="600" font-family="${F}">强化能力值：</text>`);
  for (const s of stats) {
    yy += lh;
    t.push(`<text x="${x + 14}" y="${yy}" fill="#333" font-size="12" font-family="${F}">${esc(s)}</text>`);
  }
  return t.join('\n');
}

function pctNote(cx, cy, h, text) {
  return lbl(cx + 4, cy - h / 2 - 4, text, '#888', 'start', 10);
}

// ────────────────────────────────────────────────
// 萝温高级模型: 魔攻 > 额外伤害 > 移速
// ────────────────────────────────────────────────
function genLowen() {
  const W = 960, H = 1160;
  const s = [svgOpen(W, H)];
  const p = (v) => { s.push(v); };

  p(card(10, 165, 210, '萝温高级模型', '魔法值+15', ['智力(0/7)', '意志(0/7)', '魔法攻击力(0/4)', '额外伤害(0/1)', '移动速度(0/1)']));

  // Row Y
  const Y = { start: 35, s15: 105, s6: 192, d1: 292, s7: 410, d2: 505, gu: 395, lfill: 630, rfill: 548, ls9: 720, rs9: 648, d3: 825, s10: 948, end: 1065 };
  const CX = { main: 530, left: 310, right: 730, gu: 810 };
  const BW = 345, BH = 44, BH2 = 54, DW = 270, DH = 78;

  // Start
  p(pill(CX.main, Y.start, 80, 36, '开始'));
  p(arr([[CX.main, Y.start + 18], [CX.main, Y.s15 - 22]]));

  // Step 1-5
  p(box(CX.main, Y.s15, BW, BH, ['使用智力/意志普通药水强化至5次']));
  p(arr([[CX.main, Y.s15 + 22], [CX.main, Y.s6 - 22]]));

  // Step 6
  p(box(CX.main, Y.s6, BW, BH, ['使用魔法攻击力进阶药水强化第6次']));
  p(pctNote(CX.main + BW / 2 - 120, Y.s6, BH, '成功率 40%'));
  p(arr([[CX.main, Y.s6 + 22], [CX.main, Y.d1 - 39]]));

  // D1
  p(dia(CX.main, Y.d1, DW, DH, ['是否成功并且为魔攻2']));
  // D1 是 → S7
  const d1b = Y.d1 + 39;
  p(arr([[CX.main, d1b], [CX.main, d1b + 14], [400, d1b + 14], [400, Y.s7 - 22]]));
  p(lbl(CX.main - 80, d1b + 12, '是 20%'));
  // D1 否 → GiveUp top
  p(arr([[CX.main + 135, Y.d1], [CX.gu, Y.d1], [CX.gu, Y.gu - 39]]));
  p(lbl(CX.main + 140, Y.d1 - 8, '否 80%'));

  // Step 7
  p(box(400, Y.s7, BW, BH, ['使用魔法攻击力进阶药水强化第7次']));
  p(pctNote(400 + BW / 2 - 120, Y.s7, BH, '成功率 40%'));
  p(arr([[400, Y.s7 + 22], [400, Y.d2 - 39]]));

  // D2
  p(dia(400, Y.d2, DW, DH, ['是否成功并且为魔攻2']));
  // D2 是 → LeftFill
  const d2b = Y.d2 + 39;
  p(arr([[400, d2b], [400, d2b + 14], [CX.left, d2b + 14], [CX.left, Y.lfill - 27]]));
  p(lbl(400 - 85, d2b + 12, '是 20%'));
  // D2 否 → GiveUp left
  p(arr([[400 + 135, Y.d2], [CX.gu - 130, Y.d2], [CX.gu - 130, Y.gu]]));
  p(lbl(400 + 140, Y.d2 - 8, '否 80%'));

  // GiveUp
  p(dia(CX.gu, Y.gu, 260, DH, ['是否放弃', '（可能会浪费基础药水）']));
  // 是 → exit
  p(arr([[CX.gu + 130, Y.gu], [CX.gu + 155, Y.gu]]));
  p(lbl(CX.gu + 120, Y.gu - 10, '是'));
  // 否 → RightFill
  p(arr([[CX.gu, Y.gu + 39], [CX.gu, Y.gu + 56], [CX.right, Y.gu + 56], [CX.right, Y.rfill - 27]]));
  p(lbl(CX.gu + 5, Y.gu + 54, '否'));

  // Left Fill-8
  p(box(CX.left, Y.lfill, 330, BH2, ['使用智力/意志普通药水或者进阶', '药水强化到第8次']));
  p(arr([[CX.left, Y.lfill + 27], [CX.left, Y.ls9 - 22]]));

  // Right Fill-8
  p(box(CX.right, Y.rfill, 330, BH2, ['使用智力/意志/魔攻普通药水或者', '进阶药水强化到第8次']));
  p(arr([[CX.right, Y.rfill + 27], [CX.right, Y.rs9 - 22]]));

  // Left Step 9: 魔攻中级
  p(box(CX.left, Y.ls9, 335, BH, ['使用魔法攻击力中级药水强化第9次']));
  p(pctNote(CX.left + 168 - 120, Y.ls9, BH, '成功率 25%'));
  p(arr([[CX.left, Y.ls9 + 22], [CX.left, Y.d3 - 39]]));

  // Right Step 9: 额外伤害中级
  p(box(CX.right, Y.rs9, 330, BH, ['使用额外伤害中级药水强化第9次']));
  p(pctNote(CX.right + 165 - 120, Y.rs9, BH, '成功率 10%'));

  // D3
  p(dia(CX.left, Y.d3, DW, DH, ['是否成功并且为魔攻3']));
  // D3 是 → S10B (魔攻中级 step10)
  const s10bCx = 430;
  p(arr([[CX.left, Y.d3 + 39], [CX.left, Y.d3 + 58], [s10bCx, Y.d3 + 58], [s10bCx, Y.s10 - 22]]));
  p(lbl(CX.left + 10, Y.d3 + 56, '是 8.3%'));
  // D3 否 → S10A (额外伤害中级 step10)
  const s10aCx = 130;
  p(arr([[CX.left - 135, Y.d3], [s10aCx, Y.d3], [s10aCx, Y.s10 - 22]]));
  p(lbl(CX.left - 132, Y.d3 - 10, '否 91.7%', '#c33', 'end'));

  // Right Step 9 → S10C (移速中级 step10)
  p(arr([[CX.right, Y.rs9 + 22], [CX.right, Y.s10 - 22]]));

  // S10 boxes
  p(box(s10aCx, Y.s10, 250, BH, ['使用额外伤害中级药水强化第10次']));
  p(pctNote(s10aCx + 125 - 120, Y.s10, BH, '成功率 10%'));
  p(box(s10bCx, Y.s10, 300, BH, ['使用魔法攻击力中级药水强化第10次']));
  p(pctNote(s10bCx + 150 - 120, Y.s10, BH, '成功率 25%'));
  p(box(CX.right, Y.s10, 300, BH, ['使用移动速度中级药水强化第10次']));
  p(pctNote(CX.right + 150 - 120, Y.s10, BH, '成功率 10%'));

  // All → End
  p(arr([[s10aCx, Y.s10 + 22], [s10aCx, Y.end], [430, Y.end]]));
  p(arr([[s10bCx, Y.s10 + 22], [s10bCx, Y.end]]));
  p(arr([[CX.right, Y.s10 + 22], [CX.right, Y.end], [430, Y.end]]));
  p(pill(430, Y.end, 80, 36, '结束'));

  s.push('</svg>');
  return s.join('\n');
}

// ────────────────────────────────────────────────
// 罗希内高级模型: 大伤 > 暴击 > 移速
// ────────────────────────────────────────────────
function genRoshinet() {
  const W = 960, H = 1280;
  const s = [svgOpen(W, H)];
  const p = (v) => { s.push(v); };

  p(card(730, 170, 215, '罗希内高级模型', '体力值+15', ['力量(0/7)', '敏捷(0/7)', '最大伤害(0/4)', '暴击伤害(0/2)', '移动速度(0/1)']));

  const Y = { start: 35, s15: 105, s6: 192, d1: 292, s7: 410, d2: 505, gu: 395, lfill: 630, rfill: 548, ls9: 720, rs9: 648, d3: 830, d4: 760, s10: 960, end: 1080 };
  const CX = { main: 370, left: 210, right: 560, gu: 660 };
  const BW = 320, BH = 44, BH2 = 54, DW = 260, DH = 78;

  // Start
  p(pill(CX.main, Y.start, 80, 36, '开始'));
  p(arr([[CX.main, Y.start + 18], [CX.main, Y.s15 - 22]]));

  // Step 1-5
  p(box(CX.main, Y.s15, BW, BH, ['使用力量/敏捷普通药水强化至5次']));
  p(arr([[CX.main, Y.s15 + 22], [CX.main, Y.s6 - 22]]));

  // Step 6
  p(box(CX.main, Y.s6, BW, BH, ['使用最大伤害进阶药水强化第6次']));
  p(pctNote(CX.main + BW / 2 - 120, Y.s6, BH, '成功率 40%'));
  p(arr([[CX.main, Y.s6 + 22], [CX.main, Y.d1 - 39]]));

  // D1
  p(dia(CX.main, Y.d1, DW, DH, ['是否成功并且为大伤2']));
  const d1b = Y.d1 + 39;
  p(arr([[CX.main, d1b], [CX.main, d1b + 14], [280, d1b + 14], [280, Y.s7 - 22]]));
  p(lbl(CX.main - 75, d1b + 12, '是 20%'));
  p(arr([[CX.main + 130, Y.d1], [CX.gu, Y.d1], [CX.gu, Y.gu - 39]]));
  p(lbl(CX.main + 135, Y.d1 - 8, '否 80%'));

  // Step 7
  p(box(280, Y.s7, BW, BH, ['使用最大伤害进阶药水强化第7次']));
  p(pctNote(280 + BW / 2 - 120, Y.s7, BH, '成功率 40%'));
  p(arr([[280, Y.s7 + 22], [280, Y.d2 - 39]]));

  // D2
  p(dia(280, Y.d2, DW, DH, ['是否成功并且为大伤2']));
  const d2b = Y.d2 + 39;
  p(arr([[280, d2b], [280, d2b + 14], [CX.left, d2b + 14], [CX.left, Y.lfill - 27]]));
  p(lbl(280 - 80, d2b + 12, '是 20%'));
  p(arr([[280 + 130, Y.d2], [CX.gu - 130, Y.d2], [CX.gu - 130, Y.gu]]));
  p(lbl(280 + 135, Y.d2 - 8, '否 80%'));

  // GiveUp
  p(dia(CX.gu, Y.gu, 240, DH, ['是否放弃', '（可能会浪费基础药水）']));
  p(arr([[CX.gu + 120, Y.gu], [CX.gu + 142, Y.gu]]));
  p(lbl(CX.gu + 108, Y.gu - 10, '是'));
  p(arr([[CX.gu, Y.gu + 39], [CX.gu, Y.gu + 56], [CX.right, Y.gu + 56], [CX.right, Y.rfill - 27]]));
  p(lbl(CX.gu + 5, Y.gu + 54, '否'));

  // Left Fill-8
  p(box(CX.left, Y.lfill, 310, BH2, ['使用力量/敏捷普通药水或者进阶', '药水强化到第8次']));
  p(arr([[CX.left, Y.lfill + 27], [CX.left, Y.ls9 - 22]]));

  // Right Fill-8
  p(box(CX.right, Y.rfill, 310, BH2, ['使用力量/敏捷/大伤普通药水或者', '进阶药水强化到第8次']));
  p(arr([[CX.right, Y.rfill + 27], [CX.right, Y.rs9 - 22]]));

  // Left Step 9: 最大伤害中级
  p(box(CX.left, Y.ls9, 310, BH, ['使用最大伤害中级药水强化第9次']));
  p(pctNote(CX.left + 155 - 120, Y.ls9, BH, '成功率 25%'));
  p(arr([[CX.left, Y.ls9 + 22], [CX.left, Y.d3 - 39]]));

  // Right Step 9: 暴击伤害中级
  p(box(CX.right, Y.rs9, 310, BH, ['使用暴击伤害中级药水强化第9次']));
  p(pctNote(CX.right + 155 - 120, Y.rs9, BH, '成功率 15%'));
  p(arr([[CX.right, Y.rs9 + 22], [CX.right, Y.d4 - 39]]));

  // D3: 大伤
  p(dia(CX.left, Y.d3, DW, DH, ['是否成功并且为大伤3']));
  const s10aCx = 100;
  const s10bCx = 350;
  const s10cCx = 600;
  // D3 是 → S10A (大伤中级)
  p(arr([[CX.left, Y.d3 + 39], [CX.left, Y.d3 + 58], [s10aCx, Y.d3 + 58], [s10aCx, Y.s10 - 22]]));
  p(lbl(CX.left + 10, Y.d3 + 56, '是 8.3%'));
  // D3 否 → S10B (移速中级)
  p(arr([[CX.left + 130, Y.d3], [s10bCx, Y.d3], [s10bCx, Y.s10 - 22]]));
  p(lbl(CX.left + 135, Y.d3 - 10, '否 91.7%'));

  // D4: 暴击
  p(dia(CX.right, Y.d4, DW, DH, ['是否成功并且为暴伤3']));
  // D4 是 → S10C (暴击中级)
  p(arr([[CX.right, Y.d4 + 39], [CX.right, Y.d4 + 56], [s10cCx, Y.d4 + 56], [s10cCx, Y.s10 - 22]]));
  p(lbl(CX.right + 10, Y.d4 + 54, '是 5%'));
  // D4 否 → S10B (移速中级)
  p(arr([[CX.right - 130, Y.d4], [s10bCx + 20, Y.d4], [s10bCx + 20, Y.s10 - 22]]));
  p(lbl(CX.right - 128, Y.d4 - 10, '否 95%', '#c33', 'end'));

  // S10 boxes
  p(box(s10aCx, Y.s10, 190, BH, ['使用最大伤害中级药水', '强化第10次']));
  p(pctNote(s10aCx + 95 - 80, Y.s10, BH, '25%'));
  p(box(s10bCx, Y.s10, 240, BH, ['使用移动速度中级药水强化第10次']));
  p(pctNote(s10bCx + 120 - 80, Y.s10, BH, '10%'));
  p(box(s10cCx, Y.s10, 210, BH, ['使用暴击伤害中级药水', '强化第10次']));
  p(pctNote(s10cCx + 105 - 80, Y.s10, BH, '15%'));

  // All → End
  p(arr([[s10aCx, Y.s10 + 22], [s10aCx, Y.end], [350, Y.end]]));
  p(arr([[s10bCx, Y.s10 + 22], [350, Y.end]]));
  p(arr([[s10cCx, Y.s10 + 22], [s10cCx, Y.end], [350, Y.end]]));
  p(pill(350, Y.end, 80, 36, '结束'));

  s.push('</svg>');
  return s.join('\n');
}

// ────────────────────────────────────────────────
// 浪漫农场雏菊高级模型: 音乐 > 移速
// ────────────────────────────────────────────────
function genDaisy() {
  const W = 860, H = 740;
  const s = [svgOpen(W, H)];
  const p = (v) => { s.push(v); };

  p(card(15, 80, 250, '浪漫农场雏菊高级模型', '体力+10', ['敏捷(0/6)', '生命值(0/8)', '最大伤害(0/3)', '音乐技能增益效果(0/2)', '移动速度(0/1)']));

  const CX = 590;
  const BW = 330, BH = 44, BH2 = 64;

  // Start
  p(pill(CX, 35, 80, 36, '开始'));
  p(arr([[CX, 53], [CX, 75]]));

  // Step 1-5
  p(box(CX, 115, BW, BH2, ['使用敏捷/生命值普通药水强化至5次', '（尽量用生命值药水，因为敏捷药水', '罗西内也需要）']));
  p(arr([[CX, 115 + 32], [CX, 175]]));

  // Step 6: 音乐进阶
  p(box(CX, 200, BW, BH, ['使用音乐技能进阶药水强化第6次']));
  p(pctNote(CX + BW / 2 - 120, 200, BH, '成功率 25%'));
  p(arr([[CX, 222], [CX, 255]]));

  // Diamond
  const dY = 295;
  p(dia(CX, dY, 270, 78, ['是否成功并且为buff2']));
  // 是 → Step 7
  p(arr([[CX, dY + 39], [CX, 375]]));
  p(lbl(CX + 8, dY + 38, '是 12.5%'));
  // 否 → exit right → End
  p(arr([[CX + 135, dY], [CX + 175, dY]]));
  p(lbl(CX + 140, dY - 10, '否 87.5%'));
  p(pill(CX + 215, dY, 60, 30, '结束'));

  // Step 7: 音乐进阶
  p(box(CX, 400, BW, BH, ['使用音乐技能进阶药水强化第7次']));
  p(pctNote(CX + BW / 2 - 120, 400, BH, '成功率 25%'));
  p(arr([[CX, 422], [CX, 455]]));

  // Step 8: 移速进阶
  p(box(CX, 480, BW, BH, ['使用移动速度进阶药水强化第8次']));
  p(pctNote(CX + BW / 2 - 120, 480, BH, '成功率 15%'));
  p(arr([[CX, 502], [CX, 545]]));

  // End
  p(pill(CX, 565, 80, 36, '结束'));

  s.push('</svg>');
  return s.join('\n');
}

// ────────────────────────────────────────────────
function main() {
  const charts = [
    ['lowen_advanced', genLowen],
    ['roshinet_advanced', genRoshinet],
    ['romantic_farm_daisy_advanced', genDaisy],
  ];
  for (const [name, fn] of charts) {
    const out = path.join(DIR, `manual_path_${name}.svg`);
    fs.writeFileSync(out, fn(), 'utf8');
    console.log('已生成:', out);
  }
}

main();
