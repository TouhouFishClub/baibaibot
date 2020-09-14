// const akc = require('./CoV2020')
const {cov} = require('./CoV2019ByTianApi')
const mc = require('./MorseCode')
const c = m => {
  console.log('===== output =====')
  console.log(m)
}

// chp(c)
cov(
    '硝局的花园',
    c,
    true,
    ['现有女友', '今日新增女友', '确诊女友', '疑似女友', '境外女友'],
    {
      name: '硝局的花园',
      type: 'other',
    },
    {
      confirmedCount: [1, 0],
      curedCount: [2, 0],
      currentConfirmedCount: [3, 0],
      deadCount: [4, 0],
      suspectedCount: [5, 0]
    },
    '硝局的花园',
  )
// setTimeout(() => {
//   mc('adfadfasd/.-./.-./-.-/.-/.../--./.-/--./.-', false, c)
// }, 1)
