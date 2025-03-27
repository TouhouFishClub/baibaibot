const _ = require('lodash')
const path = require('path')
const formatOptionset = require(path.join(__dirname, '/tools/formatOptionset'))
const { optionsetWhere, optionsetWhereCn, optionsetWhereCnHandler, searchWhereCn } = require(path.join(__dirname, '/tools/optionsetWhere'))
const optionsetImage = require(path.join(__dirname, '/tools/optionsetImage'))
const { optionsetHtmlImage } = require('./tools/optionsetHtmlImage')
const { drawTxtImage } = require('../../cq/drawImageBytxt')

// 配置
const CONFIG = {
  MAX_KEYWORDS: 6,
  MAX_SEARCH_RESULTS: 10,
  ADMIN_USERS: new Set([
    799018865,
    2810232496,
    540540678,
    782804214,
  ])
}

// 数据存储
class OptionsetStore {
  constructor() {
    this.optionsetObj = []
    this.saveTmpMap = {}
  }

  async loadData() {
    return new Promise((resolve) => {
      formatOptionset(data => {
        this.optionsetObj = data
        resolve()
      })
    })
  }

  getOptionsetById(id) {
    return this.optionsetObj.find(opt => opt.ID === id)
  }

  searchByName(name) {
    const regex = new RegExp(name)
    return this.optionsetObj.filter(opt => 
      regex.test(opt.LocalName) || regex.test(opt.LocalName2)
    )
  }

  searchByKeywords(keywords) {
    return this.optionsetObj.filter(opt => this._matchKeywords(opt, keywords))
  }

  _matchKeywords(opt, keywords) {
    // 等级匹配
    if (keywords.Level && keywords.Level !== opt.LevelQuery) {
      return false
    }

    // 使用类型匹配
    if (keywords.usage && (keywords.usage - 1) !== parseInt(opt.UsageQuery)) {
      return false
    }

    // 负面效果匹配
    if (keywords.debuff.length) {
      for (const debuff of keywords.debuff) {
        if (!this._matchDebuff(opt.Debuff, debuff)) {
          return false
        }
      }
    }

    // 正面效果匹配
    if (keywords.buff.length) {
      for (const buff of keywords.buff) {
        if (!this._matchBuff(opt.Buff, buff)) {
          return false
        }
      }
    }

    return true
  }

  _matchDebuff(debuffs, target) {
    return debuffs.some(debuff => this._matchEffect(debuff, target))
  }

  _matchBuff(buffs, target) {
    return buffs.some(buff => this._matchEffect(buff, target))
  }

  _matchEffect(effect, target) {
    if (target.includes('>')) {
      const [attr, value] = target.split('>').map(x => x.trim())
      const matches = effect.match(/\d+/g) || []
      return effect.match(attr) && matches.length > 0 && 
             parseInt(matches[matches.length - 1]) > parseInt(value)
    }
    if (target.includes('<')) {
      const [attr, value] = target.split('<').map(x => x.trim())
      const matches = effect.match(/\d+/g) || []
      return effect.match(attr) && matches.length > 0 && 
             parseInt(matches[0]) < parseInt(value)
    }
    return new RegExp(target).test(effect)
  }
}

// 搜索处理器
class SearchHandler {
  constructor(store) {
    this.store = store
  }

  async handleSearch(userId, nickname, context, type = 'normal', callback) {
    const ctx = context.trim()
    
    // 处理管理员命令
    if (CONFIG.ADMIN_USERS.has(userId) && this.store.saveTmpMap[userId]) {
      await this._handleAdminCommands(userId, nickname, ctx, callback)
      return
    }

    // 处理where查询
    if (ctx.startsWith('w')) {
      await this._handleWhereSearch(ctx, callback)
      return
    }

    // 处理普通搜索
    if (ctx) {
      await this._handleNormalSearch(ctx, type, callback)
    } else {
      this._showHelp(callback)
    }
  }

