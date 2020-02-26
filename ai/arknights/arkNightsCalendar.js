const fs = require('fs-extra')
const path = require('path-extra')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, loadImage} = require('canvas')

const OUTER_MARGIN = 30
const INSET_MARGIN = 10
const PANEL_LABEL_WIDTH = 100
const PANEL_WIDTH = 250
const PANEL_PADDING = 30
const PANEL_VERTILE_PADDING = 20
const HEADER_SIZE = 24
const PANEL_TITLE_SIZE = 20
const PANEL_DESC_SIZE = 14
const OTHER_SIZE = 16
const LINE_HEIGHT = 1.4
const fontFamily = 'STXIHEI'

const calendar = callback => {
  const define = fs.readJsonSync(path.join(__dirname, 'calendarDefine.json'))
  const today = new Date()
  const iday = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  renderImage(
    pickTodaysLuck(iday, define),
    getDirectionString(define, iday),
    getDrinkString(define),
    getStarString(iday),
    callback
  )
}

const renderImage = (pick, direct, drink, star, callback) => {
  let canvasTmp = createCanvas(400, 400), ctxTmp = canvasTmp.getContext('2d')
  let goodHeight =
    pick.good.reduce(
      (p, c) => {
        let h = 0
        ctxTmp.font = `${PANEL_TITLE_SIZE}px ${fontFamily}`
        h += Math.ceil(ctxTmp.measureText(c.name).width / PANEL_WIDTH) * PANEL_TITLE_SIZE * LINE_HEIGHT
        ctxTmp.font = `${PANEL_DESC_SIZE}px ${fontFamily}`
        h += (Math.ceil(ctxTmp.measureText(c.good).width / PANEL_WIDTH) || 1) * PANEL_DESC_SIZE * LINE_HEIGHT
        return p + h + INSET_MARGIN
      }, 0) + PANEL_VERTILE_PADDING * 2 - INSET_MARGIN,
    badHeight =
      pick.bad.reduce(
        (p, c) => {
          let h = 0
          ctxTmp.font = `${PANEL_TITLE_SIZE}px ${fontFamily}`
          h += Math.ceil(ctxTmp.measureText(c.name).width / PANEL_WIDTH) * PANEL_TITLE_SIZE * LINE_HEIGHT
          ctxTmp.font = `${PANEL_DESC_SIZE}px ${fontFamily}`
          h += Math.ceil(ctxTmp.measureText(c.bad).width / PANEL_WIDTH) * PANEL_DESC_SIZE * LINE_HEIGHT
          return p + h + INSET_MARGIN
        }, 0) + PANEL_VERTILE_PADDING * 2 - INSET_MARGIN
  // console.log(goodHeight, badHeight)
  let cHeight =
    goodHeight +
    badHeight +
    INSET_MARGIN * 2 +
    2 * OUTER_MARGIN +
    HEADER_SIZE * LINE_HEIGHT +
    (OTHER_SIZE * LINE_HEIGHT + INSET_MARGIN) * 3

  let cWidth = OUTER_MARGIN * 2 + PANEL_LABEL_WIDTH + PANEL_WIDTH + 2 * PANEL_PADDING
  let canvas = createCanvas(cWidth, cHeight)
    , ctx = canvas.getContext('2d')
  let offsetTop = OUTER_MARGIN
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, cWidth, cHeight)
  ctx.fillStyle = '#000'
  let dayStr = `今天是${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日 星期${['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]}`
  offsetTop = renderText(ctx, dayStr, offsetTop, OUTER_MARGIN, cWidth - 2 * OUTER_MARGIN, LINE_HEIGHT, HEADER_SIZE)
  offsetTop += INSET_MARGIN
  /* good */

  ctx.fillStyle = '#ffee44'
  ctx.fillRect(OUTER_MARGIN, offsetTop, PANEL_LABEL_WIDTH, goodHeight)
  ctx.fillStyle = `rgba(255,255,170,1)`
  ctx.fillRect(OUTER_MARGIN + PANEL_LABEL_WIDTH, offsetTop, PANEL_WIDTH + 2 * PANEL_PADDING, goodHeight)
  offsetTop += PANEL_VERTILE_PADDING

  ctx.fillStyle = `rgba(0,0,0,1)`
  ctx.font = `28px ${fontFamily}`
  let str = '宜'
  renderText(
    ctx,
    str,
    offsetTop + goodHeight / 2 - 28,
    OUTER_MARGIN + (PANEL_LABEL_WIDTH - ctx.measureText(str).width) / 2,
    PANEL_LABEL_WIDTH,
    1,
    28
  )
  pick.good.forEach(good => {
    ctx.fillStyle = '#222'
    offsetTop = renderText(
      ctx,
      good.name,
      offsetTop,
      OUTER_MARGIN + PANEL_LABEL_WIDTH + PANEL_PADDING,
      PANEL_WIDTH,
      LINE_HEIGHT,
      PANEL_TITLE_SIZE
    )
    ctx.fillStyle = '#777'
    offsetTop = renderText(
      ctx,
      good.good,
      offsetTop,
      OUTER_MARGIN + PANEL_LABEL_WIDTH + PANEL_PADDING,
      PANEL_WIDTH,
      LINE_HEIGHT,
      PANEL_DESC_SIZE
    )
    offsetTop += INSET_MARGIN
  })
  offsetTop = offsetTop - INSET_MARGIN + PANEL_VERTILE_PADDING

  /* bad */

  ctx.fillStyle = '#ff4444'
  ctx.fillRect(OUTER_MARGIN, offsetTop, PANEL_LABEL_WIDTH, badHeight)
  ctx.fillStyle = `#ffddd3`
  ctx.fillRect(OUTER_MARGIN + PANEL_LABEL_WIDTH, offsetTop, PANEL_WIDTH + 2 * PANEL_PADDING, badHeight)
  offsetTop += PANEL_VERTILE_PADDING

  ctx.fillStyle = `rgba(0,0,0,1)`
  ctx.font = `28px ${fontFamily}`
  let strN = '忌'
  renderText(
    ctx,
    strN,
    offsetTop + badHeight / 2 - 28,
    OUTER_MARGIN + (PANEL_LABEL_WIDTH - ctx.measureText(strN).width) / 2,
    PANEL_LABEL_WIDTH,
    1,
    28
  )
  pick.bad.forEach(bad => {
    ctx.fillStyle = '#222'
    offsetTop = renderText(
      ctx,
      bad.name,
      offsetTop,
      OUTER_MARGIN + PANEL_LABEL_WIDTH + PANEL_PADDING,
      PANEL_WIDTH,
      LINE_HEIGHT,
      PANEL_TITLE_SIZE
    )
    ctx.fillStyle = '#777'
    offsetTop = renderText(
      ctx,
      bad.good,
      offsetTop,
      OUTER_MARGIN + PANEL_LABEL_WIDTH + PANEL_PADDING,
      PANEL_WIDTH,
      LINE_HEIGHT,
      PANEL_DESC_SIZE
    )
    offsetTop += INSET_MARGIN
  })

  offsetTop = offsetTop - INSET_MARGIN + PANEL_VERTILE_PADDING

  /* other */
  offsetTop += INSET_MARGIN
  ctx.fillStyle = '#222'

  offsetTop = renderText(
    ctx,
    `抽卡指数：${star}`,
    offsetTop,
    OUTER_MARGIN,
    cWidth,
    LINE_HEIGHT,
    OTHER_SIZE
  )

  offsetTop += INSET_MARGIN
  offsetTop = renderText(
    ctx,
    `抽卡朝向：面向${direct}抽卡，出率最高`,
    offsetTop,
    OUTER_MARGIN,
    cWidth,
    LINE_HEIGHT,
    OTHER_SIZE
  )

  offsetTop += INSET_MARGIN
  offsetTop = renderText(
    ctx,
    `姿势加成：喝点${drink}，有助于出货`,
    offsetTop,
    OUTER_MARGIN,
    cWidth,
    LINE_HEIGHT,
    OTHER_SIZE
  )





  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  // sendImageMsgBuffer(dataBuffer, content, 'arknights', msg => {
  //   callback(msg)
  // })

  fs.writeFile(path.join(__dirname, '/test/char.png'), dataBuffer, function(err) {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！");
    }
  });

}


