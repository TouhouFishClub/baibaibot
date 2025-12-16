/**
 * 图片报告生成器 - Node.js版本
 */

const fs = require('fs')
const path = require('path')
const config = require('./config')
const { formatNumber, truncateText, getAvatarUrl, getRandomComment } = require('./utils')

/**
 * 生成HTML报告模板
 * @param {Object} data 分析数据
 * @returns {string} HTML内容
 */
function generateHtmlTemplate(data) {
  const {
    chatName,
    messageCount,
    selectedWords,
    rankings,
    hourDistribution,
    peakHour
  } = data

  // 根据群名长度确定标题样式类
  let titleClass = 'short-title'
  if (chatName.length > 6 && chatName.length <= 15) titleClass = 'medium-title'
  else if (chatName.length > 15 && chatName.length <= 24) titleClass = 'long-title'
  else if (chatName.length > 24) titleClass = 'ultra-long-title'

  // 生成热词柱状图
  const barChartHtml = selectedWords.map((word, idx) => {
    const segmentsHtml = word.segments.map(seg => 
      `<div class="bar-segment" style="height: ${seg.percent}%; background-color: ${seg.color};"></div>`
    ).join('')

    const legendHtml = word.legend.map(item => 
      `<div class="bar-contributor-item ${!item.name ? 'empty' : ''}">
        <div class="bar-contributor-dot" style="background: ${item.color};"></div>
        <span class="bar-contributor-name">${item.name || ''}</span>
      </div>`
    ).join('')

    return `
      <div class="bar-item">
        <div class="bar-value">${word.freq}</div>
        <div class="bar-wrapper">
          <div class="bar" style="height: ${word.barHeight}%;">
            ${segmentsHtml}
          </div>
        </div>
        <div class="bar-label">${word.word}</div>
        <div class="bar-rank">#${idx + 1}</div>
        <div class="bar-contributors">
          ${legendHtml}
        </div>
      </div>
    `
  }).join('')

  // 生成热词卡片
  const wordCardsHtml = selectedWords.map((word, idx) => {
    const samplesHtml = (word.samples || []).slice(0, 3).map(sample => 
      `<li>${truncateText(sample, 40)}</li>`
    ).join('')

    return `
      <div class="word-card color-${idx + 1}">
        <div class="word-card-header">
          <div class="word-card-left">
            <div class="word-card-rank">#${idx + 1}</div>
            <div class="word-card-title">${word.word}</div>
          </div>
          <div class="word-card-freq">${word.freq}次</div>
        </div>
        ${word.aiComment ? `<div class="word-card-comment">${word.aiComment}</div>` : ''}
        <div class="word-card-contributors">
          ${word.contributorsText}
        </div>
        <ul class="word-card-samples">
          ${samplesHtml}
        </ul>
      </div>
    `
  }).join('')

  // 生成榜单卡片
  const rankingsHtml = rankings.map(ranking => {
    if (!ranking.first) return ''

    const othersHtml = ranking.others.map((item, idx) => `
      <div class="ranking-item">
        <div class="ranking-item-pos">${idx + 2}</div>
        <img class="ranking-item-avatar" src="${item.avatar}" alt="${item.name}" onerror="this.style.display='none'">
        <div class="ranking-item-name">${item.name}</div>
        <div class="ranking-item-value">${item.value}${ranking.unit}</div>
      </div>
    `).join('')

    return `
      <div class="ranking-card">
        <div class="ranking-card-header">
          ${ranking.icon} ${ranking.title}
        </div>
        <div class="ranking-first">
          <div class="ranking-first-crown">👑</div>
          <img class="ranking-first-avatar" src="${ranking.first.avatar}" alt="${ranking.first.name}" onerror="this.style.display='none'">
          <div class="ranking-first-name">${ranking.first.name}</div>
          <div class="ranking-first-value">${ranking.first.value}${ranking.unit}</div>
        </div>
        ${ranking.others.length > 0 ? `<div class="ranking-others">${othersHtml}</div>` : ''}
      </div>
    `
  }).join('')

  // 生成时段柱状图
  const hourBarsHtml = hourDistribution.map(hour => 
    `<div class="hour-bar" style="height: ${hour.height}%;"></div>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatName} - 年度报告</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --red: #C41E3A;
            --dark-red: #8B0000;
            --gold: #DAA520;
            --orange: #E85D04;
            --black: #1a1a1a;
            --dark: #252525;
            --cream: #F5F5DC;
            --white: #FFFFFF;
            --blue: #1D3557;
        }
        
        body {
            font-family: 'Noto Sans SC', -apple-system, sans-serif;
            background: var(--black);
            color: var(--cream);
            width: 450px;
            margin: 0 auto;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .report-container {
            width: 450px;
            background: var(--black);
            overflow: hidden;
            position: relative;
        }
        
        .stripe {
            height: 15px;
            background: repeating-linear-gradient(
                90deg,
                var(--red) 0px,
                var(--red) 25px,
                var(--gold) 25px,
                var(--gold) 30px,
                var(--red) 30px,
                var(--red) 55px,
                var(--black) 55px,
                var(--black) 60px
            );
        }
        
        .stripe-diagonal {
            height: 20px;
            background: repeating-linear-gradient(
                -45deg,
                var(--red) 0px,
                var(--red) 10px,
                var(--gold) 10px,
                var(--gold) 12px,
                var(--black) 12px,
                var(--black) 22px
            );
        }
        
        .stripe-thin {
            height: 4px;
            background: var(--gold);
        }
        
        .header {
            background: var(--red);
            padding: 30px 20px 60px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 150px;
            height: 150px;
            background: var(--gold);
            opacity: 0.1;
            border-radius: 50%;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            background: var(--black);
            clip-path: polygon(0 100%, 100% 100%, 100% 0, 50% 100%, 0 0);
        }
        
        .header-badge {
            display: inline-block;
            background: var(--gold);
            color: var(--black);
            padding: 8px 20px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 15px;
            position: relative;
        }
        
        .header-badge::before,
        .header-badge::after {
            content: '★';
            margin: 0 8px;
        }
        
        .header-star-group {
            font-size: 24px;
            color: var(--gold);
            margin-bottom: 10px;
            letter-spacing: 8px;
            text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
        }
        
        .header h1 {
            text-wrap: balance;
            -webkit-text-wrap: balance; 
            font-size: clamp(16px, 7.5vw, 38px);
            font-weight: 900;
            color: var(--white);
            letter-spacing: 1.5px;
            text-shadow: 3px 3px 0 var(--black), -1px -1px 0 var(--gold);
            word-break: break-word;  
            overflow-wrap: anywhere; 
            white-space: normal;
            display: inline-block;
            max-width: 100%;
            line-height: 1.35; 
            text-align: center;
            padding: 0 12px;
        }
        .header h1.short-title {
            font-size: clamp(20px, 9vw, 44px);
            letter-spacing: 3px; 
        }
        .header h1.medium-title {
            font-size: clamp(18px, 8vw, 38px);
        }
        .header h1.long-title {
            font-size: clamp(16px, 6vw, 32px);
            letter-spacing: 1px;
        }
        .header h1.ultra-long-title {
            font-size: clamp(14px, 5vw, 26px);
            letter-spacing: 0.5px;
            line-height: 1.4;
        }
        
        .header .subtitle {
            font-size: 20px;
            font-weight: 700;
            color: var(--gold);
            letter-spacing: 12px;
            text-shadow: 1px 1px 0 var(--black);
        }
        
        .header-stats {
            margin-top: 25px;
            display: flex;
            justify-content: center;
            gap: 30px;
        }
        
        .stat-box {
            background: rgba(0,0,0,0.3);
            padding: 10px 15px;
            border: 2px solid var(--gold);
            position: relative;
        }
        
        .stat-box::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border: 1px solid var(--gold);
            opacity: 0.5;
            transform: translate(3px, 3px);
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 900;
            color: var(--gold);
        }
        
        .stat-label {
            font-size: 10px;
            color: var(--cream);
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .section {
            padding: 30px 15px;
            position: relative;
        }
        
        .section-header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
        }
        
        .section-header::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--gold), transparent);
            z-index: 0;
        }
        
        .section-title {
            display: inline-block;
            background: var(--black);
            padding: 8px 25px;
            font-size: 18px;
            font-weight: 900;
            color: var(--gold);
            text-transform: uppercase;
            letter-spacing: 4px;
            position: relative;
            z-index: 1;
            border: 2px solid var(--gold);
        }
        
        .section-title::before,
        .section-title::after {
            content: '◆';
            color: var(--red);
            margin: 0 10px;
            font-size: 12px;
        }
        
        .chart-section {
            background: 
                linear-gradient(135deg, rgba(196,30,58,0.1) 0%, transparent 50%),
                linear-gradient(225deg, rgba(218,165,32,0.1) 0%, transparent 50%),
                var(--dark);
            border-top: 4px solid var(--red);
            border-bottom: 4px solid var(--red);
            padding: 30px 8px;
            position: relative;
        }
        
        .chart-section::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            width: 40px;
            height: 40px;
            border-left: 3px solid var(--gold);
            border-top: 3px solid var(--gold);
            opacity: 0.4;
        }
        
        .chart-section::after {
            content: '';
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-right: 3px solid var(--gold);
            border-bottom: 3px solid var(--gold);
            opacity: 0.4;
        }
        
        .bar-chart {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            height: 220px;
            padding: 0 5px;
            gap: 2px;
            margin-top: 15px;
        }
        
        .bar-item {
            width: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .bar-wrapper {
            width: 100%;
            height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
        }
        
        .bar {
            width: 30px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            overflow: hidden;
            border: 2px solid var(--gold);
            border-bottom: none;
            position: relative;
            box-shadow: 3px 0 0 rgba(0,0,0,0.3);
        }
        
        .bar::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--gold);
        }
        
        .bar-segment {
            width: 100%;
        }
        
        .bar-value {
            font-size: 10px;
            font-weight: 900;
            color: var(--gold);
            margin-bottom: 5px;
            text-shadow: 1px 1px 0 var(--black);
        }
        
        .bar-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--cream);
            margin-top: 8px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
            max-width: 40px;
        }
        
        .bar-rank {
            display: inline-block;
            background: var(--red);
            color: var(--gold);
            font-size: 9px;
            font-weight: 900;
            padding: 2px 6px;
            margin-top: 4px;
        }
        
        .bar-contributors {
            margin-top: 6px;
            width: 100%;
            min-height: 36px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }
        
        .bar-contributor-item {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            font-size: 7px;
            color: var(--cream);
            opacity: 0.85;
            height: 12px;
            line-height: 12px;
        }
        .bar-contributor-item.empty {
            visibility: hidden;
        }
        
        .bar-contributor-dot {
            width: 6px;
            height: 6px;
            border-radius: 1px;
            flex-shrink: 0;
        }
        
        .bar-contributor-name {
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 30px;
            white-space: nowrap;
        }
        
        .word-cards {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .word-card {
            background: var(--dark);
            border: 2px solid;
            position: relative;
            padding: 18px;
            overflow: hidden;
        }
        
        .word-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, var(--red), var(--gold), var(--red));
        }
        
        .word-card::after {
            content: '';
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            border: 2px solid;
            border-color: inherit;
            opacity: 0.2;
            transform: rotate(45deg);
        }
        
        .word-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        
        .word-card-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .word-card-rank {
            font-size: 32px;
            font-weight: 900;
            color: var(--gold);
            line-height: 1;
            text-shadow: 2px 2px 0 var(--red), 4px 4px 0 rgba(0,0,0,0.3);
            font-style: italic;
        }
        
        .word-card-title {
            font-size: 24px;
            font-weight: 900;
            color: var(--white);
            text-shadow: 1px 1px 0 var(--black);
        }
        
        .word-card-freq {
            font-size: 11px;
            color: var(--black);
            background: var(--gold);
            padding: 4px 12px;
            font-weight: 900;
            position: relative;
        }
        
        .word-card-freq::after {
            content: '';
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 100%;
            height: 100%;
            border: 1px solid var(--gold);
            z-index: -1;
        }
        
        .word-card-comment {
            font-size: 14px;
            color: var(--cream);
            font-style: italic;
            margin: 15px 0;
            padding: 12px 15px;
            background: linear-gradient(90deg, rgba(196,30,58,0.2), transparent);
            border-left: 4px solid var(--red);
            position: relative;
        }
        
        .word-card-comment::before {
            content: '"';
            position: absolute;
            top: 5px;
            left: 8px;
            font-size: 30px;
            color: var(--red);
            opacity: 0.5;
            font-family: Georgia, serif;
        }
        
        .word-card-contributors {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--gold);
            margin-bottom: 12px;
        }
        
        .word-card-contributors::before {
            content: '👤';
        }
        
        .word-card-samples {
            list-style: none;
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 4px;
        }
        
        .word-card-samples li {
            font-size: 12px;
            color: var(--cream);
            padding: 6px 0;
            border-bottom: 1px dashed rgba(218,165,32,0.3);
            opacity: 0.9;
            position: relative;
            padding-left: 20px;
        }
        
        .word-card-samples li:last-child {
            border-bottom: none;
        }
        
        .word-card-samples li::before {
            content: '»';
            position: absolute;
            left: 5px;
            color: var(--red);
            font-weight: bold;
        }
        
        .rankings-section {
            background: linear-gradient(135deg, var(--red) 0%, var(--dark-red) 100%);
            padding: 40px 15px;
            position: relative;
            overflow: hidden;
        }
        
        .rankings-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 50px,
                rgba(0,0,0,0.1) 50px,
                rgba(0,0,0,0.1) 100px
            );
            pointer-events: none;
        }
        
        .rankings-section .section-title {
            background: var(--gold);
            color: var(--black);
            border-color: var(--black);
        }
        
        .rankings-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            position: relative;
            z-index: 1;
        }
        
        .ranking-card {
            background: var(--black);
            border: 2px solid var(--gold);
            overflow: hidden;
            position: relative;
        }
        
        .ranking-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(218,165,32,0.1), transparent);
            pointer-events: none;
        }
        
        .ranking-card-header {
            background: linear-gradient(90deg, var(--gold), #f4c430);
            color: var(--black);
            padding: 10px;
            font-size: 11px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
        }
        
        .ranking-card-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--black);
        }
        
        .ranking-first {
            padding: 18px 10px;
            text-align: center;
            border-bottom: 2px dashed rgba(218,165,32,0.5);
            position: relative;
        }
        
        .ranking-first-crown {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .ranking-first-avatar {
            width: 55px;
            height: 55px;
            border-radius: 50%;
            border: 3px solid var(--gold);
            margin: 0 auto 10px;
            object-fit: cover;
            display: block;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        }
        
        .ranking-first-name {
            font-size: 14px;
            font-weight: 900;
            color: var(--gold);
            margin-bottom: 5px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-shadow: 1px 1px 0 var(--black);
        }
        
        .ranking-first-value {
            font-size: 20px;
            font-weight: 900;
            color: var(--white);
            text-shadow: 2px 2px 0 var(--red);
        }
        
        .ranking-others {
            padding: 10px;
        }
        
        .ranking-item {
            display: flex;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid rgba(218,165,32,0.2);
        }
        
        .ranking-item:last-child {
            border-bottom: none;
        }
        
        .ranking-item-pos {
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, var(--red), var(--dark-red));
            color: var(--white);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            margin-right: 8px;
            flex-shrink: 0;
            box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
        }
        
        .ranking-item-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            margin-right: 8px;
            border: 2px solid var(--gold);
            flex-shrink: 0;
        }
        
        .ranking-item-name {
            flex: 1;
            font-size: 11px;
            color: var(--cream);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .ranking-item-value {
            font-size: 10px;
            color: var(--gold);
            font-weight: 900;
            flex-shrink: 0;
            margin-left: 5px;
            background: rgba(218,165,32,0.2);
            padding: 2px 6px;
            border-radius: 3px;
        }
        
        .hour-section {
            padding: 35px 15px;
            background: var(--dark);
            position: relative;
        }
        
        .hour-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--red), transparent);
        }
        
        .hour-chart-container {
            background: linear-gradient(180deg, rgba(196,30,58,0.1) 0%, transparent 100%);
            border: 2px solid var(--red);
            padding: 20px 15px;
            position: relative;
        }
        
        .hour-chart-container::before {
            content: '⏰';
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--dark);
            padding: 0 10px;
            font-size: 20px;
        }
        
        .hour-chart {
            display: flex;
            align-items: flex-end;
            height: 80px;
            gap: 2px;
            margin-top: 10px;
        }
        
        .hour-bar {
            flex: 1;
            background: linear-gradient(180deg, var(--gold), var(--red));
            border-radius: 2px 2px 0 0;
            min-height: 3px;
        }
        
        .hour-bar:nth-child(n+1):nth-child(-n+6) {
            background: linear-gradient(180deg, #6366f1, #4338ca);
        }
        
        .hour-bar:nth-child(n+7):nth-child(-n+12) {
            background: linear-gradient(180deg, var(--orange), var(--red));
        }
        
        .hour-bar:nth-child(n+13):nth-child(-n+18) {
            background: linear-gradient(180deg, var(--gold), #b8860b);
        }
        
        .hour-bar:nth-child(n+19):nth-child(-n+24) {
            background: linear-gradient(180deg, #6366f1, #4338ca);
        }
        
        .hour-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            color: var(--cream);
            font-size: 10px;
            opacity: 0.7;
        }
        
        .hour-peak {
            text-align: center;
            margin-top: 18px;
            font-size: 14px;
            color: var(--gold);
            font-weight: 700;
        }
        
        .hour-peak-badge {
            display: inline-block;
            background: var(--red);
            color: var(--white);
            padding: 5px 15px;
            font-size: 12px;
            margin-top: 8px;
        }
        
        .footer {
            background: linear-gradient(180deg, var(--dark-red), var(--red));
            padding: 30px 15px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: var(--gold);
        }
        
        .footer-text {
            color: var(--cream);
            font-size: 10px;
            opacity: 0.6;
        }
        
        .divider {
            height: 30px;
            background: var(--black);
            position: relative;
            overflow: hidden;
        }
        
        .divider::before {
            content: '★ ★ ★';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--red);
            font-size: 12px;
            letter-spacing: 20px;
        }
        
        .divider-line {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--red), transparent 20%, transparent 80%, var(--red));
        }
        
        .color-1 { border-color: #DC2626; }
        .color-2 { border-color: #EA580C; }
        .color-3 { border-color: #D97706; }
        .color-4 { border-color: #CA8A04; }
        .color-5 { border-color: #65A30D; }
        .color-6 { border-color: #16A34A; }
        .color-7 { border-color: #0D9488; }
        .color-8 { border-color: #0891B2; }
        .color-9 { border-color: #2563EB; }
        .color-10 { border-color: #7C3AED; }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="stripe"></div>
        
        <div class="header">
            <div class="header-badge">Annual Report</div>
            <div class="header-star-group">★ ★ ★</div>
            <h1 class="${titleClass}">${chatName}</h1>
            <div class="subtitle">年度报告</div>
            <div class="header-stats">
                <div class="stat-box">
                    <div class="stat-value">${formatNumber(messageCount)}</div>
                    <div class="stat-label">消息总数</div>
                </div>
            </div>
        </div>
        
        <div class="stripe-diagonal"></div>
        
        <div class="chart-section">
            <div class="section-header">
                <div class="section-title">热词榜</div>
            </div>
            <div class="bar-chart">
                ${barChartHtml}
            </div>
        </div>
        
        <div class="divider">
            <div class="divider-line"></div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <div class="section-title">热词档案</div>
            </div>
            <div class="word-cards">
                ${wordCardsHtml}
            </div>
        </div>
        
        <div class="stripe"></div>
        
        <div class="section rankings-section">
            <div class="section-header">
                <div class="section-title">荣誉殿堂</div>
            </div>
            <div class="rankings-grid">
                ${rankingsHtml}
            </div>
        </div>
        
        <div class="section hour-section">
            <div class="section-header">
                <div class="section-title">活跃时段</div>
            </div>
            <div class="hour-chart-container">
                <div class="hour-chart">
                    ${hourBarsHtml}
                </div>
                <div class="hour-labels">
                    <span>0时</span>
                    <span>6时</span>
                    <span>12时</span>
                    <span>18时</span>
                    <span>24时</span>
                </div>
                <div class="hour-peak">
                    ⭐ 最活跃时段
                    <div class="hour-peak-badge">${peakHour}:00 - ${peakHour + 1}:00</div>
                </div>
            </div>
        </div>
        
        <div class="stripe-diagonal"></div>
        
        <div class="footer">
            <div class="footer-text">
                QQ群年度报告 - Powered by baibaibot
            </div>
        </div>
        
        <div class="stripe-thin"></div>
    </div>
</body>
</html>`
}

/**
 * 准备模板数据
 * @param {Object} jsonData 分析导出的JSON数据
 * @param {number[]} selectedIndices 选中的热词索引（可选，默认前10）
 * @returns {Object}
 */
function prepareTemplateData(jsonData, selectedIndices = null) {
  const topWords = jsonData.topWords || []
  
  // 选择热词（默认前10个）
  let selected
  if (selectedIndices && selectedIndices.length > 0) {
    selected = selectedIndices.map(i => topWords[i]).filter(Boolean)
  } else {
    selected = topWords.slice(0, 10)
  }

  const maxFreq = Math.max(...selected.map(w => w.freq))
  const minFreq = Math.min(...selected.map(w => w.freq))

  function calcBarHeight(freq) {
    if (maxFreq === minFreq) return 80
    const normalized = (freq - minFreq) / (maxFreq - minFreq)
    return 25 + Math.sqrt(normalized) * 75
  }

  // 处理热词数据
  const selectedWords = selected.map((wordInfo, idx) => {
    const contributors = wordInfo.contributors || []
    const total = wordInfo.freq

    // 分配颜色给贡献者
    const segments = []
    let accounted = 0

    contributors.slice(0, 5).forEach((c, i) => {
      const color = config.WORD_COLORS[i % config.WORD_COLORS.length]
      const percent = total > 0 ? (c.count / total * 100) : 0
      segments.push({
        name: c.name,
        uin: c.uin || '',
        count: c.count,
        percent,
        color
      })
      accounted += c.count
    })

    // 其他
    if (accounted < total) {
      const other = total - accounted
      segments.push({
        name: '其他',
        uin: '',
        count: other,
        percent: (other / total * 100),
        color: '#6B7280'
      })
    }

    // 图例
    const legend = []
    contributors.slice(0, 3).forEach((c, i) => {
      legend.push({
        name: c.name,
        color: config.WORD_COLORS[i % config.WORD_COLORS.length]
      })
    })
    while (legend.length < 3) {
      legend.push({ name: '', color: 'transparent' })
    }

    // 主要贡献者文本
    const contribText = contributors.slice(0, 3).map(c => c.name).join('、') || '未知'

    // 随机锐评
    const aiComment = getRandomComment(config.FALLBACK_COMMENTS)

    return {
      word: wordInfo.word,
      freq: wordInfo.freq,
      barHeight: calcBarHeight(wordInfo.freq),
      segments,
      legend,
      samples: wordInfo.samples || [],
      contributorsText: contribText,
      topContributor: contributors[0] || null,
      aiComment,
      color: config.WORD_COLORS[idx % config.WORD_COLORS.length]
    }
  })

  // 榜单数据
  const rankingsData = jsonData.rankings || {}
  const processedRankings = []

  for (const { title, key, icon, unit } of config.RANKING_CONFIG) {
    const data = rankingsData[key] || []
    if (data.length === 0) continue

    const first = data[0]
    const others = data.slice(1, 5)

    processedRankings.push({
      title,
      icon,
      unit,
      first: first ? {
        name: first.name,
        uin: first.uin || '',
        value: first.value,
        avatar: getAvatarUrl(first.uin || '')
      } : null,
      others: others.map(item => ({
        name: item.name,
        value: item.value,
        uin: item.uin || '',
        avatar: getAvatarUrl(item.uin || '')
      }))
    })
  }

  // 时段分布
  const hourDist = jsonData.hourDistribution || {}
  const maxHour = Math.max(...Object.values(hourDist).map(v => parseInt(v) || 0), 1)
  let peakHour = 0
  let peakCount = 0

  const hourData = []
  for (let h = 0; h < 24; h++) {
    const count = parseInt(hourDist[String(h)] || 0)
    const height = Math.max((count / maxHour * 100), 3)
    hourData.push({ hour: h, count, height })
    if (count > peakCount) {
      peakCount = count
      peakHour = h
    }
  }

  return {
    chatName: jsonData.chatName || '未知群聊',
    messageCount: jsonData.messageCount || 0,
    selectedWords,
    rankings: processedRankings,
    hourDistribution: hourData,
    peakHour
  }
}

/**
 * 生成图片报告
 * @param {Object} jsonData 分析导出的JSON数据
 * @param {string} outputPath 输出文件路径
 * @param {number[]} selectedIndices 选中的热词索引（可选）
 * @returns {Promise<string>} 生成的图片路径
 */
async function generateImage(jsonData, outputPath, selectedIndices = null) {
  // 准备数据
  const templateData = prepareTemplateData(jsonData, selectedIndices)
  
  // 生成HTML
  const html = generateHtmlTemplate(templateData)

  // 使用node-html-to-image转换
  try {
    const nodeHtmlToImage = require('node-html-to-image')
    
    await nodeHtmlToImage({
      output: outputPath,
      html,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    })

    console.log(`✅ 图片已生成: ${outputPath}`)
    return outputPath
  } catch (e) {
    console.error('图片生成失败:', e.message)
    
    // 保存HTML作为备份
    const htmlPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.html')
    fs.writeFileSync(htmlPath, html, 'utf-8')
    console.log(`📄 HTML已保存: ${htmlPath}`)
    
    throw e
  }
}

module.exports = {
  generateHtmlTemplate,
  prepareTemplateData,
  generateImage
}

