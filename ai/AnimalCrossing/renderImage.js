const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage')

const MAX_SHOW_DATA = 30
const GLOBAL_MARGIN = 20
const TABLE_WIDTH = 80
const TABLE_HEIGHT = 30
const fontFamily = 'STXIHEI'
const titleHeight = 250
const chartHeight = 300

module.exports = (data, qq, inputArr, type, isFirst, callback, otherMsg) => {

  let all = data.filter(d => d.pattern_number == 4)
  let other = data.filter(d => d.pattern_number != 4)
  // console.log(all)



  let length = data.length
  let ds = other.slice(0, MAX_SHOW_DATA).concat(all)

  let width = TABLE_WIDTH * ( 1 + 6 * 2 + 4) + GLOBAL_MARGIN * 2,
    height = (ds.length + 2) * TABLE_HEIGHT + GLOBAL_MARGIN * 3 + titleHeight + chartHeight
  let canvas = createCanvas(width, height)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, width, height)
  let offsetTop = GLOBAL_MARGIN

  /* title （font-size：16， line-height: 20）*/
  let line = 25, textDown = (line - 16) / 2 + 16
  ctx.font = `16px ${fontFamily}`
  ctx.fillStyle = '#333'
  ctx.fillText('输入信息：', GLOBAL_MARGIN, offsetTop + textDown)
  offsetTop += line

  ctx.fillText(`买入价：${inputArr[0] || '未知'}\t\t${isFirst ? '' : '非'}首次购入\t\t上周走势: ${type == -1 ? '未知' : ['波动型', '大幅上涨（三期型）', '递减型', '小幅上涨（四期型）'][type]}` , GLOBAL_MARGIN, offsetTop + textDown)
  offsetTop += line

  ctx.fillText(`【周一】上午：${inputArr[2] || '未知'}   下午：${inputArr[3] || '未知'}`, GLOBAL_MARGIN, offsetTop + textDown)
  ctx.fillText(`【周二】上午：${inputArr[4] || '未知'}   下午：${inputArr[5] || '未知'}`, GLOBAL_MARGIN + 300, offsetTop + textDown)
  offsetTop += line

  ctx.fillText(`【周三】上午：${inputArr[6] || '未知'}   下午：${inputArr[7] || '未知'}`, GLOBAL_MARGIN, offsetTop + textDown)
  ctx.fillText(`【周四】上午：${inputArr[8] || '未知'}   下午：${inputArr[9] || '未知'}`, GLOBAL_MARGIN + 300, offsetTop + textDown)
  offsetTop += line

  ctx.fillText(`【周五】上午：${inputArr[10] || '未知'}   下午：${inputArr[11] || '未知'}`, GLOBAL_MARGIN, offsetTop + textDown)
  ctx.fillText(`【周六】上午：${inputArr[12] || '未知'}   下午：${inputArr[13] || '未知'}`, GLOBAL_MARGIN + 300, offsetTop + textDown)
  offsetTop += line
  offsetTop += 12

  ctx.fillText('波动型：一周的卖价随机，价格最高为1.1～1.4倍', GLOBAL_MARGIN, offsetTop + textDown)
  offsetTop += line
  ctx.fillText('递减型：一周卖价会持续走低，必赔', GLOBAL_MARGIN, offsetTop + textDown)
  offsetTop += line
  ctx.fillText('三期型：开始阶段卖价递减，当突然发生上涨时，且下一次价格大于买入价的1.4倍，价格顶峰会出现在上涨后的下下次，卖价为买入价的2～6倍', GLOBAL_MARGIN, offsetTop + textDown)
  offsetTop += line
  ctx.fillText('四期型：开始阶段卖价递减，当突然发生上涨时，且下一次价格大于买入价的1.4倍，价格顶峰会出现在上涨后的下下下次，卖价为买入价的1.4～2倍', GLOBAL_MARGIN, offsetTop + textDown)
  offsetTop += line




  /* charts */
  let chartOffsetTop = GLOBAL_MARGIN  + titleHeight

  ctx.strokeStyle = 'rgba(0,0,0,1)'
  ctx.moveTo(GLOBAL_MARGIN + 2 * TABLE_WIDTH, chartOffsetTop)
  ctx.lineTo(GLOBAL_MARGIN + 2 * TABLE_WIDTH, chartOffsetTop + chartHeight)
  ctx.stroke()
  ctx.moveTo(GLOBAL_MARGIN + 2 * TABLE_WIDTH, chartOffsetTop + chartHeight)
  ctx.lineTo(width - GLOBAL_MARGIN - 2 * TABLE_WIDTH, chartOffsetTop + chartHeight)
  ctx.stroke()
  for(let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.setLineDash([5, 10])
    ctx.moveTo(GLOBAL_MARGIN + 2 * TABLE_WIDTH, chartOffsetTop + chartHeight / 6 * i)
    ctx.lineTo(width - GLOBAL_MARGIN - 2 * TABLE_WIDTH, chartOffsetTop + chartHeight / 6 * i)
    ctx.stroke()
  }

  // console.log(all[0].prices)
  let chartPrice = all[0].prices.concat([])
  chartPrice.shift()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(
    GLOBAL_MARGIN + 2 * TABLE_WIDTH + TABLE_WIDTH / 2,
    chartOffsetTop + (600 - chartPrice[0].min) / 600 * chartHeight
  )
  for(let i = 0; i < chartPrice.length; i ++){
    ctx.lineTo(
      GLOBAL_MARGIN + 2 * TABLE_WIDTH + TABLE_WIDTH / 2 + TABLE_WIDTH * i,
      chartOffsetTop + (600 - chartPrice[i].min) / 600 * chartHeight
    )
  }
  for(let j = chartPrice.length - 1; j >= 0; j --){
    ctx.lineTo(
      GLOBAL_MARGIN + 2 * TABLE_WIDTH + TABLE_WIDTH / 2 + TABLE_WIDTH * j,
      chartOffsetTop + (600 - chartPrice[j].max) / 600 * chartHeight
    )
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(10, 181, 205, .3)'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(10, 181, 205, 1)'
  ctx.stroke()
  ctx.fill()
  ctx.lineWidth = 1

  /* thead */
  ~['模式', '概率', '周日'].forEach((msg, index) => {
    renderTable(
      ctx,
      1,
      1 + index,
      msg,
      {
        bold: true,
        color: '#333',
        rowspan: 1
      }
    )
  })
  ~['周一', '周二', '周三', '周四', '周五', '周六'].forEach((msg, index) => {
    renderTable(
      ctx,
      1,
      4 + index * 2,
      msg,
      {
        bold: true,
        color: '#333',
        colspan: 1,
        ignoreBorder: true
      }
    )
  })
  ~['低保', '预测最高'].forEach((msg, index) => {
    renderTable(
      ctx,
      1,
      16 + index,
      msg,
      {
        bold: true,
        color: '#333',
        rowspan: 1
      }
    )
  })
  ~[
    '上午','下午',
    '上午','下午',
    '上午','下午',
    '上午','下午',
    '上午','下午',
    '上午','下午'
  ].forEach((msg, index) => {
    renderTable(
      ctx,
      2,
      4 + index,
      msg,
      {
        bold: true,
        color: '#aaa',
      }
    )
  })

  ds.forEach((msg, row) => {
    let renderArr = [
      {msg: msg.pattern_description},
      {msg: msg.pattern_number == 4 ? '-' : `${(100 / (length - 1)).toFixed(2)}%`}
    ].concat(msg.prices.slice(1).map(p => {
      return {
        msg: p.max == p.min ? p.max : `${p.min}~${p.max}`,
        option: {
          color: p.max == p.min ? '#0AB5CD' : '#666',
          bgColor: p.max == msg.weekMax ? '#FCC' : '#FFF'
        }
      }
    })).concat([
      {msg: msg.weekGuaranteedMinimum},
      {msg: msg.weekMax}
    ])
    renderArr.forEach((re, col) => {
      renderTable(
        ctx,
        3 + row,
        1 + col,
        re.msg,
        re.option || {}
      )
    })
  })




  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  sendImageMsgBuffer(dataBuffer, `大头菜_${qq}`, 'other', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, `大头菜${qq}.png`), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });


}

