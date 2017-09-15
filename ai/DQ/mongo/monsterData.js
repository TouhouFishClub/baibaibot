const MongoClient = require('mongodb').MongoClient;
const config = require('../config')

MongoClient.connect(`${config.MONGO_URL}/${config.MONGO_DATABASE}`, (db, err) => {

})

const AllMonster = [
  {
    name: '史莱姆',
    atk: 1,
    def: 0,
    hp: 4,
    minlv: 1,
    maxlv: 4,

  }
]