const _ = require('lodash')
const path = require('path')
const formatOptionset = require(path.join(__dirname, '/tools/formatOptionset'))
const { optionsetWhere, optionsetWhereCn, optionsetWhereCnHandler, searchWhereCn } = require(path.join(__dirname, '/tools/optionsetWhere'))
const optionsetImage = require(path.join(__dirname, '/tools/optionsetImage'))
const { optionsetHtmlImage } = require('./tools/optionsetHtmlImage')
const { drawTxtImage } = require('../../cq/drawImageBytxt')

let optionSetObj = []
const adminUser = new Set([
  799018865,
  2810232496,
  540540678,
  782804214,
])
let saveTmpMap = {

}

const setOptionsetWhere = (userId, author, context, callback) => {
  let { LocalName, Level } = saveTmpMap[userId]
  optionsetWhereCnHandler('set', author, LocalName, Level, context, callback, saveTmpMap[userId])
}
const addOptionsetWhere = (userId, author, context, callback) => {
  let { LocalName, Level } = saveTmpMap[userId]
  optionsetWhereCnHandler('add', author, LocalName, Level, context, callback, saveTmpMap[userId])
}
const removeOptionsetWhere = (userId, author, context, callback) => {
  let { LocalName, Level } = saveTmpMap[userId]
  optionsetWhereCnHandler('remove', author, LocalName, Level, context, callback, saveTmpMap[userId])
}
const delOptionsetWhere = (userId, author, callback) => {
  let { LocalName, Level } = saveTmpMap[userId]
  optionsetWhereCnHandler('del', author, LocalName, Level, '', callback, saveTmpMap[userId])
}

const loadOptionset = () => new Promise((resolve, reject) => {
  op(1,'1','白桦树','normal',() => {
    resolve()
  })
})

const searchNameAndFilter = async (namesSet, filterStr) => {
  if(optionSetObj.length == 0) {
    await loadOptionset()
  }
  return optionSetObj.filter(opt => (namesSet.has(opt.LocalName) || namesSet.has(opt.LocalName2)) && opt.Buff.join(',').match(filterStr)).map(x => x.LocalName)
}