  async _handleAdminCommands(userId, nickname, ctx, callback) {
    const { LocalName, Level } = this.store.saveTmpMap[userId]
    
    if (ctx.startsWith('set')) {
      optionsetWhereCnHandler('set', nickname, LocalName, Level, ctx.substr(3).trim(), callback, this.store.saveTmpMap[userId])
    } else if (ctx.startsWith('add')) {
      optionsetWhereCnHandler('add', nickname, LocalName, Level, ctx.substr(3).trim(), callback, this.store.saveTmpMap[userId])
    } else if (ctx.startsWith('remove')) {
      optionsetWhereCnHandler('remove', nickname, LocalName, Level, ctx.substr(6).trim(), callback, this.store.saveTmpMap[userId])
    } else if (ctx.startsWith('del')) {
      optionsetWhereCnHandler('del', nickname, LocalName, Level, '', callback, this.store.saveTmpMap[userId])
    }
  }

  async _handleWhereSearch(ctx, callback) {
    const searchArr = ctx.substr(1).trim().replace(/[， ]/g, ',').split(',').filter(x => x)
    
    if (searchArr.length === 0) {
      callback('请输入关键字以查询')
      return
    }

    const searchData = await searchWhereCn(...searchArr)
    if (searchData.length === 0) {
      callback('未找到相关释放卷轴')
      return
    }

    this._renderWhereSearchResults(searchData, callback)
  }

  _renderWhereSearchResults(searchData, callback) {
    searchData.sort((a, b) => {
      const getLevel = (level) => parseInt(`0x${level}`) > 9 ? 10 - parseInt(`0x${level}`) : (10 - (parseInt(`0x${level}`) || 20))
      return getLevel(a.level) - getLevel(b.level)
    })

    const outputStr = searchData.map(o => {
      const sp = o._id.split('_')
      if (sp.length > 1) {
        return `(${o.Usage === '1' ? '接尾' : '接头'} Rank: ${sp[1]})${sp[0]}`
      }
      return o._id
    })

    if (outputStr.length <= 20) {
      callback(`查找到以下卷轴：\n${outputStr.join('\n')}`)
    } else {
      drawTxtImage(`查找到以下卷轴：`, `${outputStr.join('\n')}`, callback, {color: 'black', font: 'STXIHEI.TTF'})
    }
  }

  async _handleNormalSearch(ctx, type, callback) {
    const searchArr = ctx.replace(/[， ]/g, ',').split(',')
    
    if (searchArr.length === 0) {
      callback('请输入至少一个查询条件')
      return
    }

    if (searchArr.length > CONFIG.MAX_KEYWORDS) {
      callback(`最多仅能使用${CONFIG.MAX_KEYWORDS}个关键字`)
      return
    }

    if (searchArr.length === 1 && !searchArr[0].includes('>') && !searchArr[0].includes('<')) {
      if (/^\d+$/.test(ctx)) {
        this._searchById(ctx, type, callback)
      } else {
        this._searchByName(ctx, type, callback)
      }
    } else {
      this._searchByKeywords(this._parseKeywords(searchArr), type, callback)
    }
  }

  _parseKeywords(keywords) {
    const result = {
      debuff: [],
      buff: [],
      buffIgnore: []
    }

    for (const keyword of keywords) {
      const trimmed = keyword.trim()
      
      if (['练习', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'A', 'B', 'C', 'D', 'E', 'F'].includes(trimmed)) {
        if (!result.Level) {
          result.Level = trimmed === '练习' ? 16 : parseInt(`0x${trimmed}`)
        }
        continue
      }

      if (['接头', '结头'].includes(trimmed)) {
        if (!result.usage) result.usage = 1
        continue
      }

      if (['接尾', '结尾'].includes(trimmed)) {
        if (!result.usage) result.usage = 2
        continue
      }

      if (trimmed) {
        if (trimmed.startsWith('-')) {
          result.debuff.push(trimmed.substring(1))
        } else if (trimmed.startsWith('!') || trimmed.startsWith('！')) {
          result.buffIgnore.push(trimmed.substring(1))
        } else {
          result.buff.push(trimmed)
        }
      }
    }

    return result
  }

