const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const querystring =  require('querystring')
const iconv = require('iconv-lite')
const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://192.168.17.52:27050/db_bot'
// const MONGO_URL = 'mongodb://127.0.0.1:27017/db_bot'

let client, collection

const optionsetWhere = (optsName, optsId, callback) => {
  return new Promise((resolve, reject) => {

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
        let wheres = [], rw = [], index = rawData.indexOf('<td class="a0">'), str
        if(index > -1){
          str = rawData.substr(index)
          str = str.substring(15, str.indexOf('</td>'))
          wheres = str.split('<br />')
          wheres.pop()
          wheres.forEach(list => {
            let sp = list.split('→')
            if(sp.length === 2){
              let article = sp[0], where = sp[1]
              article = article.toLowerCase()
              where = where.toLowerCase()
              if(article.indexOf('">') > -1){
                article = article.substr(article.indexOf('">'))
                article = article.substring(2, article.indexOf('</a>'))
              }
              if(where.indexOf('">') > -1){
                where = where.substr(where.indexOf('">'))
                where = where.substring(2, where.indexOf('</a>'))
              }
              rw.push({
                article: article.replace(/[\r|\n]/g, ''),
                where: where.replace(/[\r|\n]/g, '')
              })
            }
          })
        }
        resolve(rw)
      });
    });
    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
      resolve([])
    });
    req.write(postData);
    req.end();
  })
}
const optionsetWhereCn = async ( optsNameCN, level ) => {
  // console.log(optsNameCN)
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR MABINOGI MODULE!!')
      console.log(e)
    }
  }
  collection = client.collection('cl_mabinogi_optionset')
  let find = await collection.findOne({'_id': `${optsNameCN}_${level}`})
  // console.log(find)
  return find
    ?
    (
      (find.customWhere && find.customWhere.length)
        ?
        find.customWhere.concat([`author: ${find.author || ''}`])
        :
        find.where
          ?
          find.where
          :
          []
    )
    :
    []
}
const optionsetWhereCnHandler = async ( type, author, optsNameCN, level, context, callback, options) => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR MABINOGI MODULE!!')
      console.log(e)
    }
  }
  collection = client.collection('cl_mabinogi_optionset')
  let find = await collection.findOne({'_id': `${optsNameCN}_${level}`}), customWhere
  if(find) {
    switch(type) {
      case 'set':
        await collection.updateOne(
          { '_id': `${optsNameCN}_${level}` },
          {
            '$set': {
              Usage: options.UsageQuery,
              customWhere: context.split('\n').map(x => x.replage(/\r/g, '')).filter(x => x.trim()),
              level,
              author
            }
          }
        )
        callback(`${optsNameCN} 设置成功`)
        break
      case 'add':
        customWhere = find.customWhere || []
        customWhere = customWhere.concat(context.split('\n').map(x => x.replage(/\r/g, '')).filter(x => x.trim()))
        await collection.updateOne(
          { '_id': `${optsNameCN}_${level}` },
          {
            '$set': {
              Usage: options.UsageQuery,
              customWhere,
              level,
              author
            }
          }
        )
        callback(`${optsNameCN} 设置成功`)
        break
      case 'remove':
        customWhere = find.customWhere || []
        if(customWhere.indexOf(context.trim()) > -1) {
          customWhere = customWhere.filter(x => x !== context.trim())
          await collection.updateOne(
            { '_id': `${optsNameCN}_${level}` },
            {
              '$set': {
                customWhere,
                author
              }
            }
          )
          callback(`${optsNameCN} 设置成功`)
        } else {
          callback(`${optsNameCN} 没有相关记录`)
        }
        break
      case 'del':
        await collection.updateOne(
          { '_id': `${optsNameCN}_${level}` },
          {
            '$set': {
              customWhere: [],
              author
            }
          }
        )
        callback(`${optsNameCN} 设置成功`)
        break
    }
  } else {
    switch(type) {
      case 'set':
        find = {
          '_id': `${optsNameCN}_${level}`,
          customWhere: context.split('\n').map(x => x.replage(/\r/g, '')).filter(x => x.trim()),
          Usage: options.UsageQuery,
          level,
          author
        }
        await collection.save(find)
        callback(`${optsNameCN} 设置成功`)
        break
      case 'add':
        find = {
          '_id': `${optsNameCN}_${level}`,
          customWhere: context.split('\n').map(x => x.replage(/\r/g, '')).filter(x => x.trim()),
          Usage: options.UsageQuery,
          level,
          author
        }
        await collection.save(find)
        callback(`${optsNameCN} 设置成功`)
        break
      case 'remove':
        callback(`${optsNameCN} 没有相关记录`)
        break
      case 'del':
        callback(`${optsNameCN} 没有相关记录`)
        break
    }
  }
}
const searchWhereCn = async (...wheres) => {
  if(!client) {
    try {
      client = await MongoClient.connect(MONGO_URL)
    } catch (e) {
      console.log('MONGO ERROR FOR MABINOGI MODULE!!')
      console.log(e)
    }
  }
  collection = client.collection('cl_mabinogi_optionset')

  let out = await collection.find({
    '$or': [
      {
        '$and': [
          {
            'customWhere': {
              '$exists': true,
            },
            '$where': 'this.customWhere.length>0'
          },
          {
            '$and': wheres.map(w => {
              return {
                'customWhere': new RegExp(w)
              }
            })
          }
        ]
      },
      {
        '$and': [
          {
            '$or': [
              {
                'customWhere': {
                  '$exists': false,
                },
              },
              {
                'customWhere': {
                  '$exists': true,
                },
                '$where': 'this.customWhere.length==0'
              }
            ]
          },
          {
            '$and': wheres.map(w => {
              return {
                'where': new RegExp(w)
              }
            })
          }
        ]
      }
    ]
  }).toArray()
  return out
}
const encode = (str, encode) => Array.from(iconv.encode(str, encode)).map(x => `%${x.toString(16).toUpperCase()}`).join('')

module.exports = {
  optionsetWhere,
  optionsetWhereCn,
  optionsetWhereCnHandler,
  searchWhereCn
}
