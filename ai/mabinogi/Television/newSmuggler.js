const { getClient } = require('../../../mongo/index')

const formatTime = ts => {
  const d = new Date(ts)
  const addZero = n => (n < 10 ? '0' + n : n)
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}:${addZero(d.getSeconds())}`
}

/**
 * 走私查询：
 * - 优先返回最近一条同时包含地区(area)和物品(item)的信息
 * - 若没有完整信息，则退而求其次返回最近一条任意走私记录
 */
const mabiSmuggler = async callback => {
  try {
    const client = await getClient()
    const col = client.db('db_bot').collection('cl_mabinogi_smuggler')

    // 优先找最近一条有 area && item 的记录
    const fullDoc = await col
      .find({ area: { $ne: null }, item: { $ne: null } })
      .sort({ ts: -1 })
      .limit(1)
      .next()

    let doc = fullDoc

    // 若没有完整信息，则退化为最近一条任意记录
    if (!doc) {
      doc = await col
        .find({})
        .sort({ ts: -1 })
        .limit(1)
        .next()
    }

    if (!doc) {
      callback('当前没有检测到任何走私贩子相关消息')
      return
    }

    const timeStr = doc.time ? formatTime(doc.time) : formatTime(doc.ts || Date.now())
    const area = doc.area || '未知地区'
    const item = doc.item || '未知贸易物品'

    let statusLabel = ''
    switch (doc.type) {
      case 'forecast':
        statusLabel = '【预告】'
        break
      case 'appear':
        statusLabel = '【出现状态】'
        break
      case 'disappear_forecast':
        statusLabel = '【消失预告】'
        break
      default:
        statusLabel = '【走私消息】'
    }

    let msg = `【走私查询】\n${statusLabel}\n时间：${timeStr}\n`

    if (doc.area || doc.item) {
      msg += `地区：${area}\n`
      if (doc.item) {
        msg += `贸易物品：${item}\n`
      }
    }

    callback(msg)
  } catch (err) {
    console.error('mabiSmuggler query error', err)
    callback('走私查询失败，请稍后再试')
  }
}

module.exports = {
  mabiSmuggler
}

