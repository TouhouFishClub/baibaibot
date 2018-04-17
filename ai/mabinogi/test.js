const os = require('./optionset')
const app = require('express')()
os('aaa', '持久', c => {console.log(c)})
const https = require('https')
const querystring =  require('querystring')

const ow = require('./tools/optionsetWhere')

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