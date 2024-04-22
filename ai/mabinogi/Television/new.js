const fs = require("fs-extra");
const path = require("path-extra");
const mysql = require('mysql2')

const { MongoClient } = require('mongodb')
const { mongourl } = require('../../../baibaiConfigs')

let mysqlPool, mgoClient

const createMysqlPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'dungeon_reward_records'
    },
    fs.readJsonSync(path.join(__dirname, '.secret.json'))
  ))
  mysqlPool = pool.promise();
}

const checkLink = async () => {
  if(!mysqlPool) {
    await createMysqlPool()
  }
  if(!mgoClient) {
    try {
      mgoClient = await MongoClient.connect(mongourl)
    } catch (e) {
      console.log('MONGO ERROR FOR NEW MBTV MODULE!!')
      console.log(e)
    }
  }
}

const help = callback => {
  callback('这是帮助')
}

const searchDb = async sqlQuery => {
  return await mysqlPool.query(sqlQuery)
}

const search = async (content, qq, callback) => {
  if(!content.trim().length) {
    help(callback)
    return
  }
  await checkLink()
  const svc = mgoClient.db('db_bot').collection('cl_mabinogi_user_server')
  const svInfo = await svc.findOne({_id: qq})
  let sv
  if(svInfo) {
    sv = svInfo.sv
  } else {
    await svc.save({_id: qq, sv: 'ylx'})
    sv = 'ylx'
  }
  let table = {
    'ylx': 'mabi_dungeon_reward_records',
    'yate': 'mabi_dungeon_reward_records_yate'
  }[sv]
  const filter = content.trim()
  const limit = 20
  const query =
    `
    SELECT *
    FROM ${table}
    ${(filter && filter.length > 1) ? `
    WHERE reward LIKE '%${filter}%'
      OR dungeon_name LIKE '%${filter}%'
      OR character_name LIKE '%${filter}%'
    ` : ''}
    ORDER BY data_time DESC 
    LIMIT ${limit}
    `
  const [row, fields] = await mysqlPool.query(query)
  console.log(row)
  // await checkLink()
}

search('苍白', 123456, d => {
  console.log(d)
})