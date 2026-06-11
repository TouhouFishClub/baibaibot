// 用法见 script/README.md
// 将 cl_mabinogi_pusher 中「获得了{物品}道具」格式、未分发到 cl_mbcd_* 的记录补写入库
const readline = require('readline')
const { getClient } = require('../mongo/index')

/** 新格式：海豹不会游泳获得了像素星穹蓝色2次头衔兑换券道具。 */
const SIMPLE_GAIN_ITEM_BEFORE_REGEX = /^(.+?)获得了(.+?)道具。?$/

/** 国服 2026-06-12 零点（新格式上线后未正确分发的起始时间） */
const DEFAULT_SINCE = new Date('2026-06-12T00:00:00+08:00')

const SERVERS = ['ylx', 'yate']

function normalizeItemNameForAlias (itemName) {
	if (!itemName) return ''
	return String(itemName).replace(/[()（）]/g, '')
}

function getPoolFromGachaInfoDoc (gachaInfo) {
	if (!gachaInfo || !Array.isArray(gachaInfo.info) || !gachaInfo.info.length) return null
	const lastInfo = gachaInfo.info[gachaInfo.info.length - 1]
	const pool = lastInfo && lastInfo.pool
	return pool && String(pool).trim() ? String(pool).trim() : null
}

function parseItemBeforeGain (str) {
	const match = String(str || '').match(SIMPLE_GAIN_ITEM_BEFORE_REGEX)
	if (!match) return null
	return {
		character_name: match[1].trim(),
		item_name: match[2].trim()
	}
}

function createReadline () {
	return readline.createInterface({ input: process.stdin, output: process.stdout })
}

function ask (rl, question) {
	return new Promise((resolve) => {
		rl.question(question, (answer) => resolve(String(answer || '').trim()))
	})
}

function parseSinceDate (argv) {
	const eqArg = argv.find((a) => /^--since=/.test(a))
	if (eqArg) {
		const raw = eqArg.split('=').slice(1).join('=')
		const d = new Date(raw)
		if (Number.isNaN(d.getTime())) {
			console.error(`--since= 后必须是合法日期，例如: --since=2026-06-12`)
			process.exit(1)
		}
		return d
	}

	const idx = argv.findIndex((a) => a === '--since')
	if (idx >= 0) {
		const raw = argv[idx + 1]
		if (!raw) {
			console.error('--since 后需要日期，例如: --since 2026-06-12')
			process.exit(1)
		}
		const d = new Date(raw)
		if (Number.isNaN(d.getTime())) {
			console.error(`--since 后必须是合法日期: ${raw}`)
			process.exit(1)
		}
		return d
	}

	return DEFAULT_SINCE
}

function parseCli () {
	const argv = process.argv.slice(2)
	const scanOnly = argv.includes('scan') || argv.includes('--scan-only')
	const autoYes = argv.includes('yes') || argv.includes('--yes')
	const sinceDate = parseSinceDate(argv)
	return { scanOnly, autoYes, sinceDate }
}

function formatTime (d) {
	if (!d) return '(无 time)'
	return d.toISOString()
}

async function findCandidates (db, sinceDate) {
	const pusherCol = db.collection('cl_mabinogi_pusher')
	const query = {
		byte: 2,
		time: { $gte: sinceDate }
	}

	const cursor = pusherCol.find(query).sort({ ts: 1 })
	const candidates = []

	while (await cursor.hasNext()) {
		const doc = await cursor.next()
		const parsed = parseItemBeforeGain(doc.str)
		if (!parsed) continue
		if (!SERVERS.includes(doc.server)) continue

		const mbcdCol = db.collection(`cl_mbcd_${doc.server}`)
		const existing = await mbcdCol.findOne({
			server: doc.server,
			raw: doc.str,
			ts: doc.ts
		})

		candidates.push({
			pusher: doc,
			parsed,
			existing,
			mbcdColName: `cl_mbcd_${doc.server}`
		})
	}

	return candidates
}

