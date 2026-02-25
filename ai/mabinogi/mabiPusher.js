const { getClient } = require('../../mongo/index')

const CROSS_IP_DEDUP_MS = 30 * 1000
const SAME_IP_DEDUP_MS = 0

// 春灬语默获得了道具奇妙的皇家骑士学院手套
const SIMPLE_GAIN_REGEX = /^(.+?)获得了道具(.+)$/

// 汐殇** 从 格伦贝尔纳获得了 套装效果拉蒂卡移动速度增加+1咒语书。 (频道5)
const COMPLEX_GAIN_REGEX = /^(.+?)\s*从\s*(.+?)获得了\s*(.+?)。\s*\(频道(\d+)\)\s*$/

// 醉伴** 制作 布里安恩德斯激情手套 成功。(频道1)
const CRAFT_SUCCESS_REGEX = /^(.+?)\s*制作\s+(.+?)\s*成功。?\s*\(频道(\d+)\)\s*$/

// 在4分钟后地区的布拉格平原西北方处，出现了走私贩子. 今天的贸易物品为大理石。
// 在布拉格平原西北方地区出现了走私贩子。今天的贸易物品为大理石。
// 布拉格平原西北方地区的走私贩子 4分钟后将会消失。
const SMUGGLER_FORECAST_REGEX = /^在4分钟后地区的(.+?)处，出现了走私贩子.*?今天的贸易物品为(.+?)。?$/
const SMUGGLER_APPEAR_REGEX = /^在(.+?)地区出现了走私贩子。今天的贸易物品为(.+?)。?$/
const SMUGGLER_DISAPPEAR_REGEX = /^(.+?)地区的走私贩子\s*4分钟后将会消失。?$/

function normalizeItemNameForAlias(itemName) {
	if (!itemName) return ''
	// 去掉中英文括号字符本身，便于用 alias 精确匹配
	return itemName.replace(/[()（）]/g, '')
}

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

	// 同一 IP 极短时间内重复推送 → 防抖（SAME_IP_DEDUP_MS 为 0 时跳过）
	if (SAME_IP_DEDUP_MS > 0) {
		const sameIpDup = await col.findOne({
			byte, str, server, ip,
			ts: { $gte: now - SAME_IP_DEDUP_MS }
		})
		if (sameIpDup) return false
	}

	await col.insertOne({
		byte, str, server, ip,
		ts: now,
		time: new Date(now)
	})

	// 额外分发：byte 为 2 时，根据内容写入不同集合
	if (Number(byte) === 2) {
		try {
			const simpleMatch = str.match(SIMPLE_GAIN_REGEX)
			if (simpleMatch) {
				const [, characterNameRaw, itemNameRaw] = simpleMatch
				const character_name = characterNameRaw.trim()
				const item_name = itemNameRaw.trim()

				const colName = `cl_mbcd_${server}`
				const simpleCol = client.db('db_bot').collection(colName)

				const simpleDoc = {
					character_name,
					item_name,
					server,
					raw: str,
					ts: now,
					time: new Date(now)
				}

				// 根据 item_name 去 cl_mabinogi_gacha_info 查抽池；
				// 使用 alias 字段匹配，且去掉括号字符避免中英文括号差异。
				const aliasKey = normalizeItemNameForAlias(item_name)
				if (aliasKey) {
					const gachaCol = client.db('db_bot').collection('cl_mabinogi_gacha_info')
					const gachaInfo = await gachaCol.findOne({ alias: aliasKey })
					if (gachaInfo && Array.isArray(gachaInfo.info) && gachaInfo.info.length > 0) {
						const lastInfo = gachaInfo.info[gachaInfo.info.length - 1]
						if (lastInfo && lastInfo.pool) {
							simpleDoc.draw_pool = lastInfo.pool
						}
					}
				}

				await simpleCol.insertOne(simpleDoc)
				return true
			}

			const complexMatch = str.match(COMPLEX_GAIN_REGEX)
			if (complexMatch) {
				const [, characterNameRaw, dungeonNameRaw, rewardRaw, channelStr] = complexMatch
				const character_name = characterNameRaw.trim()
				const dungeon_name = dungeonNameRaw.trim()
				const reward = rewardRaw.trim()
				const channel = Number(channelStr)

				const colName = `cl_mbtv_${server}`
				const complexCol = client.db('db_bot').collection(colName)
				await complexCol.insertOne({
					character_name,
					dungeon_name,
					reward,
					channel,
					server,
					raw: str,
					ts: now,
					time: new Date(now)
				})
				return true
			}

			const craftMatch = str.match(CRAFT_SUCCESS_REGEX)
			if (craftMatch) {
				const [, characterNameRaw, itemNameRaw, channelStr] = craftMatch
				const character_name = characterNameRaw.trim()
				const item_name = itemNameRaw.trim()
				const channel = Number(channelStr)

				const colName = `cl_mbzz_${server}`
				const craftCol = client.db('db_bot').collection(colName)
				await craftCol.insertOne({
					character_name,
					item_name,
					channel,
					server,
					raw: str,
					ts: now,
					time: new Date(now)
				})
				return true
			}
		} catch (err) {
			// 分发失败不影响主记录
			console.error('mabinogi pusher byte=2 dispatch error', err, { str, server })
		}
	}

	// 额外分发：byte 为 8 时，记录走私贩子信息到 cl_mabinogi_smuggler
	if (Number(byte) === 8) {
		try {
			const smugglerCol = client.db('db_bot').collection('cl_mabinogi_smuggler')
			let type = 'raw'
			let area = null
			let item = null

			const forecastMatch = str.match(SMUGGLER_FORECAST_REGEX)
			const appearMatch = !forecastMatch && str.match(SMUGGLER_APPEAR_REGEX)
			const disappearMatch = !forecastMatch && !appearMatch && str.match(SMUGGLER_DISAPPEAR_REGEX)

			if (forecastMatch) {
				type = 'forecast'
				area = forecastMatch[1].trim()
				item = forecastMatch[2].trim()
			} else if (appearMatch) {
				type = 'appear'
				area = appearMatch[1].trim()
				item = appearMatch[2].trim()
			} else if (disappearMatch) {
				type = 'disappear_forecast'
				area = disappearMatch[1].trim()
			}

			await smugglerCol.insertOne({
				byte: Number(byte),
				str,
				server,
				ip,
				ts: now,
				time: new Date(now),
				type,
				area,
				item
			})
		} catch (err) {
			// 分发失败不影响主记录
			console.error('mabinogi pusher byte=8 dispatch error', err, { str, server })
		}
	}

	return true
}

module.exports = { handlePush }
