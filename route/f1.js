const fs = require('fs')
const path = require('path')
const https = require('https')
const SECRET = '9ae4c65eb6170863630fe0b9f5bdb1ff'
const APPID = 'wxd9959a1df47cc313'

function handlef1(req,res){

  getToken(res)

  // var path = req.path;
  // console.log(path);
  // res.set('Content-Type','text/plain');
  // res.send('ok\n'+path);
}

const getToken = (res) => {
  https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`, resp => {
    let data = ''
    resp.on('data', chunk =>{
      data += chunk
    })
    resp.on('end', err => {
      let d = JSON.parse(data)
      if(d.access_token){
        getTicket(d.access_token, res)
      } else {
        console.log('获取access_token失败\n', d)
      }
    });
  })
}

const getTicket = (token, res) => {
  https.get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`, re => {
    let td = ''
    re.on('data', chunk => {
      td += chunk
    })
    re.on('end', error => {
      let tc = JSON.parse(td)
      if(tc.ticket){
        createSign(tc.ticket, res)

      } else {
        console.log('获取ticket失败\n', tc)
      }
    })
  })
}

const createSign = (ticket, res) => {

}

module.exports={
  handlef1
}
