const path = require('path-extra')
const { render } = require('./render')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const { searchNameAndFilter } = require('../optionset')
const { getClient } = require('../../../mongo/index')

const help = callback => {
  callback('这是帮助')
}

const createSearchRegexp = async filterStr => {
  const scrolls = [
    '渴望的',
    '盼望的',
    '期盼的',
    '沉没的',
    '消失的',
    '被覆盖的',
    '逃跑的',
    '观望的$',
    '转的',
    '囚禁',
    '不动之',
    '冻结的',
    '兔猿人',
    '极地骷髅战士',
    '极地冰狼',
    '踪迹',
    '轨迹',
    '痕迹',
    '符文猫',
    '斯内塔',
    '冰雪索灵',
    '白桦树',
    '波纹',
    '镜子'
  ]
  const filter = filterStr.trim().substring(1, filterStr.length - 1)
  if (filter) {
    const f = await searchNameAndFilter(new Set(scrolls), filter)
    if (f.length) {
      return f.map(x => `${x}$`).join('|')
    } else {
      return scrolls.map(x => `${x}$`).join('|')
    }
  } else {
    return scrolls.map(x => `${x}$`).join('|')
  }
}

const formatTime = ts => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}

const addZero = n => (n < 10 ? '0' + n : n)

const buildMongoQuery = (whereClause, queryParams) => {
  let mongoQuery = {}

  if (whereClause) {
    const whereStr = whereClause.replace(/^WHERE\s*/i, '')

    // 芙兰队特殊查询模式
    if (whereStr.includes('character_name LIKE') && whereStr.includes('channel =') && whereStr.includes('dungeon_name =')) {
      const namePatterns = ['Fl', '莉丽', '娜兹', 'Sa', '永夜', '温雯', '圣祐', '幽鬼']
      const nameRegex = new RegExp(namePatterns.join('|'), 'i')
      mongoQuery = {
        character_name: nameRegex,
        channel: 10,
        dungeon_name: '格伦贝尔纳'
      }

      if (whereStr.includes('REGEXP')) {
        const rewardRegex = new RegExp(
          '渴望的|盼望的|期盼的|沉没的|消失的|被覆盖的|逃跑的|观望的|转的|囚禁|不动之|冻结的|兔猿人|极地骷髅战士|极地冰狼|踪迹|轨迹|痕迹|符文猫|斯内塔|冰雪索灵|白桦树|波纹|镜子',
          'i'
        )
        mongoQuery.reward = rewardRegex
      }

      if (whereStr.includes('\\\\+1咒语书')) {
        mongoQuery.reward = new RegExp('\\+1咒语书', 'i')
      }
    } else if (whereStr.includes('REGEXP')) {
      // 新卷正则查询
      const rewardRegex = new RegExp(
        '渴望的|盼望的|期盼的|沉没的|消失的|被覆盖的|逃跑的|观望的|转的|囚禁|不动之|冻结的|兔猿人|极地骷髅战士|极地冰狼|踪迹|轨迹|痕迹|符文猫|斯内塔|冰雪索灵|白桦树|波纹|镜子',
        'i'
      )
      mongoQuery.reward = rewardRegex
    } else if (queryParams && queryParams.length > 0) {
      // LIKE 查询
      if (queryParams.length === 1) {
        const searchTerm = queryParams[0].replace(/%/g, '')
        mongoQuery = {
          $or: [
            { reward: new RegExp(searchTerm, 'i') },
            { character_name: new RegExp(searchTerm, 'i') },
            { dungeon_name: new RegExp(searchTerm, 'i') }
          ]
        }
      } else if (queryParams.length === 3 && whereStr.includes('OR')) {
        const searchTerm = queryParams[0].replace(/%/g, '')
        mongoQuery = {
          $or: [
            { reward: new RegExp(searchTerm, 'i') },
            { character_name: new RegExp(searchTerm, 'i') },
            { dungeon_name: new RegExp(searchTerm, 'i') }
          ]
        }
      } else {
        // 多条件 AND（reward-character-dungeon）
        mongoQuery = {}
        queryParams.forEach((param, index) => {
          if (param) {
            const searchTerm = param.replace(/%/g, '')
            if (index === 0) {
              mongoQuery.reward = new RegExp(searchTerm, 'i')
            } else if (index === 1) {
              mongoQuery.character_name = new RegExp(searchTerm, 'i')
            } else if (index === 2) {
              mongoQuery.dungeon_name = new RegExp(searchTerm, 'i')
            }
          }
        })
      }
    }
  }

  return mongoQuery
}

