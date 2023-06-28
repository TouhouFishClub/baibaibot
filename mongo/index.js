const MongoClient = require('mongodb').MongoClient
const { myip, mongourl} = require('../baibaiConfigs')

let client

const getClient = async () => {
	if(client) {
		return client
	} else {
		try {
			client = await MongoClient.connect(mongourl)
			return client
		} catch (e) {
			console.log('MONGO ERROR FOR UNIVERSAL MODULE!!')
			console.log(e)
		}
	}
}


module.exports = {
	getClient
}