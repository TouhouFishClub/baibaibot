const assert = require('assert')
const {
	PRIVATE_DETECTIVE_POOL,
	normalizeGachaItemName,
	normalizeGachaPoolName,
	normalizeGachaRareMap,
	parseGachaEntriesFromArticle,
	parseGachaEntryFromArticle
} = require('./parser')

const maintenanceNotice = `
<dd class="cur" id="newscontent">
<p>Dear player:<br><br>&nbsp; &nbsp; 7:00-13:00 maintenance.<br><br>
Update:<br>&nbsp; &nbsp; - sound fix<br>&nbsp; &nbsp; - party fix<br>
&nbsp; &nbsp; - \u79c1\u5bb6\u4fa6\u63a2\u624b\u5e15\u793c\u5305[<font color="#0000ff"><u><a href="https://luoqi.tiancity.com/homepage/event/2026/0728sjztpl/" target="_blank">\u70b9\u51fb\u67e5\u770b\u6982\u7387</a></u></font>]
</p></dd>`

assert.deepStrictEqual(parseGachaEntryFromArticle(maintenanceNotice), {
	name: '\u79c1\u5bb6\u4fa6\u63a2\u624b\u5e15\u793c\u5305',
	link: 'https://luoqi.tiancity.com/homepage/event/2026/0728sjztpl/'
})

assert.strictEqual(parseGachaEntryFromArticle(`
<dd id="newscontent"><p>- \u754c\u57df\u4e3b\u5bb0\u624b\u5e15\u793c\u5305\u3010<a href="https://example.test/pool">\u70b9\u51fb\u67e5\u770b\u6982\u7387</a>\u3011</p></dd>
`).name, '\u754c\u57df\u4e3b\u5bb0\u624b\u5e15\u793c\u5305')

assert.strictEqual(parseGachaEntryFromArticle(`
<dd id="newscontent"><p>- \u661f\u7a79\u8ffd\u5bfb\u8005\u624b\u5e15\u793c\u5305[<a href="https://example.test/nested"><span>\u70b9\u51fb\u67e5\u770b\u6982\u7387</span></a>]</p></dd>
`).name, '\u661f\u7a79\u8ffd\u5bfb\u8005\u624b\u5e15\u793c\u5305')

assert.strictEqual(parseGachaEntryFromArticle(`
<dd id="newscontent"><p>ordinary maintenance notice</p></dd>
`), null)

assert.strictEqual(normalizeGachaPoolName(' - 新增神秘手帕礼包 '), '神秘手帕礼包')

const multiplePoolsNotice = `
<dd class="cur" id="newscontent"><p>
- \u6ca7\u6f9c\u6d77\u97f5\u624b\u5e15\u793c\u5305[<a href="https://example.test/old">\u70b9\u51fb\u67e5\u770b\u6982\u7387</a>]<br>
- \u795e\u79d8\u624b\u5e15\u793c\u5305[<a href="https://example.test/new"><span>\u70b9\u51fb\u67e5\u770b\u6982\u7387</span></a>]
</p></dd>`

assert.deepStrictEqual(parseGachaEntriesFromArticle(multiplePoolsNotice), [
	{ name: '\u6ca7\u6f9c\u6d77\u97f5\u624b\u5e15\u793c\u5305', link: 'https://example.test/old' },
	{ name: '\u795e\u79d8\u624b\u5e15\u793c\u5305', link: 'https://example.test/new' }
])

assert.deepStrictEqual(parseGachaEntriesFromArticle(`
<dd id="newscontent"><p>- 新增神秘手帕礼包[<a href="https://example.test/new">点击查看概率</a>]</p></dd>
`), [
	{ name: '神秘手帕礼包', link: 'https://example.test/new' }
])

assert.strictEqual(
	normalizeGachaItemName(PRIVATE_DETECTIVE_POOL, '\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957'),
	'\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957'
)
assert.strictEqual(
	normalizeGachaItemName('older pool', '\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957'),
	'\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957'
)
assert.deepStrictEqual(normalizeGachaRareMap(PRIVATE_DETECTIVE_POOL, {
	S: ['eeffb1', '5.86', [
		'\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957',
		'\u9ed1\u6697\u7684\u79c1\u5bb6\u4fa6\u63a2\u5939\u514b'
	]]
}), {
	S: ['eeffb1', '5.86', [
		'\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5916\u5957',
		'\u7eaf\u6d01\u7684\u79c1\u5bb6\u4fa6\u63a2\u5939\u514b'
	]],
	A: ['', '', []],
	B: ['', '', []],
	C: ['', '', []],
	D: ['', '', []]
})

assert.deepStrictEqual(normalizeGachaRareMap('\u795e\u79d8\u624b\u5e15\u793c\u5305', {
	'\u81f3\u5c0a': ['eeffb1', '0.03', ['\u7ec8\u6781\u547d\u8fd0\u9009\u62e9\u7bb1']],
	'\u65f6\u5c1a': ['cde285', '40.00', ['\u65f6\u5c1a\u5de5\u574a\u5e03\u6599']],
	'\u666e\u901a': ['76c0ed', '59.97', ['\u666e\u901a\u5de5\u574a\u5e03\u6599']]
}), {
	S: ['eeffb1', '0.03', ['\u7ec8\u6781\u547d\u8fd0\u9009\u62e9\u7bb1']],
	A: ['cde285', '40.00', ['\u65f6\u5c1a\u5de5\u574a\u5e03\u6599']],
	B: ['76c0ed', '59.97', ['\u666e\u901a\u5de5\u574a\u5e03\u6599']],
	C: ['', '', []],
	D: ['', '', []]
})

console.log('gacha article parser tests passed')
