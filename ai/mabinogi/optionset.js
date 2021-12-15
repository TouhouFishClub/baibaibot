const _ = require('lodash')
const path = require('path')
const formatOptionset = require(path.join(__dirname, '/tools/formatOptionset'))
const { optionsetWhere, optionsetWhereCn, optionsetWhereCnHandler, searchWhereCn } = require(path.join(__dirname, '/tools/optionsetWhere'))
const optionsetImage = require(path.join(__dirname, '/tools/optionsetImage'))
let optionSetObj = []
const adminUser = new Set([
  799018865,
  2810232496
])
let saveTmpMap = {

}

const setOptionsetWhere = (userId, context, callback) => {
  let { LocalName, Level } = saveTmpMap[userId]
  optionsetWhereCnHandler(LocalName, Level, context, callback)
}
const delOptionsetWhere = (userId, callback) => {
  let { LocalName, Level } = saveTmpMap[userId]
  optionsetWhereCnHandler(LocalName, Level, '', callback)
}

module.exports = function(userId, context, type = 'normal', callback) {
  const _initSearch = async () => {
    const maxKeywords = 6, maxSearch = 10
    let ctx = context.trim()
    if(adminUser.has(userId) && saveTmpMap[userId]) {
      if(ctx.startsWith('set')) {
        setOptionsetWhere(userId, context.substr(3).trim(), callback)
        return
      }
      if(ctx.startsWith('del')) {
        delOptionsetWhere(userId, callback)
        return
      }
    }
    if(ctx.startsWith('w')) {
      ctx = ctx.substr(1).trim()
      let searchArr = ctx.replace(/[， ]/g, ',').split(',')
      if(searchArr.length == 0) {
        callback('请输入关键字以查询')
        return
      }
      let searchData = await searchWhereCn(...searchArr)
      if(searchData.length == 0) {
        callback('未找到相关释放卷轴')
        return
      }
      let outputStr = searchData.map(o => {
        let sp = o._id.split('_')
        if(sp.length > 1) {
          return `（${sp[0]}）${sp[1]}`
        } else {
          return o._id
        }
      }).join('，')
      callback(`查找到以下卷轴：\n${outputStr}`)
      return
    }

    if(ctx){
      let searchArr = ctx.replace(/[， ]/g, ',').split(',')
      if(searchArr.length > 0){
        if(searchArr.length < maxKeywords){
          if(searchArr.length === 1 && searchArr[0].indexOf('>') == -1 && searchArr[0].indexOf('<') == -1){
            if(/^\d+$/.test(ctx)){
              searchId(ctx)
            } else {
              searchName(ctx)
            }
          } else {
            searchKeywords(analysisKeywords(searchArr))
          }
        } else {
          callback(`最多仅能使用${maxKeywords}个关键字`)
        }
      } else {
        callback('请输入至少一个查询条件')
      }
    } else {
      callback('【释放查询】\n可使用 opt 或 释放查询 + 关键词搜索\n单关键字为按ID或按名称查询\n多个关键词用逗号隔开，支持接头接尾，释放卷等级，释放属性（负面属性前加-）\n如： opt 4，接头，智力，-修理费\n可使用optw + 关键词查找出处')
    }
  }
  const analysisKeywords = keywords => {
    let keywordObj = {
      debuff: [],
      buff:[]
    }
    keywords.forEach(keyword => {
      keyword = keyword.trim()
      switch(keyword){
        case '练习':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
          if(!keywordObj.Level){
            if(keyword == '练习'){
              keywordObj.Level = 0
            } else {
              keywordObj.Level = parseInt(`0x${keyword}`)
            }
          }
          break
        case '接头':
        case '结头':
          if(!keywordObj.usage){
            keywordObj.usage = 1
          }
          break
        case '接尾':
        case '结尾':
          if(!keywordObj.usage){
            keywordObj.usage = 2
          }
          break
        default:
          if(keyword){
            if(keyword.substr(0, 1) == '-'){
              keywordObj.debuff.push(keyword.substring(1))
            } else {
              keywordObj.buff.push(keyword)
            }
          }
      }
    })
    return keywordObj
  }
  const searchId = id => {
    optionSetObj.forEach(optionset => {
      if(optionset.ID == id){
        renderMsg([optionset])
      }
    })
  }
  const searchName = name => {
    let finalArr = []
    optionSetObj.forEach(optionset => {
      // console.log(optionset)
      if(new RegExp(name).test(optionset.LocalName)){
        finalArr.push(optionset)
      }
    })
    renderMsg(finalArr)
  }
  const searchKeywords = keywords => {
    let finalArr = []
    optionSetObj.forEach(optionset => {
      if(!keywords.Level || (keywords.Level && keywords.Level == optionset.LevelQuery)){
        if(!keywords.usage || (keywords.usage && (keywords.usage - 1) == parseInt(optionset.UsageQuery))){
          let buffCheck = true
          if(keywords.debuff.length){
            keywords.debuff.forEach(debuff => {
              let optCheck = false
              optionset.Debuff.forEach(Debuff => {
              	if(debuff.split('>').length > 1) {
              		let sp = debuff.split('>').map(x => x.trim())
		              if(/\d+/.test(sp[1])) {
		              	let match = Debuff.match(/\d+/g) || []
			              if(
			              	Debuff.match(sp[0]) &&
				              Debuff.match(sp[0]).length &&
				              match.length > 0 &&
				              parseInt(match[match.length - 1]) > parseInt(sp[1])
			              ) {
			              	optCheck = true
			              }
		              } else {
			              if(new RegExp(debuff).test(Debuff)){
				              optCheck = true
			              }
		              }
	              } else if (debuff.split('<').length > 1) {
		              let sp = debuff.split('<').map(x => x.trim())
		              if(/\d+/.test(sp[1])) {
			              let match = Debuff.match(/\d+/g) || []
			              if(
			              	Debuff.match(sp[0]) &&
				              Debuff.match(sp[0]).length &&
				              match.length > 0 &&
				              parseInt(match[0]) < parseInt(sp[1])
			              ) {
				              optCheck = true
			              }
		              } else {
			              if(new RegExp(debuff).test(Debuff)){
				              optCheck = true
			              }
		              }
	              } else {
	                if(new RegExp(debuff).test(Debuff)){
	                  optCheck = true
	                }
	              }
              })
              if(!optCheck){
                buffCheck = false
              }
            })
          }
          if(keywords.buff.length){
            keywords.buff.forEach(buff => {
              let optCheck = false
              optionset.Buff.forEach(Buff => {
	              if(buff.split('>').length > 1) {
		              let sp = buff.split('>').map(x => x.trim())
		              if(/\d+/.test(sp[1])) {
			              let match = Buff.match(/\d+/g) || []
			              if(
			              	Buff.match(sp[0]) &&
				              Buff.match(sp[0]).length &&
				              match.length > 0 &&
				              parseInt(match[match.length - 1]) > parseInt(sp[1])
			              ) {
				              optCheck = true
			              }
		              } else {
			              if(new RegExp(buff).test(Buff)){
				              optCheck = true
			              }
		              }
	              } else if (buff.split('<').length > 1) {
		              let sp = buff.split('<').map(x => x.trim())
		              if(/\d+/.test(sp[1])) {
			              let match = Buff.match(/\d+/g) || []
			              if(
			              	Buff.match(sp[0]) &&
				              Buff.match(sp[0]).length &&
				              match.length > 0 &&
				              parseInt(match[0]) < parseInt(sp[1])
			              ) {
				              optCheck = true
			              }
		              } else {
			              if(new RegExp(buff).test(Buff)){
				              optCheck = true
			              }
		              }
	              } else {
		              if(new RegExp(buff).test(Buff)){
			              optCheck = true
		              }
	              }
                if(new RegExp(buff).test(Buff)){
                  optCheck = true
                }
              })
              if(!optCheck){
                buffCheck = false
              }
            })
          }
          if(buffCheck){
            finalArr.push(optionset)
          }
        }
      }
    })
    renderMsg(finalArr)
  }
  const renderMsg = async finalArr => {
    let str = ''
    if(finalArr.length == 0){
      str = '没有找到释放卷轴'
      callback(str)
    }
    if(finalArr.length == 1){
      if(adminUser.has(userId)) {
        saveTmpMap[userId] = finalArr[0]
      }
    	// console.log(finalArr[0])
      let wheres = [], optionsetInfo = finalArr[0]
	    if(finalArr[0].custom) {
	    	wheres = []
	    } else {
		    wheres = await optionsetWhereCn(finalArr[0].LocalName, finalArr[0].Level)
		    // console.log('=======')
		    // console.log(wheres)
		    if(wheres.length > 0) {
			    optionsetInfo = Object.assign({where: 'CN'}, optionsetInfo)
		    } else {
			    wheres = await optionsetWhere(finalArr[0].Name, finalArr[0].ID)
			    optionsetInfo = Object.assign({where: 'TW'}, optionsetInfo)
		    }
	    }
      if(type == 'image'){
				optionsetImage(optionsetInfo, wheres, 'mabi', str => {
					callback(str)
				})
      } else {
				str = `${finalArr[0].LocalName.trim()}(Rank ${finalArr[0].Level})\n[${finalArr[0].Usage}]\n${finalArr[0].Buff.length ? (finalArr[0].Buff.join('\n') + '\n') : ''}${finalArr[0].Debuff.join('\n')}`
				if(wheres.length){
					// console.log(wheres)
					str += `\n[取得方式]\n${wheres.map(where => `${where.article} → ${where.where}`).join('\n')}`
				}
				callback(str)
      }
    }
    if(finalArr.length > 1){
      str = '查询到复数释放卷，请选择：\n'
      if(finalArr.length <= 10){
        finalArr.forEach(os => {
          str += `opt ${os.ID} | [${os.Usage}]${os.LocalName}(Rank ${os.Level})\n`
        })
      } else {
        for(let i = 0; i < 10; i ++){
          str += `opt ${finalArr[i].ID} | [${finalArr[i].Usage}]${finalArr[i].LocalName}(Rank ${finalArr[i].Level})\n`
        }
        str += `超过搜索限制，请添加更多关键字\nsearch count : ${finalArr.length}`
      }
      callback(str)
    }
  }
  if(!optionSetObj.length){
    console.log('=== init optionset data ===')
    formatOptionset(data => {
      optionSetObj = data
      console.log('=== completed optionset data ===')
      _initSearch()
    })
  } else {
    _initSearch()
  }
}
