const os = require('./optionset')
const app = require('express')()
// os('aaa', '猎狮', 'image', c => {console.log(c)})
const https = require('https')
const querystring =  require('querystring')

const ow = require('./tools/optionsetWhere')

const rua = require('./ruawork')
// rua(data => console.log(data))

os('aa', '珍贵的', 'normal', d => {
  console.log(d)
})

// const draw = require('./tools/optionsetImage')
// draw({ ID: '21527',
//   Name: 'The Wing of Doll',
//   LocalName: '玩偶的翅膀',
//   OptionDesc: '可以对操纵杆进行魔法释放\\n第6幕: 诱惑陷阱等级1段以上时，敏捷增加15\\n第6幕: 诱惑陷阱等级3段以上时，人偶最大伤害增加14～18\\n第4幕: 嫉妒的化身等级1段以上时，人偶生命值增加50\\n第4幕: 嫉妒的化身等级3段以上时， 人偶最小伤害增加9～12\\n[平衡减少10]\\n[修理费10倍]\\n可无视等级进行魔法释放\\n[魔法释放后的装备会变成专用道具]',
//   LevelQuery: 1,
//   Level: 1,
//   Usage: '接头',
//   UsageQuery: '0',
//   Buff:
//     [ '可以对操纵杆进行魔法释放',
//       '第6幕: 诱惑陷阱等级1段以上时，敏捷增加15',
//       '第6幕: 诱惑陷阱等级3段以上时，人偶最大伤害增加14～18',
//       '第4幕: 嫉妒的化身等级1段以上时，人偶生命值增加50',
//       '第4幕: 嫉妒的化身等级3段以上时， 人偶最小伤害增加9～12',
//       '可无视等级进行魔法释放' ],
//   Debuff: [ '平衡减少10', '修理费10倍', '魔法释放后的装备会变成专用道具' ] },
//   [ { article: '破損魂獵人長靴', where: '2015-3-12 ~ 2015-3-30 復活節轉蛋' },
//   { article: '破損魂修行者長靴', where: '2015-3-12 ~ 2015-3-30 復活節轉蛋' },
//   { article: '破損魂獵人長靴', where: '2015-07-16 ~ 2015-08-06 鬼月轉蛋' },
//   { article: '破損魂修行者長靴', where: '2015-07-16 ~ 2015-08-06 鬼月轉蛋' },
//   { article: '魔力賦予卷軸', where: '深淵貝卡高級地下城最後寶箱' } ])

// ow("Fox Hunter's", '111', d => console.log(d))

// const req = https.request({
//   hostname: 'mabinogi.fws.tw',
//   port: 443,
//   path: '/how_enchant.php',
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/x-www-form-urlencoded',
//     'Content-Length': Buffer.byteLength(querystring.stringify({
//       'search_en': 'Daydream',
//       'submit': '搜尋',
//     }))
//   }
// }, res => {
//   res.setEncoding('utf8');
//   res.on('data', (chunk) => {
//     console.log(`BODY: ${chunk}`);
//   });
//   res.on('end', () => {
//     console.log('No more data in response.');
//   });
// })
//
//
// const postData = querystring.stringify({
//   'search_en': 'Daydream',
//   'submit': '搜尋',
// });
//
// const options = {
//   hostname: 'mabinogi.fws.tw',
//   port: 443,
//   path: '/how_enchant.php',
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/x-www-form-urlencoded',
//     'Content-Length': Buffer.byteLength(postData)
//   }
// };
//
// const req = https.request(options, (res) => {
//   // console.log(`STATUS: ${res.statusCode}`);
//   // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
//   res.setEncoding('utf8');
//   res.on('data', (chunk) => {
//     console.log(`BODY: ${chunk}`);
//   });
//   res.on('end', () => {
//     console.log('No more data in response.');
//   });
// });
//
// req.on('error', (e) => {
//   console.error(`problem with request: ${e.message}`);
// });
//
// // write data to request body
// req.write(postData);
// req.end();


//
// req.on('error', (e) => {
//   console.error(`problem with request: ${e.message}`);
// });
//
// // write data to request body
// req.write(postData);
// req.end();
// app.listen('8233', () => {
//   console.log('server started')
//   console.log('http://localhost:8233')
// })
// app.get('/', (req, res) => {
//   os('aaa', '', d => {
//     // console.log(d)
//     res.send(d);
//   })
// })