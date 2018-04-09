const fo = require('./formatOptionset')
const app = require('express')()
app.listen('8233', () => {
  console.log('server started')
  console.log('http://localhost:8233')
})
app.get('/', (req, res) => {
  fo(d => {
    // console.log(d)
    res.send(d);
  })
})