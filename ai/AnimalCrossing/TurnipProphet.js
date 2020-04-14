const { analyze_possibilities } = require('./core/predictions')
const render = require('./renderImage')

module.exports = function(content, group, type, callback) {
  if(content.trim() == ''){
    help()
    return
  }
  let format = content.replace(/ +/g, ' ').trim().split(' ')
  let sp = format.slice(0, 7), inputArr = []
  for(let i = 0; i < sp.length; i++) {
    // console.log(i)
    if(sp[i] == 'x') {
      if(i == 0) {
        inputArr.push(NaN)
      } else {
        inputArr.push(NaN)
        inputArr.push(NaN)
      }
      continue
    }
    if(i > 0 && /^(\d{1,3}|x)-(\d{1,3}|x)$/.test(sp[i])) {
      let s = sp[i].split('-')
      if(s[0] == 'x') {
        inputArr.push(NaN)
      } else {
        inputArr.push(parseInt(s[0]))
      }
      if(s[1] == 'x') {
        inputArr.push(NaN)
      } else {
        inputArr.push(parseInt(s[1]))
      }
      continue
    }
    if(/^\d{1,3}$/.test(sp[i])){
      if(i == 0) {
        inputArr.push(parseInt(sp[i]))
        inputArr.push(parseInt(sp[i]))
      } else {
        inputArr.push(parseInt(sp[i]))
        inputArr.push(NaN)
      }
      continue
    }
    callback('输入错误')
    return
  }
  let calc = analyze_possibilities(inputArr, false, -1)
  console.log(calc[0])
  render(calc, callback)


}

const help = callback => {
  callback('这是帮助')
}
