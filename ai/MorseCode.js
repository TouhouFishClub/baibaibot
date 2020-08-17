module.exports = function(content, encode, callback) {
  let str = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:,;?='/!-_"()$&@`.split('')
  let code = '.- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.. ----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----. .-.-.- ---... --..-- -.-.-. ..--.. -...- .----. -..-. -.-.-- -....- ..--.- .-..-. -.--. -.--.- ...-..- .-... .--.-.'.split(' ')
  let ns = []
  if(content.trim() == '') {
    callback('输入mc [要编码的字符]编码，或者输入mt [要解码的摩斯密码]解码，解码可以用空格或者/分隔')
    return
  }
  if(encode) {
    let c = content.toUpperCase()
    if(/^[ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:,;?='/!-_"()$&@]+$/.test(c)) {
      c.split('').forEach(s => {
        let index = str.findIndex(x => x == s)
        ns.push(code[index])
      })
      callback(ns.join(' '))
    } else {
      callback('存在未知字符, 无法编码')
    }
  } else {
    let c = content.replace(/ +/g, '/').split('/')
    for(let i = 0; i < c.length; i ++){
      let index = code.findIndex(x => x == c[i])
      if(index >= 0) {
        ns.push(str[index])
      } else {
        callback(`存在未知字符（${c[i]}），无法解码`)
        return
      }
    }
    callback(ns.join(''))
  }
}