const renderTable = (ctx, row, col, msg, options = {}) => {
  let offsetLeft = (col - 1) * TABLE_WIDTH + GLOBAL_MARGIN,
    offsetTop = (row - 1) * TABLE_HEIGHT + GLOBAL_MARGIN * 2 + titleHeight + chartHeight
  let option = Object.assign({
    bold: false,
    size: 16,
    color: '#888',
    bgColor: '#fff',
    ignoreBorder: false,
    colspan: 0,
  }, options)
  let twidth = TABLE_WIDTH, theight = TABLE_HEIGHT
  if(option.colspan > 0) {
    twidth = TABLE_WIDTH * (1 + option.colspan)
  }
  if(option.rowspan > 0) {
    theight = TABLE_HEIGHT * (1 + option.rowspan)
  }
  ctx.fillStyle = option.bgColor
  ctx.fillRect(offsetLeft, offsetTop, twidth, theight)
  ctx.font = `${option.bold ? 'normal' : 'bold'} ${option.size}px ${fontFamily}`
  ctx.fillStyle = option.color
  let tw = ctx.measureText(msg).width
  ctx.fillText(msg, offsetLeft + (twidth - tw) / 2, offsetTop + (theight - option.size) / 2 + option.size)
  if(!option.ignoreBorder) {
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(0,0,0,.15)'
    // console.log('=====')
    // console.log(offsetLeft)
    ctx.moveTo(offsetLeft, offsetTop + theight)
    ctx.lineTo(offsetLeft + twidth, offsetTop + theight)
    ctx.stroke()
  }

}
