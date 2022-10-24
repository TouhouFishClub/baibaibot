const chineseNewYear = [
  '2021-2-11',
  '2022-1-31',
  '2023-1-21',
]
//清明
const tombSweepingDay = [
  '2021-4-3',
  '2022-4-3',
  '2023-4-5',
]
//端午
const dragonBoatFestival = [
  '2021-6-12',
  '2022-6-3',
  '2023-6-22',
]
//中秋
const midAutumnFestival = [
  '2021-9-19',
  '2022-9-29',
  '2023-9-29',
]

const calcDay = dateStrList => {
  let n = Date.now()
  for(let i = 0; i < dateStrList.length; i ++) {
    let tn = new Date(dateStrList[i])
    if(n < tn.getTime()) {
      return ~~((tn.getTime() - n) / 86400000) + 1
    }
  }
  return '∞'
}

const timeInfo = Hour => {
  if(Hour <= 5) {
    return '晚上好'
  }
  if(Hour <= 11) {
    return '早上好'
  }
  if(Hour <= 13 ) {
    return '中午好'
  }
  if(Hour <= 17 ) {
    return '下午好'
  }
  return '晚上好'
}

const tapFish = callback => {
  let n = new Date()
  let weekendStr = n.getDay() > 0 && n.getDay() < 6 ? `距离周末还有${6 - n.getDay()}天` : ``
  let newYearStr = `距离元旦还有${~~((new Date(`${n.getFullYear() + 1}-1-1`).getTime() - n.getTime()) / 86400000)}天`
  let chineseNewYearStr = `距离春节还有${calcDay(chineseNewYear)}天`
  let tombSweepingDayStr = `距离清明节还有${calcDay(tombSweepingDay)}天`
  let labourDayStr = `距离劳动节还有${calcDay([`${n.getFullYear()}-5-1`,`${n.getFullYear()+1}-5-1`])}天`
  let dragonBoatFestivalStr = `距离端午节还有${calcDay(dragonBoatFestival)}天`
  let midAutumnFestivalStr = `距离中秋节还有${calcDay(midAutumnFestival)}天`
  let nationalDayStr = `距离国庆节还有${calcDay([`${n.getFullYear()}-10-1`,`${n.getFullYear()+1}-10-1`])}天`

  let arr = [
    weekendStr,
    newYearStr,
    chineseNewYearStr,
    tombSweepingDayStr,
    labourDayStr,
    dragonBoatFestivalStr,
    midAutumnFestivalStr,
    nationalDayStr
  ]

  arr.filter(x => x)
  arr.sort((a, b) => (a.match(/\d+/) || 0) -  (b.match(/\d+/) || 0))

  callback(`${n.getMonth()+1}月${n.getDate()}日${timeInfo(n.getHours())}，摸鱼人！工作再累，一定不要忘记摸鱼哦！有事没事起身去茶水间，去厕所，去廊道走走别老在工位上坐着，钱是老板的,但命是自己的\n${arr.join('\n')}\n上班是帮老板赚钱，摸鱼是赚老板的钱！最后，祝愿天下所有摸鱼人，都能愉快的渡过每一天…`)
}

module.exports = {
  tapFish
}
