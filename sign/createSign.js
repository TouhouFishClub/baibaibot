const fs = require('fs-extra')
const secret = fs.readFileSync('./secret.txt', 'utf-8')
const crypto = require('crypto')


const createSign = (qq, admin) =>
  crypto.createHash('md5')
    .update(`${qq}_${admin}_${secret}`)
    .digest('hex')
    .toLowerCase()

// console.log(createSign(799018865, 799018865))

module.exports = {
  createSign
}
