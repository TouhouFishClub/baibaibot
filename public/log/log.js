class groupLog {
  constructor(groupId, timestamp, container){
    this.groupId = groupId
    this.timestamp = timestamp || ''
    this.container = container
  }
  init(){
    this.container.empty()
    this.lazyLoad = false
    this.getGroupData(this.timestamp)
    /* 添加渐进加载 */
    this.container.scroll(() => {
      // console.log(`scroll:${this.container.scrollTop()}   mark:${this.mark.position().top}`)
      if(this.container.scrollTop() < 3 && !this.lazyLoad){
        this.lazyLoad = true
        this.getGroupData(this.lastTimestamp)
      }
    })
  }
  getGroupData(timestamp) {
    console.log('=== get data ===')
    this.mark = $('<div class="mark"></div>')
    this.container.prepend(this.mark)
    const HOST = ''
    $.getJSON(`${HOST}/chathistory?gid=${this.groupId}&ts=${timestamp}`, data => {
      this.lastTimestamp = data.d[data.d.length - 1].ts
      this.renderMessage(data.d)
    })
  }
  renderMessage(msgArr) {
    let msgBlock = $('<div class="message-block"></div>')
    msgArr.reverse().forEach(item => {
      let msgItem= $('<div class="message-item"></div>')
      msgItem.append(`<img class="user-avator" src="http://q1.qlogo.cn/g?b=qq&nk=${item.uid}&s=100">`)
      msgItem.append(`<div class="message-info"><span class="user-nick">${item.n}</span>&nbsp;&nbsp;&nbsp;<span class="msg-time">${this.formatTime(item.ts)}</span></div>`)
      if(item.d.indexOf('[CQ:') < 0){
        msgItem.append(`<div class="msg-text">${item.d}</div>`)
      } else {
        msgItem.append(this.renderMediaMessage(item.d))
      }
      msgBlock.append(msgItem)
    })
    this.container.prepend(msgBlock)
    // console.log(`====== ${this.mark.offset().top} =======`)
    this.container.scrollTop(this.mark.position().top - $('.same-from').height() - 40)
    this.lazyLoad = false
  }
  renderMediaMessage(msg) {
    let msgText = $('<div class="msg-text"></div>')
    msg.split('[CQ:').forEach((ele, idx) => {
      if(idx == 0){
        msgText.append(`<span>${ele}</span>`)
      } else {
        let fi = ele.indexOf(']')
        let CQtype = ele.substring(0, fi)
        let normalMsg = ele.substring(fi + 1)
        console.log(CQtype)
        switch(CQtype.substring(0, CQtype.indexOf(','))){
          case 'image':
            msgText.append(`<img src="${CQtype.substring(CQtype.indexOf('url=') + 4)}" class="msg-image">`)
            break
        }
        msgText.append(`<span>${normalMsg}</span>`)
      }
    })
    return msgText
  }


  formatTime(timestamp) {
    let time = new Date(timestamp)
    return `${time.getFullYear()}-${this.addZero(time.getMonth() + 1)}-${this.addZero(time.getDate())} ${this.addZero(time.getHours())}:${this.addZero(time.getMinutes())}:${this.addZero(time.getSeconds())}`
  }
  addZero(num){
    return num < 10? `0${num}` : num
  }
  destroy(){
    /* 移除监听，假装销毁 */
    this.container.off('scroll')
  }
}

$(document).ready(function(){
  console.log('=== init Dom ===')
  let msgCont = $('.message-container'), form = $('.same-from'), groupId = $('#inputGroupId'), inputTimestamp = $('#inputTimestamp'),
    btn = $('.btn', form), logIns
  btn.on('click', () => {
    if(groupId.val().trim()){
      if(logIns && logIns.destroy){
        logIns.destroy()
      }
      logIns = new groupLog(groupId.val(), inputTimestamp.val(), msgCont)
      logIns.init()
    }
  })
})
