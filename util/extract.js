module.exports = function(str, start, end, hasTarget = true){
  if(start && start.length){
    if(str.indexOf(start) < 0){
      return str
    }
    let strTmp = str.substring(str.indexOf(start) + (hasTarget ? 0 : start.length))
    if(end && end.length){
      if(strTmp.indexOf(end) > -1){
        return strTmp.substring(0, strTmp.indexOf(end) + (hasTarget ? end.length : 0))
      } else {
        return strTmp
      }
    } else {
      return strTmp
    }
  } else {
    if(end && end.length){
      if(str.indexOf(end) > -1){
        return str.substring(0, str.indexOf(end) + (hasTarget ? end.length : 0))
      } else {
        return str
      }
    } else {
      return str
    }
  }
}