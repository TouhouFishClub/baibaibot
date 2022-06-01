const https = require('https')

const fetchData = async content => {
  return new Promise(resolve => {
    https.get(`https://ygocdb.com/api/v0/?search=${content}`, res => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', chunk => {
        rawData += chunk
      });
      res.on('end', () => {
        resolve(rawData)
      })
      res.on('error', e => {
        console.log(`===== FETCH DATA ERROR：${content} =====`)
        console.log(e.message)
        resolve('')
      })
    })

  })
}

const renderCard = (data, callback) => {
  let out = `[ID: ${data.id}]\n${data.cn_name}${data.cn_name != data.cnocg_n ? `(${data.cnocg_n})` : ''}\n${data.text.types}\n${data.text.desc}\n${data.text.pdesc}`
  callback(out)
}

const ygo = async (content, callback) => {
  if(!content.length) {
    return
  }
  let d = await fetchData(content)
  console.log(d)
  try {
    d = JSON.parse(d)
  } catch (err) {
    console.log('转换json失败')
    console.log(err)
  }
  if(d.result.length) {
    if(d.result.length > 1) {
      callback(`找到${d.result.length}张卡\n${d.result.slice(0, 10).map(x => `ygo ${x.id} | ${x.cn_name}${x.cn_name != x.cnocg_n ? `(${x.cnocg_n})` : ''}`).join('\n')}`)
    } else {
      renderCard(d.result[0], callback)
    }
  } else {
    callback('未找到任何卡')
  }
}


module.exports = {
  ygo
}

