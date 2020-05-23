var http = require('http');
var https = require('https');
var qs = require('querystring');

const param = qs.stringify({
  'grant_type': 'client_credentials',
  'client_id': '5ziuCkS0e1uIXhqt9ogb0Rvw',
  'client_secret': 'LnqYm0ffWaNgdS5AlhvaGPl5D2FSFbXC'
});

const numberOcr = (url, callback) => {
  https.get(url, res => {
    var chunks = []
    var size = 0
    res.on('data', chunk => {
      chunks.push(chunk)
      size += chunk.length
    })
    res.on('end', err => {
      let data = Buffer.concat(chunks, size)
      let base64Img = data.toString('base64')
      https.get(
        {
          hostname: 'aip.baidubce.com',
          path: '/oauth/2.0/token?' + param,
          agent: false
        }, res2 => {
          let data = ''
          res2.on('data', d => data += d)
          res2.on('end', e => {
            // console.log(data)
            let token = JSON.parse(data).access_token
            if(token) {

              const postData = qs.stringify({
                'image': base64Img
              });

              let params = qs.stringify({
                'access_token': token
              })

              const options = {
                hostname: 'aip.baidubce.com',
                port: 443,
                path: `/rest/2.0/ocr/v1/numbers?${params}`,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Content-Length': Buffer.byteLength(postData)
                }
              };

              const req = https.request(options, (res) => {
                // console.log(`STATUS: ${res.statusCode}`);
                // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                  console.log(`BODY: ${chunk}`);
                });
                res.on('end', () => {
                  console.log('No more data in response.');
                });
              });

              req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
              });

              req.write(postData);
              req.end();

            }
          })
        }
      )
    })
  })
}

module.exports = {
  numberOcr
}