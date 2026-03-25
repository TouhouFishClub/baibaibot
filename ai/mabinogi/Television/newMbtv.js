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

const partToRegex = part => {
  return part.replace(/([.+?^${}()|[\]\\])/g, '\\$1').replace(/%/g, '.*')
}

/**
 * 构建 MongoDB 查询
 * @param {string} filter - 原始搜索字符串
 * @returns {Promise<object>} MongoDB 查询对象
 *
 * 格式说明：
 *   无分隔符：同时模糊搜索 reward、character_name 和 dungeon_name（$or）
 *   有分隔符(-)：按位置精确指定字段 -> 奖励名-角色名-地下城名
 *     例: "道具"           → reward OR character_name OR dungeon_name 包含"道具"
 *     例: "道具-角色"      → reward 包含"道具" AND character_name 包含"角色"
 *     例: "-角色-"         → 仅 character_name 包含"角色"
 *     例: "--地下城"       → 仅 dungeon_name 包含"地下城"
 *   %通配符：代表任意字符，如 "特殊%华尔兹%女" 匹配 "特殊浪漫华尔兹服饰（女款）"
 *   芙兰队：特殊查询模式，查询特定角色在格伦贝尔纳10频道的记录
 */
const buildMongoQuery = async filter => {
  if (!filter || !filter.length) return {}

  // 芙兰队特殊查询
  if (filter.startsWith('芙兰队')) {
    const namePatterns = ['Fl', '莉丽', '娜兹', 'Sa', '永夜', '温雯', '圣祐', '幽鬼']
    const query = {
      character_name: new RegExp(namePatterns.join('|'), 'i'),
      channel: 10,
      dungeon_name: '格伦贝尔纳'
    }

    if (filter.includes('新卷')) {
      const regStr = await createSearchRegexp('新卷')
      query.reward = new RegExp(regStr, 'i')
    }
    if (filter.includes('+1卷')) {
      query.reward = new RegExp('\\+1咒语书', 'i')
    }

    return query
  }

  // 没有分隔符：同时搜 reward、character_name、dungeon_name
  if (filter.indexOf('-') === -1) {
    if (/^新.*卷$/.test(filter)) {
      const regStr = await createSearchRegexp(filter)
      return { reward: new RegExp(regStr, 'i') }
    }
    const regex = new RegExp(partToRegex(filter), 'i')
    return {
      $or: [
        { reward: regex },
        { character_name: regex },
        { dungeon_name: regex }
      ]
    }
  }

  // 有分隔符：按位置对应字段 reward-character_name-dungeon_name
  const sp = filter.split('-')
  const fields = ['reward', 'character_name', 'dungeon_name']
  const conditions = []

  for (let i = 0; i < sp.length; i++) {
    const part = sp[i]
    if (part && fields[i]) {
      if (i === 0 && /^新.*卷$/.test(part)) {
        const regStr = await createSearchRegexp(part)
        conditions.push({ reward: new RegExp(regStr, 'i') })
      } else {
        conditions.push({ [fields[i]]: new RegExp(partToRegex(part), 'i') })
      }
    }
  }

  if (conditions.length === 0) return {}
  if (conditions.length === 1) return conditions[0]
  return { $and: conditions }
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

  if (content.length > 20 || content.toLowerCase() === 'help' || content === '帮助') {
    help(callback)
    return
  }

  const filter = content.trim()
  const limit = filter.startsWith('芙兰队') ? 50 : 20

  const collectionName = `cl_mbtv_${sv}`
  const col = db.collection(collectionName)

  const mongoQuery = await buildMongoQuery(filter)

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
