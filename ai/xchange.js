/*
 * === 汇率转换 ===
 *
 * 输入格式为[数字][币种]，如10239.23日元
 * 默认转换为人民币
 * 如果只输入币种，则显示汇率信息
 *
 */
const Axios = require('axios')

module.exports = function(str, callback){
  let res = ''
  switch(str.trim()){
    case '':
      res = `输入格式为[数字][币种]，如10239.23日元，默认转换为人民币；
      如果只输入币种，则显示汇率信息；
      输入“币种”，可查看支持转换的币种；`
      callback(res)
      break
    case '币种':
      res = `支持的币种
      ${Object.keys(currencyCodeObj).join('、')}`
      callback(res)
      break
    default:
      let hasMoney
      if(hasMoney = str.match(/[\d.]+/)){
        /* 输入数字 */
        let currency = str.split(hasMoney)[1].split('/n')[0].trim(),
          money = parseFloat(hasMoney)
        formatData(toCurrencyCode(currency), callback)
      } else {
        /* 未输入数字 */

      }
  }
}



const formatData = async (code, callback) => {
  getYQLData(code).then((response) =>{
    callback(response)
  })
}

const getYQLData = code =>
  new Promise((resolve, reject) => {
    Axios.get('https://query.yahooapis.com/v1/public/yql',{
      params: {
        q: `select * from yahoo.finance.xchange where pair in ("${code}CNY")`,
        format: 'json',
        env: 'store://datatables.org/alltableswithkeys'
      }
    })
      .then(response => resolve(response.data))
      .catch(error => {
        console.log(error)
        resolve({})
      })
  })


const currencyCodeObj = {
  "日元" : "JPY",
  "美元" : "USD"
}

const toCurrencyCode = str => currencyCodeObj[str]