const op = function(userId, nickname, context, type = 'normal', callback) {
  // console.log('\n====================\n\n\n\n\n\n\n\n\n')
  // console.log(userId)
  // console.log(context)
  // console.log(type)
  // console.log('\n\n\n\n\n\n\n\n\n====================\n')



  const _initSearch = async () => {
    const maxKeywords = 6, maxSearch = 10
    let ctx = context.trim()
    if(adminUser.has(userId) && saveTmpMap[userId]) {
      if(ctx.startsWith('set')) {
        setOptionsetWhere(userId, nickname, context.substr(3).trim(), callback)
        return
      }
      if(ctx.startsWith('add')) {
        addOptionsetWhere(userId, nickname, context.substr(3).trim(), callback)
        return
      }
      if(ctx.startsWith('remove')) {
        removeOptionsetWhere(userId, nickname, context.substr(6).trim(), callback)
        return
      }
      if(ctx.startsWith('del')) {
        delOptionsetWhere(userId, nickname, callback)
        return
      }
    }
    if(ctx.startsWith('w')) {
      ctx = ctx.substr(1).trim()
      let searchArr = ctx.replace(/[， ]/g, ',').split(',').filter(x => x)
      if(searchArr.length == 0) {
        callback('请输入关键字以查询')
        return
      }
      let searchData = await searchWhereCn(...searchArr)
      if(searchData.length == 0) {
        callback('未找到相关释放卷轴')
        return
      }
      searchData.sort((a, b) => (parseInt(`0x${a.level}`) > 9 ? 10 - parseInt(`0x${a.level}`) : (10 - (parseInt(`0x${a.level}`) || 20))) - (parseInt(`0x${b.level}`) > 9 ? 10 - parseInt(`0x${b.level}`) : (10 - (parseInt(`0x${b.level}`) || 20))))
      let outputStr = searchData.map(o => {
        let sp = o._id.split('_')
        if(sp.length > 1) {
          return `(${o.Usage == '1' ? '接尾': '接头'} Rank: ${sp[1]})${sp[0]}`
        } else {
          return o._id
        }
      })
      if(outputStr.length <= 20) {
        callback(`查找到以下卷轴：\n${outputStr.join('\n')}`)
      } else {
        drawTxtImage(`查找到以下卷轴：`, `${outputStr.join('\n')}`, callback, {color: 'black', font: 'STXIHEI.TTF'})
      }
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
      buff:[],
      buffIgnore: []
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
              keywordObj.Level = 16
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
            } else if(keyword.startsWith('!') || keyword.startsWith('！') ) {
              keywordObj.buffIgnore.push(keyword.substring(1))
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
      if(new RegExp(name).test(optionset.LocalName) || new RegExp(name).test(optionset.LocalName2)){
        finalArr.push(optionset)
      }
    })
    renderMsg(finalArr, name)
  }
  const searchKeywords = keywords => {
    let finalArr = [], optSetObjFilter = optionSetObj.concat([])
    /* pretreatment */
    if(keywords.buff.indexOf('手') > -1) {
      keywords.buffIgnore.push('手里剑', '武器', '手工艺')
    }
    /* ignore buff */
    if(keywords.buffIgnore.length) {
      keywords.buffIgnore.forEach(ignore => {
        optSetObjFilter = optSetObjFilter.filter(opt => !opt.BuffStr.match(ignore))
      })
    }
    optSetObjFilter.forEach(optionset => {
      if(!(typeof keywords.Level == 'number') || (keywords.Level && keywords.Level == optionset.LevelQuery)){
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
  const renderMsg = async (finalArr, targetName) => {
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
      switch(type) {
        case 'image':
          optionsetImage(optionsetInfo, wheres, 'mabi', str => {
            callback(str)
          })
          break
        case 'html':
          optionsetHtmlImage(optionsetInfo, wheres, str => {
            callback(str)
          })
          break
        default:
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
      let target
      if(finalArr.length <= 10){
        finalArr.forEach(os => {
          if(targetName && (os.LocalName == targetName || os.LocalName2 == targetName)) {
            target = os
          }
          str += `opt ${os.ID} | [${os.Usage}]${os.LocalName}(Rank ${os.Level})\n`
        })
      } else {
        for(let i = 0; i < 10; i ++){
          if(targetName && (finalArr[i].LocalName == targetName || finalArr[i].LocalName2 == targetName )) {
            target = finalArr[i]
          }
          str += `opt ${finalArr[i].ID} | [${finalArr[i].Usage}]${finalArr[i].LocalName}(Rank ${finalArr[i].Level})\n`
        }
        str += `超过搜索限制，请添加更多关键字\nsearch count : ${finalArr.length}\n`
      }
      if(target) {
        str += `已为您定位到${target.LocalName}\n`
        if(adminUser.has(userId)) {
          saveTmpMap[userId] = target
        }
        let wheres = [], optionsetInfo = target
        if(optionsetInfo.custom) {
          wheres = []
        } else {
          wheres = await optionsetWhereCn(optionsetInfo.LocalName, optionsetInfo.Level)
          if(wheres.length > 0) {
            optionsetInfo = Object.assign({where: 'CN'}, optionsetInfo)
          } else {
            wheres = await optionsetWhere(optionsetInfo.Name, optionsetInfo.ID)
            optionsetInfo = Object.assign({where: 'TW'}, optionsetInfo)
          }
        }
        switch (type) {
          case 'image':
            optionsetImage(optionsetInfo, wheres, 'mabi', callbackStr => {
              callback(str + callbackStr)
            })
            break
          case 'html':
            optionsetHtmlImage(optionsetInfo, wheres, 'mabi', callbackStr => {
              callback(str + callbackStr)
            })
            break
          default:
            str += `${finalArr[0].LocalName.trim()}(Rank ${optionsetInfo.Level})\n[${optionsetInfo.Usage}]\n${optionsetInfo.Buff.length ? (optionsetInfo.Buff.join('\n') + '\n') : ''}${optionsetInfo.Debuff.join('\n')}`
            if(wheres.length){
              // console.log(wheres)
              str += `\n[取得方式]\n${wheres.map(where => `${where.article} → ${where.where}`).join('\n')}`
            }
            callback(str)
        }
      } else {
        callback(str)
      }
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
module.exports = {
  op,
  searchNameAndFilter
}
