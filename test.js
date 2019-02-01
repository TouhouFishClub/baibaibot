const https = require('https')
const express = require('express')
const app = express()
const fs = require('fs')

app.listen('8233', () => {
  console.log('server started')
  console.log('http://localhost:8233')
})

app.get('/test', (req, resp) => {
  resp.set("Access-Control-Allow-Origin", "*")
  https.get('https://gchat.qpic.cn/gchatpic_new/910257409/549823679-2979707122-74D6A9D2F745E13BB897303CFB1B2ED6/0?vuin=2375373419&term=2', res => {
    res.pipe(resp)
    let rawData = [], count = 0, length = 0
    res.on('data', chunk => {
      console.log(`=== chunk ${count} ===`)
      rawData.push(chunk)
      length += chunk.length
      count ++
    })
    res.on('end', () => {
      console.log('===== end =====')
      console.log(rawData)
      let buffer = Buffer.concat(rawData, length)
      console.log('=== buffer ===')
      console.log(Buffer.isBuffer(buffer))
      let rs = fs.createReadStream(str)
      console.log(typeof rs)
      rs.pipe(resp)
    })
  })
  // res.send(optionData)
})
