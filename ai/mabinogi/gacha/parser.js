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

const normalizeGachaItemName = (poolName, itemName) => {
	if(poolName !== PRIVATE_DETECTIVE_POOL) return itemName
	return PRIVATE_DETECTIVE_ITEM_NAME_CORRECTIONS[itemName] || itemName
}

const normalizeGachaRareMap = (poolName, raremap) => {
	const normalized = {}
	for(const rareTag of Object.keys(raremap || {})) {
		const rareInfo = raremap[rareTag]
		if(!Array.isArray(rareInfo) || !Array.isArray(rareInfo[2])) {
			normalized[rareTag] = rareInfo
			continue
		}
		normalized[rareTag] = [
			rareInfo[0],
			rareInfo[1],
			rareInfo[2].map(itemName => normalizeGachaItemName(poolName, itemName))
		]
	}
	return normalized
}

const parseGachaEntryFromArticle = article => {
	if(String(article || '').indexOf('id="newscontent"') === -1) {
		return null
	}
	const newsContent = splitStr(article, 'id="newscontent"', '</dd>', true)
	if(!newsContent) {
		return null
	}

	// The probability link is the stable marker. Maintenance notices can
	// contain several '-' items before the link, so parsing the whole line
	// produces a name made from the notice text.
	const linkRegExp = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/ig
	let linkMatch
	let candidate
	while((candidate = linkRegExp.exec(newsContent))) {
		const linkText = candidate[2].replace(/<[^>]*>/g, '').trim()
		if(linkText.indexOf('\u67e5\u770b\u6982\u7387') > -1) {
			linkMatch = candidate
			break
		}
	}
	if(!linkMatch) {
		return null
	}

	const beforeLink = newsContent.substring(0, linkMatch.index)
	const lines = beforeLink
		.replace(/<br\s*\/?>/gi, '\n')
		.split(/\r?\n/)
	let name = lines[lines.length - 1]
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;|&#160;/gi, ' ')
		.replace(/^>\s*/, '')
		.replace(/^\s*[-\u2013\u2014]\s*/, '')
		.replace(/[\[【][\s\S]*$/, '')
		.trim()

	if(!name || !name.match(/\u793c\u5305|\u624b\u5e15|\u94a5\u5319/)) {
		return null
	}

	return {
		name,
		link: linkMatch[1]
	}
}

module.exports = {
	PRIVATE_DETECTIVE_ITEM_NAME_CORRECTIONS,
	PRIVATE_DETECTIVE_POOL,
	normalizeGachaItemName,
	normalizeGachaRareMap,
	parseGachaEntryFromArticle
}
