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

/**
 * 构建 MongoDB 查询
 * @param {string} filter - 原始搜索字符串
 * @returns {object} MongoDB 查询对象
 *
 * 格式说明：
 *   无分隔符：同时模糊搜索 item_name 和 character_name（$or）
 *   有分隔符(-)：按位置精确指定字段 -> 物品名-角色名
 *     例: "铠甲"       → item_name OR character_name 包含"铠甲"
 *     例: "铠甲-角色"  → item_name 包含"铠甲" AND character_name 包含"角色"
 *     例: "-角色"      → 仅 character_name 包含"角色"
 */
const buildMongoQuery = (filter) => {
  if (!filter || !filter.length) return {}

  // 没有分隔符：同时搜 item_name 和 character_name
  if (filter.indexOf('-') === -1) {
    return {
      $or: [
        { item_name: new RegExp(filter, 'i') },
        { character_name: new RegExp(filter, 'i') }
      ]
    }
  }

  // 有分隔符：按位置对应字段
  const sp = filter.split('-')
  const fields = ['item_name', 'character_name']
  const conditions = []

  sp.forEach((part, i) => {
    if (part && fields[i]) {
      conditions.push({ [fields[i]]: new RegExp(part, 'i') })
    }
  })

  if (conditions.length === 0) return {}
  if (conditions.length === 1) return conditions[0]
  return { $and: conditions }
}

const mabiCraftTv = async (content, qq, callback) => {
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
  const limit = 20

  const collectionName = `cl_mbzz_${sv}`
  const col = db.collection(collectionName)

  const mongoQuery = buildMongoQuery(filter)

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
    channel: doc.channel,
    data_time: doc.time || new Date(doc.ts)
  }))

  const outputDir = path.join(IMAGE_DATA, 'mabi_other', `MabiZZ.png`)

  await render(finalResults, {
    title: `装备制造查询：${{ ylx: '猫服', yate: '亚特' }[sv]}`,
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
        label: '频道',
        key: 'channel'
      }
    ]
  })

  const imgMsg = `[CQ:image,file=${path.join('send', 'mabi_other', `MabiZZ.png`)}]`
  callback(imgMsg)
}

module.exports = {
  mabiCraftTv
}
