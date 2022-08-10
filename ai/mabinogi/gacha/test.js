const { mabiGacha, fetchData, loadGachaGroup } = require('./index');
// mabiGacha('111', d => {
// 	console.log(d)
// })
	(async () => {
		// for(let i = 1; i < 10; i ++) {
		// 	let res = await loadGachaGroup(i, true)
		// 	console.log(res)
		// }
		// let d = await fetchData('https://luoqi.tiancity.com/homepage/event/2022/0810djcpl/')
		// console.log(d)
		await mabiGacha(799018865, d => {
			console.log(d)
		})
	})()
// var HTMLParser = require('node-html-parser');
//
// var root = HTMLParser.parse(`<table border="1">
//   <tr>
//     <td rowspan="4">a</td>
//     <td>a1</td>
//   </tr>
//   <tr>
//     <td>a2</td>
//   </tr>
//   <tr>
//     <td>a3</td>
//   </tr>
//   <tr>
//     <td>a4</td>
//   </tr>
//   <tr>
//     <td rowspan="3">b</td>
//     <td>b1</td>
//   </tr>
//   <tr>
//     <td>b2</td>
//   </tr>
//   <tr>
//     <td>b3</td>
//   </tr>
//   <tr>
//     <td rowspan="4">c</td>
//     <td>c1</td>
//   </tr>
//   <tr>
//     <td>c2</td>
//   </tr>
//   <tr>
//     <td>c3</td>
//   </tr>
//   <tr>
//     <td>c4</td>
//   </tr>
// </table>`);
//
//
// root.querySelectorAll('tr').forEach(tr => {
// 	console.log('=============')
// 	tr.querySelectorAll('td').forEach(td => {
// 		console.log(td.text)
// 	})
// })
