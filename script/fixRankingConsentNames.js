// Repair UTF-8 character names that were decoded as Latin-1 from X-Player-Name.
// Usage:
//   node script/fixRankingConsentNames.js
//   node script/fixRankingConsentNames.js --apply
//   node script/fixRankingConsentNames.js --player-id 4503599642404785 --apply
const { getClient } = require('../mongo/index')

const DB_NAME = 'db_bot'
const COLLECTION = 'cl_mabinogi_dps_ranking_consent'

function parseCli (argv) {
	const apply = argv.includes('--apply')
	const idArg = argv.find((arg) => arg.startsWith('--player-id='))
	const idIndex = argv.indexOf('--player-id')
	const playerId = idArg
		? idArg.slice('--player-id='.length).trim()
		: idIndex >= 0 ? String(argv[idIndex + 1] || '').trim() : ''

	if (idIndex >= 0 && !playerId) {
		throw new Error('--player-id requires a value')
	}
	return { apply, playerId }
}

function containsControlCharacter (value) {
	return /[\u0000-\u001f\u007f-\u009f]/.test(value)
}

function recoverUtf8Name (value) {
	const original = String(value || '').trim()
	if (!original || Array.from(original).some((char) => char.codePointAt(0) > 0xff)) {
		return null
	}

	const recovered = Buffer.from(original, 'latin1').toString('utf8')
	if (!recovered || recovered === original || recovered.includes('\ufffd')) return null
	if (containsControlCharacter(recovered)) return null

	// Only accept a lossless inverse of the exact UTF-8-as-Latin-1 corruption.
	const roundTrip = Buffer.from(recovered, 'utf8').toString('latin1')
	if (roundTrip !== original) return null
	if (!Array.from(recovered).some((char) => char.codePointAt(0) > 0x7f)) return null

	return recovered
}

async function findCandidates (collection, playerId) {
	const query = playerId ? { playerId } : {}
	const rows = await collection.find(query).sort({ createdAt: 1 }).toArray()
	return rows
		.map((row) => ({ row, recoveredName: recoverUtf8Name(row.playerName) }))
		.filter((item) => item.recoveredName)
}

async function main () {
	const { apply, playerId } = parseCli(process.argv.slice(2))
	const client = await getClient()
	if (!client) throw new Error('Unable to connect to MongoDB')

	try {
		const collection = client.db(DB_NAME).collection(COLLECTION)
		const candidates = await findCandidates(collection, playerId)

		console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
		console.log(`Candidates: ${candidates.length}`)
		for (const { row, recoveredName } of candidates) {
			console.log(`${row.playerId}: ${JSON.stringify(row.playerName)} -> ${JSON.stringify(recoveredName)}`)
		}

		if (!apply) {
			console.log('No data changed. Re-run with --apply after checking the preview.')
			return
		}

		let updated = 0
		let skipped = 0
		for (const { row, recoveredName } of candidates) {
			// Include the old value to avoid overwriting a concurrent user update.
			const result = await collection.updateOne(
				{ _id: row._id, playerName: row.playerName },
				{ $set: { playerName: recoveredName, nameUpdatedAt: new Date() } }
			)
			if (result.modifiedCount || result.nModified) updated++
			else skipped++
		}

		console.log(`Updated: ${updated}`)
		console.log(`Skipped due to concurrent changes: ${skipped}`)
	} finally {
		await client.close()
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error.message || error)
		process.exit(1)
	})
}

module.exports = {
	parseCli,
	recoverUtf8Name
}
