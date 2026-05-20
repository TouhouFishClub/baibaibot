// 用法见 script/README.md
const readline = require('readline')
const { ObjectId } = require('mongodb')
const { getClient } = require('../mongo/index')

const DEFAULT_DEDUP_MS = 30 * 1000

const SERVERS = ['ylx', 'yate']

/** @type {{ label: string, colName: string | ((sv: string) => string), getKey: (doc: object) => string, format: (doc: object) => string }[]} */
const SCAN_TARGETS = [
	{
		label: '主推流 cl_mabinogi_pusher',
		colName: 'cl_mabinogi_pusher',
		getKey: (doc) => `${doc.byte}\0${doc.server}\0${doc.str}`,
		format: (doc) => {
			const ip = doc.ip ? ` ip=${doc.ip}` : ''
			const preview = String(doc.str || '').slice(0, 80)
			return `byte=${doc.byte} server=${doc.server}${ip} str="${preview}"`
		}
	},
	{
		label: '抽卡 cl_mbcd',
		colName: (sv) => `cl_mbcd_${sv}`,
		getKey: (doc) => `${doc.server}\0${doc.raw}`,
		format: (doc) => {
			const preview = String(doc.raw || '').slice(0, 80)
			return `server=${doc.server} ${doc.character_name} / ${doc.item_name} raw="${preview}"`
		}
	},
	{
		label: '副本 cl_mbtv',
		colName: (sv) => `cl_mbtv_${sv}`,
		getKey: (doc) => `${doc.server}\0${doc.raw}`,
		format: (doc) => {
			const preview = String(doc.raw || '').slice(0, 80)
			return `server=${doc.server} ch=${doc.channel} ${doc.character_name} raw="${preview}"`
		}
	},
	{
		label: '制作 cl_mbzz',
		colName: (sv) => `cl_mbzz_${sv}`,
		getKey: (doc) => `${doc.server}\0${doc.raw}`,
		format: (doc) => {
			const preview = String(doc.raw || '').slice(0, 80)
			return `server=${doc.server} ch=${doc.channel} ${doc.character_name} raw="${preview}"`
		}
	},
	{
		label: '走私 cl_mabinogi_smuggler',
		colName: 'cl_mabinogi_smuggler',
		getKey: (doc) => `${doc.server}\0${doc.str}`,
		format: (doc) => {
			const ip = doc.ip ? ` ip=${doc.ip}` : ''
			const preview = String(doc.str || '').slice(0, 80)
			return `server=${doc.server} type=${doc.type}${ip} str="${preview}"`
		}
	}
]

function createReadline () {
	return readline.createInterface({ input: process.stdin, output: process.stdout })
}

function ask (rl, question) {
	return new Promise((resolve) => {
		rl.question(question, (answer) => resolve(String(answer || '').trim()))
	})
}

function formatTs (ts) {
	if (!ts) return '(无 ts)'
	const d = new Date(ts)
	return `${ts} (${d.toLocaleString('zh-CN', { hour12: false })})`
}

function idStr (id) {
	if (!id) return '(无 _id)'
	return id instanceof ObjectId ? id.toHexString() : String(id)
}

function buildTsQuery (sinceTs) {
	return sinceTs == null ? { ts: { $exists: true, $type: 'number' } } : { ts: { $gte: sinceTs } }
}

/** 兼容 mongodb@2.x（count / remove，无 countDocuments、deleteMany） */
async function countDocs (col, query) {
	const n = await col.count(query)
	return typeof n === 'number' ? n : 0
}

async function removeDocs (col, filter) {
	const res = await col.remove(filter)
	if (res && typeof res.deletedCount === 'number') return res.deletedCount
	if (res && res.result && typeof res.result.n === 'number') return res.result.n
	return 0
}

async function findDuplicatesInCollection (col, getKey, query, dedupMs) {
	const duplicates = []
	/** @type {Map<string, { doc: object, ts: number }[]>} */
	const recentByKey = new Map()
	const cursor = col.find(query).sort({ ts: 1 })

	while (await cursor.hasNext()) {
		const doc = await cursor.next()
		const ts = Number(doc.ts)
		if (!Number.isFinite(ts)) continue

		const key = getKey(doc)
		let list = recentByKey.get(key) || []
		list = list.filter((e) => ts - e.ts < dedupMs)

		if (list.length > 0) {
			duplicates.push({
				dup: doc,
				keep: list[0].doc,
				deltaMs: ts - list[0].ts
			})
			list.push({ doc, ts })
		} else {
			list = [{ doc, ts }]
		}

		recentByKey.set(key, list)
	}

	return duplicates
}

async function scanCollection (db, target, colName, sinceTs, dedupMs) {
	const col = db.collection(colName)
	const query = buildTsQuery(sinceTs)
	const total = await countDocs(col, query)
	if (!total) {
		return { colName, total: 0, duplicates: [] }
	}

	const duplicates = await findDuplicatesInCollection(col, target.getKey, query, dedupMs)
	return { colName, total, duplicates }
}

