const fs = require("fs-extra");
const path = require("path-extra");
const mysql = require('mysql2')

let mysqlPool

const createMysqlPool = async database => {
  const pool = await mysql.createPool(Object.assign(
    {
      connectionLimit: 10,
      database
    },
    fs.readJsonSync(path.join(__dirname, '.secret.json'))
  ))
  mysqlPool = pool.promise();
}

class Mysql {
  async query(sql, args) {
    return mysqlPool.query(sql, args);
  }
}


class CompareDb {
  mysql = null;
  mongo = null;
  async constructor(mysql_database_name, mongo) {
    this.mysql = await createMysqlPool(mysql_database_name) ;
    this.mongo = mongo;
  }
}

module.exports = {
  CompareDb
}