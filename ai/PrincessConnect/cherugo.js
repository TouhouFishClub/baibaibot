const iconv = require('iconv-lite')
const _ = require('lodash')
const CHERU_SET = '切卟叮咧哔唎啪啰啵嘭噜噼巴拉蹦铃'
const CHERU_DIC = {}
const baseStr = '切噜～♪'
Array.from(CHERU_SET).forEach((item, index) => (CHERU_DIC[item] = index))

const cherugo = (content, encode, callback) => {
  if(content.trim() === ''){
    help(callback)
    return
  }
  content = content.trim()
  if(encode) {
    let c = ["切"]
    let e = iconv.encode(content, 'gbk')
    for (let s of e) {
      c.push(CHERU_SET[s & 0xf])
      c.push(CHERU_SET[(s >> 4) & 0xf])
    }
    callback(baseStr + c.join(''))
  } else {
    if (!content) return
    content = content.replace(baseStr, '')
		let out = '', chatTmp = '', charSet = new Set(CHERU_SET.split(''))
		content.split('').forEach(ch => {
			if(charSet.has(ch)) {
				chatTmp += ch
			} else {
				if(chatTmp.length) {
					out += decodeTmp(chatTmp)
					chatTmp = ''
				}
				out += ch
			}
		})
		if(chatTmp.length) {
			out += decodeTmp(chatTmp)
		}
		callback(out)
  }
}

const decodeTmp = content => {
	let res = []
	group(Array.from(content).slice(1), '切').forEach(item => {
		let x = CHERU_DIC[item[1]] || 0
		x = x << 4 | CHERU_DIC[item[0]]
		res.push(x)
	})
	return iconv.decode(Buffer.from(res), 'gbk')
}

const group = (arr, fill = '') => {
  if(arr.length % 2 === 1)
    arr.push(fill)
  return _.chunk(arr, 2)
}

const help = callback => {
  callback(`输入切噜一下 进行切噜加密通话。切噜～♪开头做切噜语解密。`)

}

module.exports = {
  cherugo
}
