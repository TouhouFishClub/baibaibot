const combination = (arr, len, isCombination = false) => {
  if(arr.length < len) throw new RangeError
  if(len < 1) throw new RangeError
  if(!len) {
    len = arr.length
    isCombination = true
  }
  if(arr.length > 10) throw new RangeError
  let out = []
  if(len === 1){
    return arr
  } else {
    let back
    if(isCombination) {
      for(let i = 0; i < arr.length; i ++) {
        back = combination(arr.slice(0, i).concat(arr.slice(i + 1)), len - 1, isCombination)
        back.forEach(ele => out.push([arr[i]].concat(ele)))
      }
    } else {
      for(let i = 0; i <= arr.length - len; i ++) {
        back = combination(arr.slice(i + 1), len - 1, isCombination)
        back.forEach(ele => out.push([arr[i]].concat(ele)))
      }
    }
    return out
  }
}
module.exports = {
  combination
}