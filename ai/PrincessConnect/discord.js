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
  console.log('==============')
  console.log(sp[0])
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
    case 'help':
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
      callback(`无法排队! 当前：${col.current}`)
    }
  } else {
    if(usr) {
      if(usr.count >= ACTIVE_COUNT) {
        callback(`排队失败，超过限制`)
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
    callback(`${user}排队成功`)
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
    callback(`当前无法操作\n${col.current ? (col.current + '正在排队') : '没有人在排队'}`)
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
    callback(`${user} 已挂树`)
  } else {
    callback(`当前无法操作\n${col.current ? (col.current + '正在排队') : '没有人在排队'}`)
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
    callback(`树上有：\n${col.tree.join('\n')}`)
  } else {
    callback(`没有人在树上`)
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
  out = `${user}对boss${groupData.index + 1}造成了${damage}伤害\n当前：${boss.join(',')}\nindex: ${index}`
  callback(out)
  return Object.assign({}, groupData, {
    'current': '',
    'boss': boss,
    'attack': attack,
    'index': index
  }, clearTree)
}

const help = callback => {
  callback(`这是帮助`)
}

const errorInit = callback => {
  callback(`未初始化`)
}

const getNow = () => {
  return new Date(Date.now() - UPDATE_TIME * 60 * 60 * 1000)
}

module.exports = {
  discord
}