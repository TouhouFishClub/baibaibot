const os = require('./optionset')
const app = require('express')()
os('aaa', '10805', c => {console.log(c)})
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