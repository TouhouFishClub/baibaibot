const MongoClient = require('mongodb').MongoClient
const MONGO_URL = require('../../../baibaiConfigs').mongourl;

let client

(async () => {
	if(!client) {
		try {
			client = await MongoClient.connect(MONGO_URL)
		} catch (e) {
			console.log('MONGO ERROR FOR MABINOGI GACHA MODULE!!')
			console.log(e)
		}
	}
	let allData = await client.db('db_bot').collection('cl_mabinogi_gacha_info').find().toArray()
	allData = allData.map(({_id, info}) => {
		return {
			_id,
			alias: _id.replace(/[()（）]/g, ''),
			info: info.map(x => {
				let pool = x.pool
				pool = pool.substring(pool.indexOf('>') + 1)
				if(pool.indexOf('[') > -1) {
					pool = pool.substring(pool.indexOf('['))
				}
				if(pool.indexOf('<') > -1) {
					pool = pool.substring(pool.indexOf('<'))
				}
				return Object.assign(x, { pool })
			})
		}
	})
	for(let i = 0; i < allData.length; i ++) {
		await client.db('db_bot').collection('cl_mabinogi_gacha_info').save(allData[i])
	}
	console.log('save end')
})()
