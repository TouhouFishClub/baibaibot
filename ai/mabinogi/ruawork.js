module.exports = function(callback){
  /*
  * 暂时不使用网络请求，如之后参数会变则抓取奇幻世界
  */
  const chDay = (date, next) => (Math.floor(((date.getTime() + adjust_value2 * 1000) / (1000 * 60)) / 36) + next) * 36
  const dsp = value => (value < 10 ? '0' + value : value)
  let msg = ''

  // let adjust_value = -53
  let adjust_value = 0
  let adjust_value2 = Math.floor(adjust_value * 1.5)


  let date = new Date()

  date.setUTCHours(date.getUTCHours() + 8)

  let second_source = Math.floor((date.getTime() % 2160000) / 1500) + adjust_value
  let ETHours   = Math.floor(second_source / 60)
  let ETMinutes = Math.floor(second_source % 60)


  msg += `爱琳时间：${dsp(ETHours)}:${dsp(ETMinutes)}\n`


  let now = new Date()
  msg += `现实时间：${dsp(now.getHours())}:${dsp(now.getMinutes())}\n`

  let hour = now.getHours()
  let min = now.getMinutes()
  let week = now.getDay() + 1
  let buff

  const rua = '0010001000010010110111000000010100100010001'
  let mg_count = 43
  let mg_rag  = 10
  let mg_time = 17 * 1.5
  let e_hour = Math.floor(second_source / 60) % 24
  let e_min   = Math.floor(second_source % 60)


  let eweca = (e_hour >= 17 || e_hour < 6)

  for(let i = 0; i < 5; i++){

    aaa = chDay(date, i - (e_hour < 6))
    min = Math.floor(aaa + mg_time) % 60
    hour = Math.floor((aaa + mg_time) / 60) % 24
    mgNo = (Math.floor(aaa / 36) + mg_rag) % mg_count

    w_sec = Math.floor((aaa + mg_time + (eweca ? 13 * 1.5:0)) * 60)
    n_sec = Math.floor((date.getTime()) / 1000) + adjust_value2
    buff = `${dsp(hour)}:${dsp(min)}   ${rua.substr(mgNo,1) == 1 ? '上班' : '休息'}   ${(i==0 ? `${eweca ? '酒馆营业中，距离关店还有' : '酒馆准备中，距离开店还有'}${(parseInt((w_sec - n_sec) / 60)%60)}分${dsp((w_sec - n_sec)%60) + '秒'}`:'')}`

    msg += `${buff}\n`
  }
  callback(msg)
}