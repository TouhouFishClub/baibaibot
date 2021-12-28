const GLOBAL_MARGIN = 10
const TITLE_HEIGHT = 50
const TABLE_WIDTH = 150
const TABLE_HEADER_HEIGHT = 30
const TABLE_TITLE_HEIGHT = 30
const TABLE_ITEM_HEIGHT = 20
const TABLE_ITEM_MARGIN = 3
const TABLE_ITEM_MARGIN_TOP = 20
const TABLE_INSET_MARGIN = 5
const fontFamily = 'STXIHEI'
const COLOR_GROUP = [
  '#F44336',
  '#F46A36',
  '#FBC063',
  '#21828E',
  '#10C99A',
  '#0068B7',
  '#03A9F4',
  '#00BCD4',
  '#9E9E9E',
  '#616161',
  '#424242'
]
const fs = require('fs'),
  path = require('path'),
  { createCanvas, loadImage } = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage')

const renderCalendar = (year, month, callback, todos = [], fileTip = '') => {
  let now = new Date()
  if((!year || !month) || (year < 1970 || year > 2050) || (month < 1 || month > 12)) {
    year = now.getFullYear()
    month = now.getMonth() + 1
  }

  let ms = new Date(`${year}-${month}-1 0:0:0`), msw = ms.getDay()
  let dateInfo = []
  for(let i = 0; i < msw; i++) {
    dateInfo.unshift({
      startTs: ms.getTime() - 24 * 60 * 60 * 1000 * (i + 1)
    })
  }
  for(let i = 0; i < 42 - msw; i++){
    dateInfo.push({
      startTs: ms.getTime() + 24 * 60 * 60 * 1000 * i
    })
  }
  let st = dateInfo[0].startTs, et = dateInfo[dateInfo.length - 1].startTs + 24 * 60 * 60 * 1000 - 1,
    todoFilter = todos.map(t => {
      return {
        name: t.name,
        st: new Date(t.start_time).getTime(),
        std:new Date(t.start_time),
        et: new Date(t.end_time).getTime(),
        etd:new Date(t.end_time),
        de: getDayEnd(new Date(t.end_time).getTime()),
        ded: new Date(getDayEnd(new Date(t.end_time).getTime()))
      }
    }).filter(todo => (todo.et >= st && todo.st <= et) || (todo.st <= et && todo.et >= st))
      .sort((a, b) => a.st - b.st)
      .map((m, i) => Object.assign(m, {index: i}))
  let todoGroup = [], groupEnd = []
  todoFilter.forEach(tf => {
    let flag = false
    groupEnd.forEach((ge, gi) => {
      if(ge < tf.st && !flag){
        flag = true
        todoGroup[gi].push(tf)
        groupEnd[gi] = tf.de
      }
    })
    if(!flag) {
      todoGroup.push([tf])
      groupEnd.push(tf.de)
    }
  })
  dateInfo = dateInfo.map(d => Object.assign(d, {
    endTs: d.startTs + 24 * 60 * 60 * 1000 - 1,
    todos: []
  }))
  let todoGroupIndex = todoGroup.map(() => 0)
  dateInfo = dateInfo.map((date, index) => {
    let todos = []
    todoGroup.forEach((tg, tgi) => {
      let targetTodo = tg[todoGroupIndex[tgi]]
      if(targetTodo && targetTodo.st <= date.endTs && targetTodo.et >= date.startTs) {
        todos[tgi] = Object.assign({}, targetTodo)
        if(targetTodo.st >= date.startTs || index == 0){
          todos[tgi].isStart = true
        }
        if(targetTodo.et <= date.endTs){
          todos[tgi].isEnd = true
          todoGroupIndex[tgi] ++
        }
      }
    })
    return Object.assign(date, {
      todos: todos
    })
  })



  let width = GLOBAL_MARGIN * 2 + (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) * 7
  let height = GLOBAL_MARGIN * 2 + (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) * 6 + TITLE_HEIGHT + TABLE_HEADER_HEIGHT

  let canvas = createCanvas(width, height)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, width, height)

  let offsetTop = GLOBAL_MARGIN
  ctx.font = `30px ${fontFamily}`
  ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  ctx.fillText(`${year}年${month}月`, GLOBAL_MARGIN, offsetTop + 30)
  offsetTop += TITLE_HEIGHT

  ctx.font = `20px ${fontFamily}`
  ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  ~['周日', '周一', '周二', '周三', '周四', '周五', '周六'].forEach((m, i) => {
    ctx.fillText(m, GLOBAL_MARGIN + i * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2), offsetTop + 20)
  })
  offsetTop += TABLE_HEADER_HEIGHT




  ctx.strokeStyle = '#000'
  ctx.strokeRect(
    GLOBAL_MARGIN,
    offsetTop,
    width - 2 * GLOBAL_MARGIN,
    height - GLOBAL_MARGIN - offsetTop
  )
  for(let row = 0; row < 6; row++) {
    for(let col = 0; col < 7; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#eee': '#fff'
      ctx.fillRect(
        GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2),
        offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)),
        TABLE_WIDTH + TABLE_INSET_MARGIN * 2,
        TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)
      )
      let data = dateInfo[row * 7 + col], dateNow = new Date(data.startTs)
      ctx.fillStyle = dateNow.getMonth() == month - 1 ? '#000' : '#aaa'
      ctx.font = `20px ${fontFamily}`
      ctx.fillText(
        `${dateNow.getFullYear()}-${addZero(dateNow.getMonth() + 1)}-${addZero(dateNow.getDate())}`,
        GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) + TABLE_INSET_MARGIN,
        offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) + (TABLE_TITLE_HEIGHT - 20) / 2 + 20
      )
      data.todos.forEach((todo, index) => {
        if(todo){
          ctx.fillStyle = COLOR_GROUP[todo.index % COLOR_GROUP.length]
          ctx.fillRect(
            GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) + (todo.isStart ? TABLE_INSET_MARGIN : 0),
            offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) + TABLE_TITLE_HEIGHT + index * TABLE_ITEM_HEIGHT + (index + 1) * TABLE_ITEM_MARGIN_TOP,
            TABLE_WIDTH + (todo.isStart ? 0 : TABLE_INSET_MARGIN) + (todo.isEnd ? 0 : TABLE_INSET_MARGIN),
            TABLE_ITEM_HEIGHT
          )
        }
      })

    }
  }
  for(let row = 0; row < 6; row++) {
    for(let col = 0; col < 7; col++) {
      let data = dateInfo[row * 7 + col], dateNow = new Date(data.startTs), now = new Date()
      if(dateNow.getFullYear() == now.getFullYear() && dateNow.getMonth() == now.getMonth() && dateNow.getDate() == now.getDate()) {
        ctx.strokeStyle = 'rgba(0, 120, 215, 1)'
        ctx.fillStyle = 'rgba(0, 120, 215, .1)'
        ctx.lineWidth = 3
        ctx.strokeRect(
          GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2),
          offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)),
          TABLE_WIDTH + TABLE_INSET_MARGIN * 2,
          TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)
        )
        ctx.fillRect(
          GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2),
          offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)),
          TABLE_WIDTH + TABLE_INSET_MARGIN * 2,
          TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)
        )
      }


      data.todos.forEach((todo, index) => {
        if(todo){
          if(todo.isStart) {
            let fontsize = 22
            ctx.font = `${fontsize}px ${fontFamily}`
            ctx.fillStyle = "#fff"
            ctx.strokeStyle = "#333"
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.strokeText(
              todo.name,
              GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) + TABLE_INSET_MARGIN + 2,
              offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) + TABLE_TITLE_HEIGHT + index * TABLE_ITEM_HEIGHT + (index + 1) * TABLE_ITEM_MARGIN_TOP + (TABLE_ITEM_HEIGHT - fontsize) / 2 + fontsize - 15,
            )
            ctx.fillText(
              todo.name,
              GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) + TABLE_INSET_MARGIN + 2,
              offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) + TABLE_TITLE_HEIGHT + index * TABLE_ITEM_HEIGHT + (index + 1) * TABLE_ITEM_MARGIN_TOP + (TABLE_ITEM_HEIGHT - fontsize) / 2 + fontsize - 15,
            )
          }
          if(todo.isEnd) {
            let fontsize = 16
            ctx.font = `${fontsize}px ${fontFamily}`
            ctx.fillStyle = "#fff"
            ctx.strokeStyle = "#666"
            ctx.lineWidth = 1
            let time = `${todo.etd.getHours()}:${addZero(todo.etd.getMinutes())}:${addZero(todo.etd.getSeconds())}`
            let widthFix = ctx.measureText(time).width
            ctx.strokeText(
              time,
              GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) + TABLE_INSET_MARGIN + TABLE_WIDTH - widthFix - 2,
              offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) + TABLE_TITLE_HEIGHT + index * TABLE_ITEM_HEIGHT + (index + 1) * TABLE_ITEM_MARGIN_TOP + (TABLE_ITEM_HEIGHT - fontsize) / 2 + fontsize - 3,
            )
            ctx.fillText(
              time,
              GLOBAL_MARGIN + col * (TABLE_WIDTH + TABLE_INSET_MARGIN * 2) + TABLE_INSET_MARGIN + TABLE_WIDTH - widthFix - 2,
              offsetTop + row * (TABLE_TITLE_HEIGHT + TABLE_INSET_MARGIN * 2 + todoGroup.length * (TABLE_ITEM_HEIGHT + TABLE_ITEM_MARGIN_TOP)) + TABLE_TITLE_HEIGHT + index * TABLE_ITEM_HEIGHT + (index + 1) * TABLE_ITEM_MARGIN_TOP + (TABLE_ITEM_HEIGHT - fontsize) / 2 + fontsize - 3,
            )

          }
        }
      })

    }
  }












  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  sendImageMsgBuffer(dataBuffer, `${year}_${month}${fileTip}.png`, 'other', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, `${year}_${month}${fileTip}.png`), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });


}

const getDayEnd = ts => {
  let date = new Date(ts)
  return new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 0:0:0`).getTime() + 24 * 60 * 60 * 1000 - 1
}

const addZero = num => num < 10 ? ('0' + num) : num

module.exports={
  renderCalendar
}
