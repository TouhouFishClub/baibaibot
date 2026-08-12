const splitStr = (str, start, end, ignoreSearch = false) => {
	let subStr = String(str || '')
	const st = subStr.indexOf(start)
	if(start && st >= 0) {
		subStr = subStr.substring(st + (ignoreSearch ? start.length : 0))
	}
	const et = subStr.indexOf(end)
	if(end && et >= 0) {
		subStr = subStr.substring(0, et + (ignoreSearch ? 0 : end.length))
	}
	return subStr
}

const PRIVATE_DETECTIVE_POOL = '\u79c1\u5bb6\u4fa6\u63a2\u624b\u5e15\u793c\u5305'
const PRIVATE_DETECTIVE_ITEM_NAME_CORRECTIONS = {
	'\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957': '\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957',
	'\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5939\u514b': '\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5939\u514b'
}

const GACHA_RARE_TAG_ALIASES = {
	'\u81f3\u5c0a': 'S',
	'\u65f6\u5c1a': 'A',
	'\u666e\u901a': 'B'
}

const STANDARD_RARE_TAGS = ['S', 'A', 'B', 'C', 'D']

const normalizeGachaPoolName = name => String(name || '')
	.replace(/^\s*[-\u2013\u2014]?\s*新增\s*/, '')
	.trim()

const normalizeGachaItemName = (poolName, itemName) => {
	if(poolName !== PRIVATE_DETECTIVE_POOL) return itemName
	return PRIVATE_DETECTIVE_ITEM_NAME_CORRECTIONS[itemName] || itemName
}

const normalizeGachaRareMap = (poolName, raremap) => {
	const normalized = {}
	for(const rareTag of Object.keys(raremap || {})) {
		const rareInfo = raremap[rareTag]
		const normalizedRareTag = GACHA_RARE_TAG_ALIASES[rareTag] || rareTag
		if(!Array.isArray(rareInfo) || !Array.isArray(rareInfo[2])) {
			normalized[normalizedRareTag] = rareInfo
			continue
		}
		normalized[normalizedRareTag] = [
			rareInfo[0],
			rareInfo[1],
			rareInfo[2].map(itemName => normalizeGachaItemName(poolName, itemName))
		]
	}
	for(const rareTag of STANDARD_RARE_TAGS) {
		if(!normalized[rareTag]) normalized[rareTag] = ['', '', []]
	}
	return normalized
}

const extractGachaNameBeforeLink = (newsContent, linkIndex) => {
	const beforeLink = newsContent.substring(0, linkIndex)
	const lines = beforeLink
		.replace(/<br\s*\/?>/gi, '\n')
		.split(/\r?\n/)
	return lines[lines.length - 1]
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;|&#160;/gi, ' ')
		.replace(/^>\s*/, '')
		.replace(/^\s*[-\u2013\u2014]\s*/, '')
		.replace(/[\[【][\s\S]*$/, '')
		.trim()
}

const parseGachaEntriesFromArticle = article => {
	if(String(article || '').indexOf('id="newscontent"') === -1) {
		return []
	}
	const newsContent = splitStr(article, 'id="newscontent"', '</dd>', true)
	if(!newsContent) {
		return []
	}

	// The probability link is the stable marker. Maintenance notices can
	// contain several '-' items before the link, so parsing the whole line
	// produces a name made from the notice text.
	const linkRegExp = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig
	const entries = []
	let candidate
	while((candidate = linkRegExp.exec(newsContent))) {
		const linkText = candidate[2].replace(/<[^>]*>/g, '').trim()
		if(linkText.indexOf('\u67e5\u770b\u6982\u7387') === -1) continue

		const name = normalizeGachaPoolName(extractGachaNameBeforeLink(newsContent, candidate.index))
		if(!name || !name.match(/\u793c\u5305|\u624b\u5e15|\u94a5\u5319/)) continue

		entries.push({
			name,
			link: candidate[1]
		})
	}
	return entries
}

const parseGachaEntryFromArticle = article => parseGachaEntriesFromArticle(article)[0] || null

module.exports = {
	GACHA_RARE_TAG_ALIASES,
	normalizeGachaPoolName,
	PRIVATE_DETECTIVE_ITEM_NAME_CORRECTIONS,
	PRIVATE_DETECTIVE_POOL,
	normalizeGachaItemName,
	normalizeGachaRareMap,
	parseGachaEntriesFromArticle,
	parseGachaEntryFromArticle
}
