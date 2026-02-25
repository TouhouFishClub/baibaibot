const path = require('path-extra')
const { render } = require('./render')
const { IMAGE_DATA } = require('../../../baibaiConfigs')
const { getClient } = require('../../../mongo/index')

const help = callback => {
  callback('这是帮助')
}

const formatTime = ts => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}

const addZero = n => (n < 10 ? '0' + n : n)

const buildMongoQuery = (whereClause, queryParams) => {
  let mongoQuery = {}

  if (whereClause && queryParams && queryParams.length > 0) {
    const whereStr = whereClause.replace(/^WHERE\s*/i, '')

    if (queryParams.length === 1) {
      const searchTerm = queryParams[0].replace(/%/g, '')
      mongoQuery = {
        $or: [
          { item_name: new RegExp(searchTerm, 'i') },
          { character_name: new RegExp(searchTerm, 'i') }
        ]
      }
    } else if (queryParams.length === 2 && whereStr.includes('OR')) {
      const searchTerm = queryParams[0].replace(/%/g, '')
      mongoQuery = {
        $or: [
          { item_name: new RegExp(searchTerm, 'i') },
          { character_name: new RegExp(searchTerm, 'i') }
        ]
      }
    } else {
      mongoQuery = {}
      queryParams.forEach((param, index) => {
        if (param) {
          const searchTerm = param.replace(/%/g, '')
          if (index === 0) {
            mongoQuery.item_name = new RegExp(searchTerm, 'i')
          } else if (index === 1) {
            mongoQuery.character_name = new RegExp(searchTerm, 'i')
          } else if (index === 2) {
            mongoQuery.draw_pool = new RegExp(searchTerm, 'i')
          }
        }
      })
    }
  }

  return mongoQuery
}

const mabiGachaTv = async (content, qq, callback) => {
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

  if (content.length > 20 || content.toLowerCase() === 'help' || content === '帮助') {
    help(callback)
    return
  }

  const filter = content.trim()
  const limit = 20
  let queryParams = []
  let whereClause = ''

  if (filter.length) {
    if (filter.indexOf('-') > -1) {
      const sp = filter.split('-')
      const [itemFilter, nameFilter, poolFilter] = sp
      if (itemFilter || nameFilter || poolFilter) {
        whereClause = `WHERE${sp
          .map((x, i) => x && [' item_name LIKE ?', ' character_name LIKE ?', ' draw_pool LIKE ?'][i])
          .filter(x => x)
          .join(' AND')}`
        queryParams = sp.map(x => x && `%${x}%`).filter(x => x)
      }
    } else {
      whereClause = `WHERE item_name LIKE ? OR character_name LIKE ?`
      queryParams = [`%${filter}%`, `%${filter}%`]
    }
  }

  const collectionName = `cl_mbcd_${sv}`
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
    item_name: doc.item_name,
    draw_pool: doc.draw_pool || '未知手帕',
    data_time: doc.time || new Date(doc.ts)
  }))

  const outputDir = path.join(IMAGE_DATA, 'mabi_other', `MabiGC.png`)

  await render(finalResults, {
    title: `抽蛋查询：${{ ylx: '猫服', yate: '亚特' }[sv]}`,
    description: `(MongoDB 总数: ${total})`,
    output: outputDir,
    columns: [
      {
        label: '角色名称',
        key: 'character_name'
      },
      {
        label: '物品名称',
        key: 'item_name'
      },
      {
        label: '时间',
        key: 'data_time',
        format: time => formatTime(new Date(time).getTime())
      },
      {
        label: '手帕名称',
        key: 'draw_pool'
      }
    ]
  })

  const imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `MabiGC.png`)}]`
  callback(imgMsg)
}

module.exports = {
  mabiGachaTv
}