async function runScan (db, sinceTs, dedupMs) {
	const allItems = []

	for (const target of SCAN_TARGETS) {
		if (typeof target.colName === 'string') {
			const result = await scanCollection(db, target, target.colName, sinceTs, dedupMs)
			for (const item of result.duplicates) {
				allItems.push({
					target,
					colName: result.colName,
					col: db.collection(result.colName),
					...item
				})
			}
			console.log(
				`[扫描] ${target.label} (${result.colName}): ` +
				`范围内 ${result.total} 条, 疑似重复 ${result.duplicates.length} 条`
			)
		} else {
			for (const sv of SERVERS) {
				const colName = target.colName(sv)
				const result = await scanCollection(db, target, colName, sinceTs, dedupMs)
				for (const item of result.duplicates) {
					allItems.push({
						target,
						colName: result.colName,
						col: db.collection(result.colName),
						...item
					})
				}
				console.log(
					`[扫描] ${target.label} (${result.colName}): ` +
					`范围内 ${result.total} 条, 疑似重复 ${result.duplicates.length} 条`
				)
			}
		}
	}

	return allItems
}

function printItemDetail (item, index, total) {
	const { target, colName, dup, keep, deltaMs } = item
	console.log(`\n--- [${index + 1}/${total}] ${target.label} / ${colName} ---`)
	console.log(`  保留 ${idStr(keep._id)}  ${formatTs(keep.ts)}`)
	console.log(`    ${target.format(keep)}`)
	console.log(`  重复 ${idStr(dup._id)}  ${formatTs(dup.ts)}  (+${deltaMs}ms)`)
	console.log(`    ${target.format(dup)}`)
}

async function deleteBatch (col, batch) {
	const ids = batch.map((item) => item.dup._id)
	return removeDocs(col, { _id: { $in: ids } })
}

function groupByCollection (items) {
	/** @type {Map<string, typeof items>} */
	const map = new Map()
	for (const item of items) {
		const list = map.get(item.colName) || []
		list.push(item)
		map.set(item.colName, list)
	}
	return map
}

function parseDedupMs (argv) {
	const fromEq = argv.find((a) => /^--ms=/.test(a) || /^-ms=/.test(a))
	if (fromEq) {
		const n = Number(fromEq.split('=').slice(1).join('='))
		if (!Number.isFinite(n) || n <= 0) {
			console.error('--ms= 后必须是大于 0 的毫秒数')
			process.exit(1)
		}
		return Math.floor(n)
	}

	const idx = argv.findIndex((a) => a === '--ms' || a === '-ms')
	if (idx >= 0) {
		const n = Number(argv[idx + 1])
		if (!Number.isFinite(n) || n <= 0) {
			console.error('--ms 后必须是大于 0 的毫秒数，例如: --ms 1000')
			process.exit(1)
		}
		return Math.floor(n)
	}

	return DEFAULT_DEDUP_MS
}

function isDaysToken (argv, index) {
	const a = argv[index]
	if (!/^\d+$/.test(a)) return false
	if (index > 0 && (argv[index - 1] === '--ms' || argv[index - 1] === '-ms')) return false
	return true
}

function parseCli () {
	const argv = process.argv.slice(2)
	const scanOnly = argv.includes('scan') || argv.includes('--scan-only')
	const fullScan = argv.includes('all')
	const dedupMs = parseDedupMs(argv)

	let confirmMode = 'each'
	if (argv.includes('yes-all')) confirmMode = 'all'
	else if (argv.includes('yes-col') || argv.includes('yes-collection')) confirmMode = 'collection'

	const daysArg = argv.find((a, i) => isDaysToken(argv, i))

	const base = { scanOnly, confirmMode, dedupMs }

	if (fullScan) {
		return {
			...base,
			sinceTs: null,
			rangeLabel: '全量（所有含有效 ts 的记录）'
		}
	}

	const days = Number(daysArg || '30')
	if (Number.isNaN(days) || days <= 0) {
		console.error('时间范围请使用正整数天数，或使用 all 表示全量扫描')
		process.exit(1)
	}

	const sinceTs = Date.now() - days * 24 * 60 * 60 * 1000
	return {
		...base,
		sinceTs,
		rangeLabel: `近 ${days} 天 (ts >= ${sinceTs})`
	}
}

function confirmModeLabel (scanOnly, confirmMode) {
	if (scanOnly) return '仅扫描'
	if (confirmMode === 'all') return '扫描 + 一次性确认删除全部重复'
	if (confirmMode === 'collection') return '扫描 + 按集合确认后批量删除'
	return '扫描 + 逐条确认删除'
}

