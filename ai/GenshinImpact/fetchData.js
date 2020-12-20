const https = require('https')

const searchData = async content => {
  return new Promise((resolve, reject) => {
    https.get({
      host: 'api-takumi.mihoyo.com',
      port: 443,
      path: `/common/blackboard/ys_obc/v1/search/content?app_sn=ys_obc&keyword=${encodeURIComponent(content)}&page=1`,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Accept':'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
      },
    }, res => {
      let chunk = ''
      res.on('data', data => {
        chunk += data
      })
      res.on('end', () => {
        if(chunk) {
          resolve(JSON.parse(chunk))
        } else {
          reject({})
        }
      })
    }).on('error', (e) => {
      console.log('=== GET GENSHIN IMPACT DATA ERROR ===')
      console.log(e)
      resolve(e)
    })
  })
}

const getPage = async pageId => {
  return new Promise((resolve, reject) => {
    https.get({
      host: 'bbs.mihoyo.com',
      port: 443,
      path: `/ys/obc/content/${pageId}/detail?bbs_presentation_style=no_header`,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Accept':'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
      },
    }, res => {
      let chunk = ''
      res.on('data', data => {
        chunk += data
      })
      res.on('end', () => {
        if(chunk) {
          resolve(chunk)
        } else {
          reject({})
        }
      })
    }).on('error', (e) => {
      console.log('=== GET GENSHIN IMPACT PAGE ERROR ===')
      console.log(e)
      resolve(e)
    })

  })
}

const search = async content => {
  let res = await searchData(content)
  if(res && res.message == 'OK' && res.data && res.data.list && res.data.list.length > 0){
    let target = res.data.list[0]
    if(target.title.match(RegExp(content))) {
      let page = await getPage(target.id)
      return new Promise((resolve, reject) => {
        resolve(page)
      })
    } else {
      return new Promise((resolve, reject) => {
        resolve({status: 'err', msg: '查找失败'})
      })
    }
  } else {
    return new Promise((resolve, reject) => {
      resolve({status: 'err', msg: '查找失败'})
    })
  }
}

module.exports = {
  search,
  searchData,
  getPage,
}