const renderText = (ctx, text, offsetTop, offsetLeft, maxWidth, lineHeight, fontSize) => {
  let textArr = [], textTmp = ''
  ctx.font = `${fontSize}px ${fontFamily}`
  text.split('').forEach(t => {
    if(ctx.measureText(`${textTmp}${t}`).width < maxWidth){
      if(t == '\n'){
        textArr.push(textTmp)
        textTmp = ''
      } else {
        textTmp += t
      }
    } else {
      textArr.push(textTmp)
      textTmp = t
    }
  })
  textArr.push(textTmp)
  let top = offsetTop
  textArr.forEach((text, line) => {
    // ctx.strokeRect(offsetLeft, top, 100, lineHeight * fontSize)
    ctx.fillText(text, offsetLeft, top + lineHeight * fontSize * line + fontSize + (lineHeight - 1) * fontSize / 2 - 2)
  })
  return offsetTop + textArr.length * fontSize * lineHeight
}

const random = (dayseed, indexseed) => {
  var n = dayseed % 11117;
  for (var i = 0; i < 100 + indexseed; i++) {
    n = n * n;
    n = n % 11117; // 11117 是个质数
  }
  return n;
}

function star(num) {
  var result = [];
  var i = 0;
  while (i < num) {
    result.push('★');
    i++;
  }
  while (i < 5) {
    result.push('☆');
    i++;
  }
  return result.join('');
}

