const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')
const SECRET = '9ae4c65eb6170863630fe0b9f5bdb1ff'
const APPID = 'wxd9959a1df47cc313'
const noncestr = 'Wm3WZYTPz0wzccnW'

function handlef1(req, res){
  getToken(req.query.url || 'https://flandrescarlet.gitee.io/tools/wechat/', res)

  // var path = req.path;
  // console.log(path);
  // res.set('Content-Type','text/plain');
  // res.send('ok\n'+path);
}

const getToken = (url, res) => {
  https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`, resp => {
    let data = ''
    resp.on('data', chunk =>{
      data += chunk
    })
    resp.on('end', err => {
      let d = JSON.parse(data)
      if(d.access_token){
        getTicket(url, d.access_token, res)
      } else {
        console.log('获取access_token失败\n', d)
        res.set("Access-Control-Allow-Origin", "*")
        res.set('Content-Type','text/plain')
        res.send(JSON.stringify({"status": "err", "msg": "获取access_token失败"}))
      }
    });
  })
}

const getTicket = (url, token, res) => {
  https.get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`, re => {
    let td = ''
    re.on('data', chunk => {
      td += chunk
    })
    re.on('end', error => {
      let tc = JSON.parse(td)
      if(tc.ticket){
        createSign(url, tc.ticket, res)

      } else {
        console.log('获取ticket失败\n', tc)
        res.set("Access-Control-Allow-Origin", "*")
        res.set('Content-Type','text/plain')
        res.send(JSON.stringify({"status": "err", "msg": "获取ticket失败"}))
      }
    })
  })
}

const createSign = (url, ticket, res) => {
  let sha1 = crypto.createHash('sha1'), now = ~~(Date.now()/1000)
  let data = {
    appId: APPID,
    timestamp: now,
    nonceStr: noncestr,
    signature: sha1.update(`jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${now}&url=${url}`).digest('hex')
  }
  res.set("Access-Control-Allow-Origin", "*")
  res.set('Content-Type','text/plain')
  res.send(JSON.stringify({
    status: 'ok',
    data: data
  }))
}

module.exports={
  handlef1
}
