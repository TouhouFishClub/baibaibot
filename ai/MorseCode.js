const iconv = require("iconv-lite");

const str = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:,;?='/!-_"()$&@`.split('')
const mcode = '.- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.. ----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----. .-.-.- ---... --..-- -.-.-. ..--.. -...- .----. -..-. -.-.-- -....- ..--.- .-..-. -.--. -.--.- ...-..- .-... .--.-.'.split(' ')
const encode = char => {
	let index = str.findIndex(x => x == char)
	if(index > -1) {
		return mcode[index]
	}
	return false
}

const decode = code => {
	let index = mcode.findIndex(x => x == code)
	if(index > -1) {
		return str[index]
	}
	return false
}

const encodeZhs = char => {
	return char.charCodeAt(0).toString(2).split('').map(x => x == '0' ? '.' : '-').join('')
}

const fixLength = str => {
	if(str.length < 4) {
		return `${new Array(4 - str.length).fill('0').join('')}${str}`
	}
	return str
}
const decodeZhs = code => {
	return unescape(`%u${fixLength(parseInt(code.split('').map(x => x == '.' ? '0' : '1').join(''), 2).toString(16))}`)
}

const encodeZhsByUnicode = char => {
	return char.charCodeAt(0).toString(16).split('').map(x => encode(x.toUpperCase())).join(' ')
}

const decodeZhsByUnicode = code => {
	let cg = code.split(' ').map(sc => decode(sc))
	if(cg.filter(x => x).length == cg.length) {
		return unescape(`%u${cg.join('')}`)
	}
	return false
}

const morse = (content, isEncode, callback) => {
	let ns = []
	if(content.trim() == '') {
		callback('输入rmc [要编码的字符]编码，或者输入rmct [要解码的摩斯密码]解码，解码可以用空格或者/分隔')
		return
	}
	if(isEncode) {
		let c = content.toUpperCase(), toUnicode = false
		if(c.startsWith('U')) {
			toUnicode = true
			c = c.substring(1)
		}
		c.split('').forEach(s => {
			if(/^[ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:,;?='/!-_"()$&@]+$/.test(s)) {
				ns.push(encode(s))
			} else {
				if(toUnicode) {
					ns.push(encodeZhsByUnicode(s))
				} else {
					ns.push(encodeZhs(s))
				}
			}
		})
		callback(`\\${ns.join('\\')}`)
	} else {
		let c = content.replace(/\//g, '\\').split('\\').filter(x => x)
		for(let i = 0; i < c.length; i ++){
			if(decode(c[i])) {
				ns.push(c[i])
				continue
			}
			if(c[i].split(' ').length > 0 && decodeZhsByUnicode(c[i])) {
				ns.push(decodeZhsByUnicode(c[i]))
				continue
			}
			if(decodeZhs(c[i])) {
				ns.push(decodeZhs(c[i]))
				continue
			}
			callback(`存在未知字符（${c[i]}），无法解码`)
			return
		}
		callback(ns.join(''))
	}
}

module.exports = {
	morse
}