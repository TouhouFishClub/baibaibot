const https = require('https')
const qs = require('qs')
let GroupExpire = {

}

let DataExpire = {
  data: [],
  expire: 0
}

const getVoteData = (page, type, status) => new Promise((resolve, reject) => {
  let options = {
    host: 'evt05.tiancity.com',
    port: 443,
    path: '/luoqi/51724/home/index.php/comfort',
    method: 'POST',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    }
  }
  let postObj = {
    page, type, status
  }
  let postData = qs.stringify(postObj)

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    let data = ''
    res.on('data', (chunk) => {
      // console.log(chunk)
      data += chunk
    });
    res.on('end', () => {
      console.log(`=== request data ${page} ===`)
      resolve(data)
    });
    res.on('error', e => {
      console.log('=== request res error ===')
      reject(e.message)
    })
  });

  req.on('error', (e) => {
    console.log('=== request req error ===')
    reject(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
})

const fixStrLength = (targetLength, str) => {
  let sl =  str.replace(/[^\u0000-\u00ff]/g, "aa").length
  if (sl < targetLength) {
    return `${str}${new Array(targetLength - sl).fill(' ').join('')}`
  }
  return str
}

const searchTarget = (listData, targetName) => {
  let index = listData.findIndex(x => x.name == targetName)
  if(index < 0) {
    return {page:0,line:0,index:0}
  }
  let page = ~~(index / 12) + 1
  index = index % 12
  let line = ~~(index / 3) + 1
  index = index % 3 + 1
  return {page, line, index}
}

const init = async () => {
  let listData = []
  for(let i = 1; i < 5; i ++) {
    let d = await getVoteData(i,1,2)
    try {
      d = JSON.parse(d)
      listData = listData.concat(d.data.lists)
    } catch(e) {
      console.log(e)
    }
  }
  listData.sort((a, b) => b.count - a.count)
  let {page, line, index} = searchTarget(listData, 'Flandre')
  console.log(`目标在第${page}页，第${line}行，第${index}个`)
  console.log(listData.map(x => `[${fixStrLength(4, x.id)}][${['亚特  ','伊鲁夏'][x.server - 1]}]${fixStrLength(12, x.name)}: 《${x.content}》(${x.count})`).join('\n'))
}
init()