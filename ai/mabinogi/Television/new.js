const fs = require("fs-extra");
const path = require("path-extra");
const mysql = require('mysql2')



const createPool = async () => {
  const pool = mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database: 'dungeon_reward_records'
    },
    fs.readJsonSync(path.join(__dirname, '.secret.json'))
  ))
  promisePool = pool.promise();
}

const searchDb = async sqlQuery => {
  if(!promisePool) {
    createPool()
  }
  return await promisePool.query(sqlQuery)
}
