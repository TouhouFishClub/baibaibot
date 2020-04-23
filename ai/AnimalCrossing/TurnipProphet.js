const { exportCalc } = require('./core/predictions')
const render = require('./renderImage')
const { getUserDTCInfo } = require('./priceRecord')

// const testJson = { "_id" : 357474405, "gid" : [ 205700800, 221698514, 102135023 ], "d" : { "18369" : { "p0" : 121, "p1" : 109 }, "18370" : { "p0" : 71, "p1" : 0 }, "18371" : { "p0" : 97, "p1" : 0 }, "18372" : { "p0" : 54, "p1" : 50 }, "18373" : { "p0" : 44, "p1" : 0 } }, "tz" : 16 }

const help = callback => {
  callback('这是帮助')
}

const formatSaveData = (data, qq, type, callback) => {
  let d = data.d

  var tz = 16;
  if(typeof data.tz == 'number') {
    tz = data.tz
  }

  var now = new Date();
  var fixnow = new Date(now.getTime()+(tz-16)*1800000);
  var day = Math.floor(fixnow.getTime()/86400000);

  var pd = (day+4)%7;


  let outArr = []
  for(var i=pd;i>=0;i--){
    if(i == pd) {
      if(d[day - i]){
        outArr.push(d[day - i].p0 || NaN)
        outArr.push(d[day - i].p0 || NaN)
      } else {
        outArr.push(NaN)
        outArr.push(NaN)
      }
    } else {
      if(d[day - i]){
        outArr.push(d[day - i].p0 || NaN)
        outArr.push(d[day - i].p1 || NaN)
      } else {
        outArr.push(NaN)
        outArr.push(NaN)
      }
    }
  }
  let calc = exportCalc(outArr, false, -1)
  render(calc, qq, outArr, type, false, callback)
}

const findSaveData = (qq, type, callback) => {
  getUserDTCInfo(qq, data => {
    if(data && data.d) {
      formatSaveData(data, qq, type, callback)
    } else {
      help(callback)
    }
  })
}

function actp(content, qq, group, type = -1, callback, isFirst = false) {
  if(content.trim() == ''){
    findSaveData(qq, type, callback)
    // formatSaveData(testJson, type, callback)
    // help(callback)
    return
  }
  let format = content.toLowerCase().replace(/ +/g, ' ').trim().split(' ')
  let sp = format.slice(0, 7), inputArr = []
  for(let i = 0; i < sp.length; i++) {
    // console.log(i)
    if(sp[i] == 'x') {
      inputArr.push(NaN)
      inputArr.push(NaN)
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

  let calc = exportCalc(inputArr.concat([]), isFirst, type)
  render(calc, qq, inputArr, type, isFirst, callback)

}

module.exports={
  actp
}
