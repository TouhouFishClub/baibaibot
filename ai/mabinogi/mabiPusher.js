const { getClient } = require('../../mongo/index')

async function handlePush(byte, str, server) {
	const client = await getClient()
	const col = client.db('db_bot').collection('cl_mabinogi_pusher')
	await col.insertOne({
		byte,
		str,
		server,
		ts: Date.now(),
		time: new Date()
	})
}

module.exports = { handlePush }