async function confirmAndDelete (items, scanOnly, confirmMode) {
	if (!items.length) {
		console.log('\n未发现疑似重复记录。')
		return { deleted: 0, skipped: 0, quit: false }
	}

	console.log(`\n共 ${items.length} 条疑似重复记录。`)

	if (scanOnly) {
		console.log('当前为 scan 模式，不执行删除。')
		for (let i = 0; i < items.length; i++) {
			printItemDetail(items[i], i, items.length)
		}
		return { deleted: 0, skipped: items.length, quit: false }
	}

	const rl = createReadline()
	let deleted = 0
	let skipped = 0
	let quit = false

	const isYes = (answer) => {
		const a = answer.toLowerCase()
		return a === 'y' || a === 'yes'
	}

	try {
		if (confirmMode === 'all') {
			console.log('\n将删除以下全部重复记录（各集合内保留最早一条）。')
			console.log('输入 y 确认全部删除，n 取消，q 退出\n')
			const previewLimit = 20
			for (let i = 0; i < Math.min(items.length, previewLimit); i++) {
				printItemDetail(items[i], i, items.length)
			}
			if (items.length > previewLimit) {
				console.log(`\n... 另有 ${items.length - previewLimit} 条未展示`)
			}

			const answer = await ask(rl, `\n确认删除全部 ${items.length} 条重复记录? [y/n/q]: `)
			if (answer.toLowerCase() === 'q' || answer.toLowerCase() === 'quit') {
				quit = true
				skipped = items.length
			} else if (isYes(answer)) {
				for (const [, batch] of groupByCollection(items)) {
					deleted += await deleteBatch(batch[0].col, batch)
				}
				skipped = items.length - deleted
				console.log(`\n批量删除完成: ${deleted} 条`)
			} else {
				skipped = items.length
				console.log('已取消，未删除任何记录')
			}
			return { deleted, skipped, quit }
		}

		if (confirmMode === 'collection') {
			console.log('\n按集合确认：每个集合输入 y 批量删除该集合内全部重复，n 跳过，q 退出\n')
			for (const [colName, batch] of groupByCollection(items)) {
				if (quit) {
					skipped += batch.length
					continue
				}

				console.log(`\n====== ${colName}：${batch.length} 条重复 ======`)
				const previewLimit = 5
				for (let i = 0; i < Math.min(batch.length, previewLimit); i++) {
					printItemDetail(batch[i], i, batch.length)
				}
				if (batch.length > previewLimit) {
					console.log(`... 另有 ${batch.length - previewLimit} 条未展示`)
				}

				const answer = await ask(rl, `删除 ${colName} 内全部 ${batch.length} 条重复? [y/n/q]: `)
				if (answer.toLowerCase() === 'q' || answer.toLowerCase() === 'quit') {
					quit = true
					skipped += batch.length
					continue
				}
				if (isYes(answer)) {
					const n = await deleteBatch(batch[0].col, batch)
					deleted += n
					skipped += batch.length - n
					console.log(`  -> 已删除 ${n} 条`)
				} else {
					skipped += batch.length
					console.log('  -> 已跳过该集合')
				}
			}
			return { deleted, skipped, quit }
		}

		console.log('\n逐条确认：输入 y 删除重复记录，n 跳过，q 退出\n')
		for (let i = 0; i < items.length; i++) {
			const { col, dup } = items[i]
			printItemDetail(items[i], i, items.length)

			const answer = (await ask(rl, '  删除此重复记录? [y/n/q]: ')).toLowerCase()

			if (answer === 'q' || answer === 'quit') {
				console.log('已退出，未处理剩余记录。')
				quit = true
				skipped += items.length - i
				break
			}

			if (answer === 'y' || answer === 'yes') {
				const n = await removeDocs(col, { _id: dup._id })
				if (n >= 1) {
					console.log('  -> 已删除')
					deleted++
				} else {
					console.log('  -> 删除失败（记录可能已不存在）')
					skipped++
				}
			} else {
				console.log('  -> 已跳过')
				skipped++
			}
		}
	} finally {
		rl.close()
	}

	return { deleted, skipped, quit }
}

function dedupMsLabel (dedupMs) {
	if (dedupMs === DEFAULT_DEDUP_MS) {
		return `${dedupMs}ms（默认，与 mabiPusher 一致）`
	}
	return `${dedupMs}ms（${(dedupMs / 1000).toFixed(3).replace(/\.?0+$/, '')} 秒内相同内容视为重复）`
}

async function main () {
	const { sinceTs, rangeLabel, scanOnly, confirmMode, dedupMs } = parseCli()

	console.log(`去重窗口: ${dedupMsLabel(dedupMs)}`)
	console.log(`扫描范围: ${rangeLabel}`)
	console.log(`模式: ${confirmModeLabel(scanOnly, confirmMode)}\n`)

	const client = await getClient()
	if (!client) {
		console.error('无法连接 MongoDB，请检查网络与 baibaiConfigs 中的 mongourl')
		process.exit(1)
	}
	const db = client.db('db_bot')

	try {
		const items = await runScan(db, sinceTs, dedupMs)
		const { deleted, skipped, quit } = await confirmAndDelete(items, scanOnly, confirmMode)

		console.log('\n======== 汇总 ========')
		console.log(`疑似重复: ${items.length} 条`)
		if (!scanOnly) {
			console.log(`已删除: ${deleted} 条`)
			console.log(`已跳过/未处理: ${skipped} 条`)
			if (quit) console.log('（用户中途退出）')
		}
	} finally {
		await client.close()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
