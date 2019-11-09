const _ = require('lodash')
const GAIN = {
  6: 10000,
  7: 36,
  8: 720,
  9: 360,
  10: 80,
  11: 252,
  12: 108,
  13: 72,
  14: 54,
  15: 180,
  16: 72,
  17: 180,
  18: 119,
  19: 36,
  20: 306,
  21: 1080,
  22: 144,
  23: 1800,
  24: 3600
}
const ROWS = [
  [3, 5, 7],
  [3, 6, 9],
  [2, 5, 8],
  [1, 4, 7],
  [1, 5, 9],
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]
const C5_3 = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 1, 4],
  [0, 2, 3],
  [0, 2, 4],
  [0, 3, 4],
  [1, 2, 3],
  [1, 2, 4],
  [1, 3, 4],
  [2, 3, 4],
]
const C5_2 = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4]
]
const ROWTAG = {
  0: '↙',
  1: '↓ 右1',
  2: '↓ 右2',
  3: '↓ 右3',
  4: '↘',
  5: '→ 上1',
  6: '→ 上2',
  7: '→ 上3'
}
const PerfectCactpot = (content, callback, details = false) => {
  if(content[0] && content[0].toLowerCase() == 'a') {
    details = true
    content = content.substr(1)
  }
  let c = content.trim().toLowerCase().replace(/[\n ]/g, '')
  if(/[\d|x]{9}/.test(c) && c.split('').length == 9 && Array.from(new Set(c.replace(/[x|0]/g, ''))).length == 4) {
    let input = c.split('').map(c => c == 'x' ? 0: parseInt(c)),
      unknown = _.xor([0,1,2,3,4,5,6,7,8,9], Array.from(new Set(input))),
      output = []
    // console.log(input)
    // console.log(unknown)
    input.unshift(0)

    ROWS.forEach((row, index) => {
      // console.log(`==== ${index} ====`)
      output.push(Object.assign({index: index}, compute([input[row[0]], input[row[1]], input[row[2]]], unknown)))
    })
    let str
    if(details) {
      str = output.map((out, index) => `${ROWTAG[index]}\t 平均：${(out.sum / out.count).toFixed(1)}   最大：${out.max}(${(out.maxCount / out.count * 100).toFixed(0)}%)   最小：${out.min}(${(out.minCount / out.count * 100).toFixed(0)}%)`).join('\n')
    } else {
      str = output.map((out, index) => `${ROWTAG[index]}\t ${(out.sum / out.count).toFixed(1)}`).join('\n')
    }
    callback(str)
  } else {
    if(content.trim()){
      callback('输入错误')
    } else {
      callback(`输入ffc + 数字布局查询，数字布局如：\nx1x\n4x7\nx3x\n未知数字可以用0或者大小写X表示，ffca则查看详情`)
    }
  }
}

const mixinObject = (obj, tmp) => {
  obj.sum += tmp
  obj.count ++
  if(obj.max < tmp) {
    obj.max = tmp
    obj.maxCount = 1
  } else if(obj.max == tmp) {
    obj.maxCount ++
  }
  if(obj.min > tmp) {
    obj.min = tmp
    obj.minCount = 1
  } else if(obj.min == tmp) {
    obj.minCount ++
  }
  return obj
}

const compute = (rowArr, unknownArr) => {
  let obj = {
    sum: 0,
    count: 0,
    max: 0,
    maxCount: 0,
    min: 10000,
    minCount: 0,
  },
    hasNumArr = rowArr.filter(d => d >= 1),
    type = hasNumArr.length,
    sum = hasNumArr.reduce((p, e) => p + e, 0)
  // console.log(`=====> ${type}`)
  switch(type) {
    case 0:
      C5_3.forEach(indexArr => {
        let tmp = GAIN[unknownArr[indexArr[0]] + unknownArr[indexArr[1]] + unknownArr[indexArr[2]]]
        obj = mixinObject(obj, tmp)
      })
      break
    case 1:
      C5_2.forEach(indexArr => {
        let tmp = GAIN[unknownArr[indexArr[0]] + unknownArr[indexArr[1]] + hasNumArr[0]]
        obj = mixinObject(obj, tmp)
      })
      break
    case 2:
      unknownArr.forEach(un => {
        let tmp = GAIN[sum + un]
        obj = mixinObject(obj, tmp)
      })
      break
    case 3:
      let out = GAIN[sum]
      obj.sum = out
      obj.count = 1
      obj.max = out
      obj.maxCount = 1
      obj.min = out
      obj.minCount = 1
      break
  }
  return obj
}

module.exports = {
  PerfectCactpot
}