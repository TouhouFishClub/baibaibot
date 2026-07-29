const assert = require('assert')
const {
	PRIVATE_DETECTIVE_POOL,
	normalizeGachaItemName,
	normalizeGachaRareMap,
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
	]]
})

console.log('gacha article parser tests passed')
