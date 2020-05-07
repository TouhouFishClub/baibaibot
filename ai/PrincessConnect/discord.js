const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'
const EXPIRATION_TIME = 15 * 60 * 1000
const UPDATE_TIME = 5
const ACTIVE_COUNT = 3

/* init db */
let client
(async () => {
  try {
    client = await MongoClient.connect(MONGO_URL)
  } catch (e) {
    console.log('MONGO ERROR FOR PCR MODULE!!')
    console.log(e)
  }
})()

const discord = (content, qq, group, callback) => {
  if(!client)
    return
  let sp = content.toLowerCase().replace(/ +/g, ' ').trim().split(' '),
    collection = client.collection('cl_pcr_discord')
  // console.log('==============')
  // console.log(sp[0])
  switch(sp[0]) {
    case '初始化':
      init(sp.slice(1).map(x => parseInt(x)), group, collection, callback)
      break
    case '重置':
      recov(sp.slice(1).map(x => parseInt(x)), group, collection, callback)
      break
    case '排刀':
      queue(qq, group, collection, callback)
      break
    case '报刀':
      attack(qq, group, sp[1], collection, callback)
      break
    case '挂树':
      tree(qq, group, collection, callback)
      break
    case '撤销':
      withdraw(qq, group, collection, callback)
      break
    case '查树':
      where(group, collection, callback)
      break
    case '状态':
      info(group, collection, callback)
      break
    case '帮助':
      help(callback)
      break
    default:
      help(callback)
      break
  }
  // console.log(client.collection('cl_pcr_discord'))
  // init([100, 200, 300], group, client.collection('cl_pcr_discord'))
  // getBossData(group, collection)
}

const getGroupData = (group, collection) => {
  return collection.findOne({'_id': `${group}`})
}

const getAttackUser = (user, group, collection) => {
  let now = getNow()
  return collection.findOne({'_id': `${group}_${user}_${now.getMonth() + 1}_${now.getDate()}`})
}

const init = async (BossList, group, collection, callback) => {
  let col = await getGroupData(group, collection)
  // console.log('====')
  // console.log(col)
  if(col && col.boss && col.boss.filter(x => x > 0).length > 0){
    callback(`无法初始化!\n${col.boss.join(',')}\nLoop: ${col.loop}`)
    return
  }
  if(BossList.length < 1){
    callback('boss初始化错误')
    return
  }
  collection.save({
    '_id': `${group}`,
    'boss': BossList,
    'index': 0,
    'tree': [],
    'attack': [],
    'current': '',
    'expiration': 0,
    'loop': (col && col.length) ? col.loop + 1 : 0,
    'attackSave': (col && col.attack && col.attackSave) ? col.attackSave.concat(col.attack) : []
  })
  let data = await getGroupData(group, collection)
  callback(`初始化成功!\n${data.boss.join(',')}\nLoop: ${data.loop}`)
}

const recov = async (BossList, group, collection, callback) => {
  if(BossList.length < 1){
    callback('boss初始化错误')
    return
  }
  collection.save({
    '_id': `${group}`,
    'boss': BossList,
    'index': 0,
    'tree': [],
    'attack': [],
    'current': '',
    'expiration': 0,
    'loop': 0,
    'attackSave': []
  })
  let data = await getGroupData(group, collection)
  callback(`重置成功!\n${data.boss.join(',')}\nLoop: ${data.loop}`)
}

const queue = async (user, group, collection, callback) => {
  let col = await getGroupData(group, collection),
    usr = await getAttackUser(user, group, collection),
    now =  getNow()
  if(!col) {
    errorInit(callback)
    return
  }
  if(col.tree.findIndex(u => u == user) > -1) {
    callback(`已挂树，无法排队`)
    return
  }
  if(col.current && getNow() < col.expiration) {
    if(col.current == user) {
      callback(`当前正在排队`)
    } else {
      callback(`无法排队! 当前[CQ:at,qq=${col.current}]正在排队`)
    }
  } else {
    if(usr) {
      if(usr.count >= ACTIVE_COUNT) {
        callback(`排队失败，超过当天次数限制`)
        return
      }
    } else {
      await collection.save({
        '_id': `${group}_${user}_${now.getMonth() + 1}_${now.getDate()}`,
        'count': 0
      })
    }
    await collection.save(Object.assign({}, col, {
      'current': `${user}`,
      'expiration': getNow().getTime() + EXPIRATION_TIME
    }))
    callback(`[CQ:at,qq=${user}]排队成功`)
  }
}

