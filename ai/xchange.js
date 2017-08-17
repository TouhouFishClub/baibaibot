/*
 * === 汇率转换 ===
 *
 * 输入格式为[数字][币种]，如10239.23日元
 * 默认转换为人民币
 * 如果只输入币种，则显示汇率信息
 *
 */
const Axios = require('axios')

module.exports = function(userId, content, callback){
  let res = ''
  switch(content.trim()){
    case '':
      res = `
      输入格式为[数字][币种]，如10239.23日元，默认转换为人民币；
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
      if(hasMoney = content.match(/[\d.]+/)){
        /* 输入数字 */
        let currency = content.split(hasMoney)[1].split('/n')[0].trim(),
          money = parseFloat(hasMoney)
        formatData(currencyToCode(currency), money, callback)
      } else {
        /* 未输入数字 */
        formatData(currencyToCode(content), null, callback)
      }
  }
}



const formatData = async (code, money, callback) => {
  let response = '';
  if(code){
    if(money){
      let YQLdata = await getYQLData(`${code}CNY`)
      /* 输入币值，则进行转换 */
      let rateObj = YQLdata.query.results.rate
      if(rateObj.Rate !== 'N/A'){
        response = `
        ${rateObj.Date} ${rateObj.Time}
        ${money}${codeToCurrency(rateObj.Name.split('/')[0])} = ${(money*rateObj.Rate).toFixed(4)}${codeToCurrency(rateObj.Name.split('/')[1])}
        `
      } else {
        response = '币种代码错误'
      }
    } else {
      let YQLdata = await getYQLData(`${code}CNY`)
      let YQLdataCNY = await getYQLData(`CNY${code}`)
      let rateObj = YQLdata.query.results.rate
      let rateObjCNY = YQLdataCNY.query.results.rate
      if(rateObj.Rate !== 'N/A' && rateObjCNY.Rate !== 'N/A'){
        response = `
        ${rateObj.Date} ${rateObj.Time}
        1${codeToCurrency(rateObj.Name.split('/')[0])} = ${(1*rateObj.Rate).toFixed(4)}${codeToCurrency(rateObj.Name.split('/')[1])}
        ${rateObjCNY.Date} ${rateObjCNY.Time}
        1${codeToCurrency(rateObjCNY.Name.split('/')[0])} = ${(1*rateObjCNY.Rate).toFixed(4)}${codeToCurrency(rateObjCNY.Name.split('/')[1])}
        `
      } else {
        response = '币种代码错误'
      }
    }
  } else {
    response = '币种错误'
  }
  callback(response)
}

const getYQLData = code =>
  new Promise((resolve, reject) => {
    Axios.get('https://query.yahooapis.com/v1/public/yql',{
      params: {
        q: `select * from yahoo.finance.xchange where pair in ("${code}")`,
        format: 'json',
        env: 'store://datatables.org/alltableswithkeys'
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
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
  "美元" : "USD",
  "人民币": "CNY",
}

const codeCurrencyObj = {
  "JPY" : "日元",
  "USD" : "美元",
  "CNY" : "人民币",
}

const currencyToCode = str => currencyCodeObj[str]

const codeToCurrency = str => codeCurrencyObj[str]

