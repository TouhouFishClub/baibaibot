const https = require('https')
const path = require('path')
const extract = require(path.join(__dirname, '../../util/extract'))
let figureTime = {}
let equipTime = {}

module.exports = function(msg, callback){
  let sp = msg.split(' ')
  switch(sp[0]){
    case 'f':
    case '建造':
    case '建造时间':
      getFigure(sp[1], callback)
      break
    default:
      callback(explain())
  }
}

const explain = () => `说明\n建造查询：使用${'`'}gf+f/建造/建造时间 + 空格 + 时间（时-分），如${'\`'}gf建造 3-55\n`

const getFigure = (time, callback) => {
  if(!Object.keys(figureTime).length){
    https.get({
      host: 'zh.moegirl.org',
      port: 443,
      path: '/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF/%E4%BA%BA%E5%BD%A2%E5%88%B6%E9%80%A0',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
      }
    }, res => {
      let chunk = ''
      res.on('data', data => chunk += data)
      res.on('end', () => {
        let tbody = extract(extract(chunk, 'id="建造时间总览"', '</tbody>'), '<tbody')
        tbody.split('<tr>').slice(2).forEach(tr => {
          if(tr.trim()){
            let hour, min, rare
            tr.split('<td').forEach((td, index) => {
              if(td.trim()){
                let tmp = extract(td, '>', '</td>', false)
                switch(index){
                  case 1:
                    let sp = tmp.split(':')
                    hour = parseInt(sp[0])
                    min = parseInt(sp[1])
                    if(figureTime[hour]){
                      if(!figureTime[hour][min]){
                        figureTime[hour][min] = []
                      }
                    } else {
                      figureTime[hour] = {}
                      if(!figureTime[hour][min]){
                        figureTime[hour][min] = []
                      }
                    }
                    break
                  case 2:
                    rare = tmp.match(new RegExp('★', 'g')).length
                    break
                  case 3:
                    tmp.split('//').forEach(figure => {
                      let isHeavy = figure.indexOf('color:red') >= 0
                      let name = extract(figure, '">', '</', false)
                      if(isHeavy){
                        name = extract(name, '">', '', false)
                      }
                      figureTime[`${hour}`][`${min}`].push(`${isHeavy ? '[重建限定]' : ''}[${new Array(rare).fill('★').join('')}]${name}`)
                    })
                    break
                }
              }
            })
          }
        })
        callback(searchFigure(time))
      })
    })
  } else {
    callback(searchFigure(time))
  }
}

const searchFigure = time => {
  let sp = time.split('-')
  if(figureTime[parseInt(sp[0])][parseInt(sp[1])]){
    return figureTime[parseInt(sp[0])][parseInt(sp[1])].join('\n')
  } else {
    return '找不到建造的人形'
  }
}

const getEquip = time => {

}