const mabiTelevision = async (content, qq, callback) => {
  const client = await getClient()
  const db = client.db('db_bot')

  const svc = db.collection('cl_mabinogi_user_server')

  let sv = Object.entries({
    ylx: 'ylx',
    伊鲁夏: 'ylx',
    猫服: 'ylx',
    yt: 'yate',
    亚特: 'yate'
  }).find(([key]) => content.startsWith(key))

  if (sv) {
    content = content.substring(sv[0].length).trim()
    sv = sv[1]
    await svc.save({ _id: qq, sv })
  } else {
    const svInfo = await svc.findOne({ _id: qq })
    if (svInfo) {
      sv = svInfo.sv
    } else {
      await svc.save({ _id: qq, sv: 'ylx' })
      sv = 'ylx'
    }
  }

  // 亚特服暂不提供数据
  if (sv === 'yate') {
    callback('亚特区暂无数据，如有意向提供数据请联系百百妈')
    return
  }

  if (content.length > 20 || content.toLowerCase() === 'help' || content === '帮助') {
    help(callback)
    return
  }

  const filter = content.trim()
  let limit = 20
  let queryParams = []
  let whereClause = ''

  if (filter.startsWith('芙兰队')) {
    const namePatterns = ['Fl%', '莉丽%', '娜兹%', 'Sa%', '永夜%', '温雯%', '圣祐%', '幽鬼%']
    const nameConditions = namePatterns.map(() => 'character_name LIKE ?').join(' OR ')
    let teamWhereClause = `WHERE (${nameConditions}) AND channel = ? AND dungeon_name = ? AND (TIME(data_time) >= '20:00:00' OR TIME(data_time) <= '01:00:00')`
    queryParams = [...namePatterns, 10, '格伦贝尔纳']

    if (filter.includes('新卷')) {
      const regStr = await createSearchRegexp('新卷')
      teamWhereClause += ` AND reward REGEXP '${regStr}'`
    }
    if (filter.includes('+1卷')) {
      teamWhereClause += ` AND reward REGEXP '\\\\+1咒语书'`
    }

    whereClause = teamWhereClause
    limit = 50
  } else if (filter.length) {
    if (filter.indexOf('-') > -1) {
      const sp = filter.split('-')
      const [rewordFilter, nameFilter, dungeonFilter] = sp
      if (rewordFilter || nameFilter || dungeonFilter) {
        let rewordSql = ' reward LIKE ?'
        if (/^新.*卷$/.test(sp[0])) {
          const regStr = await createSearchRegexp(sp[0])
          rewordSql = ` reward REGEXP '${regStr}'`
        }
        whereClause = `WHERE${sp
          .map((x, i) => x && [rewordSql, ' character_name LIKE ?', ' dungeon_name LIKE ?'][i])
          .filter(x => x)
          .join(' AND')}`
        queryParams = sp.map(x => x && `%${x}%`).filter(x => x && !(x.startsWith('%新') && x.endsWith('卷%')))
      }
    } else {
      if (/^新.*卷$/.test(filter)) {
        const regStr = await createSearchRegexp(filter)
        whereClause = `WHERE reward REGEXP '${regStr}'`
      } else {
        whereClause = `WHERE reward LIKE ? OR character_name LIKE ? OR dungeon_name LIKE ?`
        queryParams = [`%${filter}%`, `%${filter}%`, `%${filter}%`]
      }
    }
  }

  const collectionName = `cl_mbtv_${sv}`
  const col = db.collection(collectionName)

  const mongoQuery = buildMongoQuery(whereClause, queryParams)

  // 兼容旧版 mongodb 驱动，使用 count 而不是 countDocuments
  const total = await col.count(mongoQuery)
  const docs = await col
    .find(mongoQuery)
    .sort({ ts: -1 })
    .limit(limit)
    .toArray()

  const finalResults = docs.map(doc => ({
    character_name: doc.character_name,
    reward: doc.reward,
    dungeon_name: doc.dungeon_name,
    channel: doc.channel,
    data_time: doc.time || new Date(doc.ts)
  }))

  const outputDir = path.join(IMAGE_DATA, 'mabi_other', `MabiTV.png`)

  await render(finalResults, {
    title: `出货记录查询：${{ ylx: '猫服', yate: '亚特' }[sv]}`,
    description: `(MongoDB 总数: ${total})`,
    output: outputDir,
    columns: [
      {
        label: '角色名称',
        key: 'character_name'
      },
      {
        label: '物品名称',
        key: 'reward'
      },
      {
        label: '地下城名称',
        key: 'dungeon_name'
      },
      {
        label: '时间',
        key: 'data_time',
        format: time => formatTime(new Date(time).getTime())
      },
      {
        label: '频道',
        key: 'channel'
      }
    ]
  })

  const imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `MabiTV.png`)}]`
  callback(imgMsg)
}

module.exports = {
  mabiTelevision
}

