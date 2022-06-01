const https = require('https')
const fs = require('fs-extra')
const path = require('path-extra')


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
  let out = `[ID: ${data.id}]\n[CQ:image,file=https://cdn.233.momobako.com/ygopro/pics/${data.id}.jpg]\n${data.cn_name}${data.cn_name != data.cnocg_n ? `(${data.cnocg_n})` : ''}\n${data.text.types}\n${data.text.desc}\n${data.text.pdesc}`
  callback(out)
}

const ygo = async (content, callback) => {
  if(!content.length) {
    return
  }

  //https://cdn.233.momobako.com/ygopro/pics/14558127.jpg!half

  let allData = fs.readJsonSync(path.join(__dirname, 'cards.json'))
  let result, d
  if(/^\d+$/.test(content)) {
    result = [allData[content]].filter(x => x)
  } else {
    result = Object.values(allData).filter(x => (x.cn_name && x.cn_name.match(content)) || (x.cnocg_n && x.cnocg_n.match(content)))
  }
  d = {
    result
  }

  // let d = await fetchData(content)
  // try {
  //   d = JSON.parse(d)
  // } catch (err) {
  //   console.log('转换json失败')
  //   console.log(err)
  // }
  if(d.result && d.result.length) {
    if(d.result.length > 1) {
      callback(`找到${d.result.length}张卡\n${d.result.slice(0, 10).map(x => `ygo ${x.cid} | ${x.cn_name}${x.cn_name != x.cnocg_n ? `(${x.cnocg_n})` : ''}`).join('\n')}`)
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