  async _searchById(id, type, callback) {
    const result = this.store.getOptionsetById(id)
    if (result) {
      await this._renderResult([result], type, callback)
    } else {
      callback('没有找到释放卷轴')
    }
  }

  async _searchByName(name, type, callback) {
    const results = this.store.searchByName(name)
    await this._renderResult(results, type, callback)
  }

  async _searchByKeywords(keywords, type, callback) {
    const results = this.store.searchByKeywords(keywords)
    await this._renderResult(results, type, callback)
  }

  async _renderResult(results, type, callback) {
    if (results.length === 0) {
      callback('没有找到释放卷轴')
      return
    }

    if (results.length === 1) {
      await this._renderSingleResult(results[0], type, callback)
      return
    }

    await this._renderMultipleResults(results, type, callback)
  }

  async _renderSingleResult(result, type, callback) {
    let wheres = []
    let optionsetInfo = result

    if (!result.custom) {
      wheres = await optionsetWhereCn(result.LocalName, result.Level)
      if (wheres.length > 0) {
        optionsetInfo = { ...result, where: 'CN' }
      } else {
        wheres = await optionsetWhere(result.Name, result.ID)
        optionsetInfo = { ...result, where: 'TW' }
      }
    }

    switch (type) {
      case 'image':
        optionsetImage(optionsetInfo, wheres, 'mabi', callback)
        break
      case 'html':
        optionsetHtmlImage(optionsetInfo, wheres, callback)
        break
      default:
        this._renderTextResult(optionsetInfo, wheres, callback)
    }
  }

  _renderTextResult(info, wheres, callback) {
    let str = `${info.LocalName.trim()}(Rank ${info.Level})\n[${info.Usage}]\n`
    str += info.Buff.length ? `${info.Buff.join('\n')}\n` : ''
    str += info.Debuff.join('\n')
    
    if (wheres.length) {
      str += `\n[取得方式]\n${wheres.map(where => `${where.article} → ${where.where}`).join('\n')}`
    }
    
    callback(str)
  }

  async _renderMultipleResults(results, type, callback) {
    let str = '查询到复数释放卷，请选择：\n'
    
    if (results.length <= CONFIG.MAX_SEARCH_RESULTS) {
      results.forEach(os => {
        str += `opt ${os.ID} | [${os.Usage}]${os.LocalName}(Rank ${os.Level})\n`
      })
    } else {
      for (let i = 0; i < CONFIG.MAX_SEARCH_RESULTS; i++) {
        str += `opt ${results[i].ID} | [${results[i].Usage}]${results[i].LocalName}(Rank ${results[i].Level})\n`
      }
      str += `超过搜索限制，请添加更多关键字\nsearch count : ${results.length}\n`
    }
    
    callback(str)
  }

  _showHelp(callback) {
    callback('【释放查询】\n可使用 opt 或 释放查询 + 关键词搜索\n单关键字为按ID或按名称查询\n多个关键词用逗号隔开，支持接头接尾，释放卷等级，释放属性（负面属性前加-）\n如： opt 4，接头，智力，-修理费\n可使用optw + 关键词查找出处')
  }
}

// 初始化
const store = new OptionsetStore()
const searchHandler = new SearchHandler(store)

// 导出接口
const op = async (userId, nickname, context, type = 'normal', callback) => {
  if (!store.optionsetObj.length) {
    console.log('=== init optionset data ===')
    await store.loadData()
    console.log('=== completed optionset data ===')
  }
  await searchHandler.handleSearch(userId, nickname, context, type, callback)
}

const searchNameAndFilter = async (namesSet, filterStr) => {
  if (store.optionsetObj.length === 0) {
    await store.loadData()
  }
  return store.optionsetObj
    .filter(opt => (namesSet.has(opt.LocalName) || namesSet.has(opt.LocalName2)) && 
                   opt.Buff.join(',').match(filterStr))
    .map(x => x.LocalName)
}

module.exports = {
  op,
  searchNameAndFilter
}
