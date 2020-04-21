const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage')

const MAX_SHOW_DATA = 30
const GLOBAL_MARGIN = 20
const TABLE_WIDTH = 80
const TABLE_HEIGHT = 30
const fontFamily = 'STXIHEI'

module.exports = (data, callback, otherMsg) => {
  let length = data.length
  let ds = data.slice(0, MAX_SHOW_DATA + 1)

  let width = TABLE_WIDTH * ( 1 + 6 * 2 + 4) + GLOBAL_MARGIN * 2,
    height = (ds.length + 2) * TABLE_HEIGHT + GLOBAL_MARGIN * 2
  let canvas = createCanvas(width, height)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, width, height)

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
        color: '#CCC',
      }
    )
  })

  ds.forEach((msg, row) => {
    let renderArr = [
      {msg: msg.pattern_description},
      {msg: `${(100 / length - 1).toFixed(2)}%`}
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

  sendImageMsgBuffer(dataBuffer, '大头菜_'+new Date().getTime(), 'other', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, `大头菜.png`), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });


}

const renderTable = (ctx, row, col, msg, options = {}) => {
  let offsetLeft = (col - 1) * TABLE_WIDTH + GLOBAL_MARGIN,
    offsetTop = (row - 1) * TABLE_HEIGHT + GLOBAL_MARGIN
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
