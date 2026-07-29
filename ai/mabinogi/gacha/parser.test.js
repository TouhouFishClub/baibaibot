const assert = require('assert')
const { parseGachaEntryFromArticle } = require('./parser')

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

console.log('gacha article parser tests passed')