async function buildMbcdDoc (doc, parsed, gachaCol) {
	const { character_name, item_name } = parsed
	const mbcdDoc = {
		character_name,
		item_name,
		server: doc.server,
		raw: doc.str,
		ts: doc.ts,
		time: doc.time || new Date(doc.ts)
	}

	const aliasKey = normalizeItemNameForAlias(item_name)
	if (aliasKey) {
		const gachaInfo = await gachaCol.findOne({ alias: aliasKey })
		const pool = getPoolFromGachaInfoDoc(gachaInfo)
		if (pool) mbcdDoc.draw_pool = pool
	}

	return mbcdDoc
}

async function main () {
	const { scanOnly, autoYes, sinceDate } = parseCli()

	console.log('补写 cl_mbcd_*：新格式「获得了{物品}道具」未分发记录')
	console.log(`起始时间: ${sinceDate.toISOString()} (time >= 此值)`)
	console.log(`模式: ${scanOnly ? '仅扫描' : autoYes ? '直接写入' : '扫描后确认写入'}\n`)

	const client = await getClient()
	if (!client) {
		console.error('无法连接 MongoDB，请检查网络与 baibaiConfigs 中的 mongourl')
		process.exit(1)
	}
	const db = client.db('db_bot')
	const gachaCol = db.collection('cl_mabinogi_gacha_info')

	try {
		const candidates = await findCandidates(db, sinceDate)
		const missing = candidates.filter((c) => !c.existing)
		const already = candidates.filter((c) => c.existing)

		console.log(`匹配新格式: ${candidates.length} 条`)
		console.log(`已在 cl_mbcd_*: ${already.length} 条`)
		console.log(`待补写: ${missing.length} 条\n`)

		if (!missing.length) {
			console.log('无需补写。')
			return
		}

		const previewLimit = 20
		for (let i = 0; i < Math.min(missing.length, previewLimit); i++) {
			const { pusher, parsed, mbcdColName } = missing[i]
			console.log(
				`[${i + 1}] ${mbcdColName}  ${formatTime(pusher.time)}  ` +
				`${parsed.character_name} / ${parsed.item_name}`
			)
			console.log(`     raw="${String(pusher.str).slice(0, 100)}"`)
		}
		if (missing.length > previewLimit) {
			console.log(`\n... 另有 ${missing.length - previewLimit} 条未展示`)
		}

		if (scanOnly) {
			console.log('\n当前为 scan 模式，未写入任何记录。')
			return
		}

		let confirmed = autoYes
		if (!autoYes) {
			const rl = createReadline()
			try {
				const answer = (await ask(rl, `\n确认补写 ${missing.length} 条到 cl_mbcd_*? [y/n]: `)).toLowerCase()
				confirmed = answer === 'y' || answer === 'yes'
			} finally {
				rl.close()
			}
		}

		if (!confirmed) {
			console.log('已取消，未写入任何记录。')
			return
		}

		let inserted = 0
		let failed = 0

		for (const item of missing) {
			const { pusher, parsed, mbcdColName } = item
			try {
				const mbcdCol = db.collection(mbcdColName)
				const mbcdDoc = await buildMbcdDoc(pusher, parsed, gachaCol)
				await mbcdCol.insertOne(mbcdDoc)
				inserted++
				console.log(`[写入] ${mbcdColName}  ${parsed.character_name} / ${parsed.item_name}`)
			} catch (err) {
				failed++
				console.error(`[失败] ${mbcdColName}  ts=${pusher.ts}  ${err.message || err}`)
			}
		}

		console.log('\n======== 汇总 ========')
		console.log(`待补写: ${missing.length} 条`)
		console.log(`已写入: ${inserted} 条`)
		if (failed) console.log(`失败: ${failed} 条`)
	} finally {
		await client.close()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
