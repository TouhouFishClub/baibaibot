const fs = require('fs')
const path = require('path')
const https = require('https')
const querystring =  require('querystring')

module.exports = function(optsName, optsId, callback) {
  const postData = querystring.stringify({
    'search_en': optsName,
    'submit': '搜尋',
  });

  const options = {
    hostname: 'mabinogi.fws.tw',
    port: 443,
    path: '/how_enchant.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => {
      rawData += chunk
    });
    res.on('end', () => {
      let wheres = [], index = rawData.indexOf('<td class="a0">'), str
      if(index > -1){
        str = rawData.substr(index)
        str = str.substring(15, str.indexOf('</td>'))
        wheres = str.split('<br />')
        wheres.pop()
        wheres = wheres.map(list => {
          let sp = list.split('→'), article = sp[0], where = sp[1]
          if(article.indexOf('">') > -1){
            article = article.substr(article.indexOf('">'))
            article = article.substring(2, article.indexOf('</a>'))
          }
          if(where.indexOf('">') > -1){
            where = where.substr(where.indexOf('">'))
            where = where.substring(2, where.indexOf('</a>'))
          }
          return {
            article: article,
            where: where
          }
        })
      }
      callback(wheres)
    });
  });
  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });
  req.write(postData);
  req.end();
}