const attack = async (user, group, damage, collection, callback) => {
  let col = await getGroupData(group, collection),
    usr = await getAttackUser(user, group, collection)
  if(!col) {
    errorInit(callback)
    return
  }
  // console.log('=======')
  // console.log(usr)
  if(col.current == user) {
    if(damage && /^\d+$/.test(damage)) {
      await collection.save(calc(col, user, damage, callback))
      await collection.save(Object.assign(usr, {
        'count': usr.count + 1
      }))
    } else {
      callback(`输入错误`)
    }
  } else {
    callback(`当前无法操作\n${col.current ? (`[CQ:at,qq=${col.current}]正在排队\n过期时间：${formatTime(col.expiration + UPDATE_TIME * 60 * 60 * 1000)}`) : '没有人在排队'}`)
  }
}

const tree = async (user, group, collection, callback) => {
  let col = await getGroupData(group, collection)
  if(!col) {
    errorInit(callback)
    return
  }
  if(col.current == user) {
    collection.save(Object.assign(col, {
      'current': '',
      'tree': col.tree.concat([user]),
    }))
    callback(`[CQ:at,qq=${user}] 已挂树`)
  } else {
    callback(`当前无法操作\n${col.current ? (`[CQ:at,qq=${col.current}]正在排队\n过期时间：${formatTime(col.expiration + UPDATE_TIME * 60 * 60 * 1000)}`) : '没有人在排队'}`)
  }
}

const withdraw = async (user, group, collection, callback) => {
  let col = await getGroupData(group, collection)
  if(!col) {
    errorInit(callback)
    return
  }
  if(col.current == user) {
    collection.save(col, {
      'current': ''
    })
    callback(`已取消排队`)
  } else {
    callback(`您未在排队`)
  }
}

const where = async (group, collection, callback) => {
  let col = await getGroupData(group, collection)
  if(!col) {
    errorInit(callback)
    return
  }
  if(col.tree.length) {
    callback(`树上有：\n${col.tree.map(u => `[CQ:at,qq=${u}]`).join('\n')}`)
  } else {
    callback(`没有人在树上`)
  }
}

const info = async (group, collection, callback) => {
  let col = await getGroupData(group, collection)
  if(!col) {
    errorInit(callback)
    return
  }
  if(col.boss) {
    callback(`当前是${col.loop + 1}周目 ${col.index + 1}号boss\n血量：${col.boss[col.index]}\nboss列表：${col.boss.join(',')}`)
  } else {
    help(callback)
  }
}

const calc = (groupData, user, damage, callback) => {
  let boss = groupData.boss.concat([]),
    index = groupData.index,
    attack = groupData.attack.concat([]),
    clearTree = {},
    out = ''
  attack.push(
    {
      'user': user,
      'damage': parseInt(damage)
    }
  )
  // console.log('======')
  // console.log(damage)
  // console.log(boss[index])
  // console.log(parseInt(damage) < parseInt(boss[index]))
  if(parseInt(damage) < parseInt(boss[index])) {
    boss[index] = boss[index] - damage
  } else {
    boss[index] = 0
    index ++
    clearTree = {
      'tree': []
    }
  }
  out = `[CQ:at,qq=${user}]对${groupData.index + 1}号boss造成了${damage}伤害\n当前是${index + 1}号boss\nboss列表：${boss.join(',')}`
  callback(out)
  return Object.assign({}, groupData, {
    'current': '',
    'boss': boss,
    'attack': attack,
    'index': index
  }, clearTree)
}

const help = callback => {
  callback(`======= 自助排刀系统 =====\n【bcr 初始化 boss1血量 boss2血量 boss3血量 ...】：初始化boss，如果之前初始化的boss被击杀完毕，则周目数会+1，boss未全部击杀不可再次初始化\n【bcr 重置 boss1血量 boss2血量 boss3血量 ...】：此设定与初始化相同，可以强制重置boss，并且会使周目数及记录清空\n【bcr 排刀】：进入排队，如果有人排队，则无法进入，排队后15分钟不报刀或者挂树，自动撤销排队\n【bcr 撤销】：撤销当前的排队\n【bcr 报刀 伤害数量】：对当前boss造成伤害，如boss被击杀自动进入下一个boss\n【bcr 挂树】：挂树\n【bcr 查树】：查询当前挂树的成员\n【bcr 状态】：查询当前boss状态`)
}

const errorInit = callback => {
  callback(`未初始化，请使用【bcr 帮助】获得细节`)
}

const formatTime = ts => {
  let time = new Date(ts)
  return `${time.getHours()} : ${time.getMinutes()} : ${time.getSeconds()}`
}

const getNow = () => {
  return new Date(Date.now() - UPDATE_TIME * 60 * 60 * 1000)
}

module.exports = {
  discord
}