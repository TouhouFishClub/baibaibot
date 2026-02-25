const { getClient } = require('../../mongo/index')

const CROSS_IP_DEDUP_MS = 30 * 1000
const SAME_IP_DEDUP_MS = 100

async function handlePush(byte, str, server, ip) {
	const client = await getClient()
	const col = client.db('db_bot').collection('cl_mabinogi_pusher')
	const now = Date.now()

	// 不同 IP 推送相同数据 → 多终端看到同一事件，去重
	const crossIpDup = await col.findOne({
		byte, str, server,
		ip: { $ne: ip },
		ts: { $gte: now - CROSS_IP_DEDUP_MS }
	})
	if (crossIpDup) return false

	// 同一 IP 极短时间内重复推送 → 防抖
	const sameIpDup = await col.findOne({
		byte, str, server, ip,
		ts: { $gte: now - SAME_IP_DEDUP_MS }
	})
	if (sameIpDup) return false

	await col.insertOne({
		byte, str, server, ip,
		ts: now,
		time: new Date(now)
	})
	return true
}

module.exports = { handlePush }