// 生成今日运势
function pickTodaysLuck(iday, define) {
  let _activities = filter(define.activities);

  let numGood = random(iday, 98) % 3 + 2;
  let numBad = random(iday, 87) % 3 + 2;
  let eventArr = pickRandomActivity(_activities, numGood + numBad, iday, define);

  let special = pickSpecials(iday, define);

  let goodList = special.good;
  let badList = special.bad;

  for (let i = 0; i < numGood; i++) {
    goodList.push(eventArr[i]);
  }

  for (let i = 0; i < numBad; i++) {
    badList.push(eventArr[numGood + i]);
  }

  return {good: goodList.slice(0, 4), bad: badList.slice(0, 4)};
}

// 去掉一些不合今日的事件
function filter(activities) {
  let result = [];

  // 周末的话，只留下 weekend = true 的事件
  if (isWeekend(new Date())) {

    for (let i = 0; i < activities.length; i++) {
      if (activities[i].weekend) {
        result.push(activities[i]);
      }
    }

    return result;
  }

  return activities;
}

function isWeekend(today) {
  return today.getDay() == 0 || today.getDay() == 6;
}

// 添加预定义事件
function pickSpecials(iday, define) {

  let goodList = [];
  let badList = [];

  for (let i = 0; i < define.specials.length; i++) {
    let special = define.specials[i];

    if (iday == special.date) {
      if (special.type == 'good') {
        goodList.push({
          name: special.name,
          good: special.description
        });
      } else {
        badList.push({
          name: special.name,
          bad: special.description
        });
      }
    }
  }

  return {good: goodList, bad: badList};
}

// 从 activities 中随机挑选 size 个
function pickRandomActivity(activities, size, iday, define) {
  let picked_events = pickRandom(activities, size, iday);

  for (let i = 0; i < picked_events.length; i++) {
    picked_events[i] = parse(picked_events[i], define, iday);
  }

  return picked_events;
}

// 从数组中随机挑选 size 个
function pickRandom(array, size, iday) {
  let result = [];

  for (let i = 0; i < array.length; i++) {
    result.push(array[i]);
  }

  for (let j = 0; j < array.length - size; j++) {
    let index = random(iday, j) % result.length;
    result.splice(index, 1);
  }

  return result;
}

// 解析占位符并替换成随机内容
function parse(event, define, iday) {
  let result = {
    name: event.name,
    good: event.good,
    bad: event.bad
  }; // clone

  if (result.name.indexOf('%v') != -1) {
    result.name = result.name.replace('%v', define.varNames[random(iday, 12) % define.varNames.length]);
  }

  if (result.name.indexOf('%t') != -1) {
    result.name = result.name.replace('%t', define.tools[random(iday, 11) % define.tools.length]);
  }

  if (result.name.indexOf('%l') != -1) {
    result.name = result.name.replace('%l', (random(iday, 12) % 247 + 30).toString());
  }

  return result;
}

// 获得座位朝向
function getDirectionString(define, iday) {
  return define.directions[random(iday, 2) % define.directions.length];
}

// 获得今日宜饮
function getDrinkString(define) {
  return pickRandom(define.drinks, 2).join('，');
}

// 获得女神亲近指数
function getStarString(iday) {
  return star(random(iday, 6) % 5 + 1);
}

module.exports = {
  calendar
}