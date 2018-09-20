/*
 * === 汇率转换 ===
 *
 * 输入格式为[数字][币种]，如10239.23日元
 * 默认转换为人民币
 * 如果只输入币种，则显示汇率信息
 *
 */
const path = require('path')
const Axios = require('axios')
const _  = require('lodash')
const {getPrice,getBitFlyer} = require('./push');
const {cm,combine} = require(path.join(__dirname, '/coin/market.js'))
const {getStock} = require(path.join(__dirname, '/coin/stock.js'))
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
const TIME_OUT = 30000

module.exports = function(userId, content, callback){
  let res = '', defaultCurrency = '人民币'
  content = content.trim()
  switch(content){
    case '':
      res = `输入格式为\`c[数字][币种/币种代码]，如10239.23日元，默认转换为${defaultCurrency}；\n可使用“-”来连接两种币种转换，如200日元-美元\n如果只输入币种，则显示汇率信息；\n输入“\`c币种”，可查看支持转换的币种；`
      callback(res)
      break
    case 'b':
    case 'B':
      getPrice(callback);
      break
    case 'l':
    case 'L':
      getBitFlyer(callback);
      break
    case 'p':
    case 'P':
      cm(callback);
      break
    case 'a':
    case 'A':
      combine(callback);
      break
    case 'x':
    case 'X':
      getStock(callback)
      break
    case '币种':
      let str = Object.keys(currencyCodeObj).join('、'), callbackArr = ['支持的币种']
      while(str.length){
        sli = str.slice(0, 250)
        callbackArr.push(sli)
        str = str.split(sli)[1]
      }
      callbackArr.forEach(async (ele, idx) => {
        await wait(idx * 500)
        callback(ele)
      })
      break
    default:
      let hasMoney
      if(hasMoney = content.match(/[\d.]+/)){
        /* 输入数字 */
        let currency = content.split(hasMoney)[1].split('/n')[0].trim(),
          money = parseFloat(hasMoney)
        if(currency.split('-').length - 1){
          let codes = currency.split('-')
          formatData([currencyToCodeSynonyms(codes[0].trim()), currencyToCodeSynonyms(codes[1].trim())], money, callback)
        } else {
          formatData([currencyToCodeSynonyms(currency), currencyToCodeSynonyms(defaultCurrency)], money, callback)
        }
      } else {
        /* 未输入数字 */
        if(content.split('-').length - 1){
          let codes = content.split('-')
          formatData([currencyToCodeSynonyms(codes[0].trim()), currencyToCodeSynonyms(codes[1].trim())], null, callback)
        } else {
          formatData([currencyToCodeSynonyms(content),  currencyToCodeSynonyms(defaultCurrency)], null, callback)
        }
      }
  }
}

function fix(){



}



const wait = time => new Promise(resolve => setTimeout(() => resolve(), time))


const formatData = async (codeArr, money, callback) => {
  let response = ''
  if(codeArr && !!codeArr[0] && !!codeArr[1]){
    let checkCode = {
      'ETH': 1,
      'BTC': 1,
      'LTC': 1,
      'BCH': 1,
      'ETC': 1,
      'EOS': 1
    }
    if((checkCode[codeArr[0]] || checkCode[codeArr[1]]) && (checkCode[codeArr[1]] !== checkCode[codeArr[0]])){
      if(codeArr[0] === 'CNY' || codeArr[1] === 'CNY'){
        let code = _.take(codeArr, 2)
        if(codeArr[0] === 'CNY')
          _.reverse(code)
        //code = code.join('_').toLowerCase()
        code = code[0]+"_usdt";
        let res = await getOkcoinData(code)
        const addZero = num => num < 10 ? ('0' + num) : num
        let date = new Date(res.date * 1000), ticker = res.ticker, formatDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${addZero(date.getHours())}:${addZero(date.getMinutes())}:${addZero(date.getSeconds())}`
        // console.log(res)
        if(money){
          if(codeArr[0] === 'CNY')
            response = `${formatDate}\n${money}${codeToCurrency(codeArr[0])} = ${(money/ticker.last).toFixed(4)}${codeToCurrency(codeArr[1])}`
          else
            response = `${formatDate}\n${money}${codeToCurrency(codeArr[0])} = ${(money*ticker.last).toFixed(4)}${codeToCurrency(codeArr[1])}`
        } else {
          response = `【${codeToCurrency(code.split('_usdt').join('').toUpperCase())}行情】${formatDate}\n买一价：$${ticker.buy}\n卖一价：$${ticker.sell}\n最新成交价：$${ticker.last}\n`
        }
      } else {
        let ignoreCode = {
          'BCC': 1,
          'ETC': 1
        }
        if(!(ignoreCode[codeArr[0]] || ignoreCode[codeArr[1]])){
          let amount
          if(checkCode[codeArr[0]]){
            let res = await getCoinbaseData(`${codeArr[0]}-${codeArr[1]}`)
            amount = res.data.amount
          } else {
            let res = await getCoinbaseData(`${codeArr[1]}-${codeArr[0]}`)
            amount = res.data.amount
            amount = 1 / amount
          }
          if(money){
            response = `${money}${codeToCurrency(codeArr[0])} = ${(money*amount).toFixed(4)}${codeToCurrency(codeArr[1])}`
          } else {
            response = `1${codeToCurrency(codeArr[0])} = ${(1*amount).toFixed(4)}${codeToCurrency(codeArr[1])}\n1${codeToCurrency(codeArr[1])} = ${(1 / amount).toFixed(4)}${codeToCurrency(codeArr[0])}\n`
          }
        } else {
          response = '不支持的转换格式'
        }
      }
    } else {
      let YQLcode = money ? `"${codeArr[0]}${codeArr[1]}"` : `"${codeArr[0]}${codeArr[1]}","${codeArr[1]}${codeArr[0]}"`
      // try {
      //   // throw new Error()
      //   let YQLdata = await getYQLData(YQLcode)
      //   let rateObj = YQLdata.query.results.rate
      //   if(money ? rateObj.Rate !== 'N/A' : rateObj[0].Rate !== 'N/A'){
      //     if(money){
      //       /* 输入币值，则进行转换 */
      //       response = `${rateObj.Date} ${rateObj.Time}\n${money}${codeToCurrency(rateObj.Name.split('/')[0])} = ${(money*rateObj.Rate).toFixed(4)}${codeToCurrency(rateObj.Name.split('/')[1])}`
      //     } else {
      //       /* 未输入币值，则输出当前汇率 */
      //       response = `${rateObj[0].Date} ${rateObj[0].Time}\n1${codeToCurrency(rateObj[0].Name.split('/')[0])} = ${(1*rateObj[0].Rate).toFixed(4)}${codeToCurrency(rateObj[0].Name.split('/')[1])}\n${rateObj[1].Date} ${rateObj[1].Time}\n1${codeToCurrency(rateObj[1].Name.split('/')[0])} = ${(1*rateObj[1].Rate).toFixed(4)}${codeToCurrency(rateObj[1].Name.split('/')[1])}`
      //     }
      //   } else {
      //     response = '币种代码错误'
      //   }
      // } catch(err){
      //   console.log('========yql failed goto fixer============')
        const fixerData = await getFixerData(codeArr[0])
        if(!fixerData.error){
          if(codeArr[0] === codeArr[1]){
            response = '不允许兑换相同货币'
          } else {
            if(fixerData.rates[codeArr[1]]){
              const rateData = parseFloat(fixerData.rates[codeArr[1]])
              if(money){
                response = `${fixerData.date}\n${money}${codeToCurrency(codeArr[0])} = ${(money*rateData).toFixed(4)}${codeToCurrency(codeArr[1])}`
              } else {
                response = `${fixerData.date}\n1${codeToCurrency(codeArr[0])} = ${rateData.toFixed(4)}${codeToCurrency(codeArr[1])}\n1${codeToCurrency(codeArr[1])} = ${(1/rateData).toFixed(4)}${codeToCurrency(codeArr[0])}`
              }
            } else {
              response = '该接口不支持此币种'
            }
          }
        } else {
          response = fixerData.error
        }
      // }
    }
  } else {
    response = '币种错误'
  }
  callback(response)
}

const getOkcoinData = code =>
  new Promise((resolve, reject) => {
    Axios.get(`https://www.okex.com/api/v1/ticker.do?symbol=${code}`, {
      timeout: TIME_OUT,
      headers: {
        'User-Agent': USER_AGENT
      }
    })
      .then(response => resolve(response.data))
      .catch(error => {
        console.log(error)
      })
  })

const getCoinbaseData = code =>
  new Promise((resolve, reject) => {
    Axios.get(`https://api.coinbase.com/v2/prices/${code}/spot`, {
      timeout: TIME_OUT,
      headers: {
        'User-Agent': USER_AGENT
      }
    })
      .then(response => resolve(response.data))
      .catch(error => {
        console.log(error)
      })
  })

const getYQLData = code =>
  new Promise((resolve, reject) => {
    /* 发起查询请求 */
    Axios.get('https://query.yahooapis.com/v1/public/yql',{
      params: {
        q: `select * from yahoo.finance.xchange where pair in (${code})`,
        format: 'json',
        env: 'store://datatables.org/alltableswithkeys'
      },
      timeout: TIME_OUT,
      headers: {
        'User-Agent': USER_AGENT
      }
    })
      .then(response => resolve(response.data))
      .catch(error => {
        // console.log(error)
        console.log('=== YQL request failure ===')
        reject('fail')
      })
  })

const getFixerData = code =>
  new Promise((resolve, reject) => {
    Axios.get('http://data.fixer.io/api/latest&access_key=bfa9904b7c9dc8e4d73007918d9f515e', {
      timeout: TIME_OUT,
      headers: {
        'User-Agent': USER_AGENT
      }
    }).then(function(response){
      var data = response.data;
      var baserate = data.rates[code];
      for(var p in data.rates){
        data.rates[p]=data.rates[p]/baserate;
      }
      resolve(response.data)
    })
      .catch(error => {
        console.log(error)
      })
  })

/* 币种代码转换 */
const currencyCodeObj = {
  "人民币" : "CNY",
  "美元" : "USD",
  "日元" : "JPY",
  "欧元" : "EUR",
  "英镑" : "GBP",
  "韩元" : "KRW",
  "港元" : "HKD",
  "澳元" : "AUD",
  "加元" : "CAD",
  "阿联酋迪拉姆" : "AED",
  "澳门元" : "MOP",
  "阿尔及利亚第纳尔" : "DZD",
  "阿曼里亚尔" : "OMR",
  "埃及镑" : "EGP",
  "白俄罗斯卢布" : "BYR",
  "巴西雷亚尔" : "BRL",
  "波兰兹罗提" : "PLN",
  "巴林第纳尔" : "BHD",
  "保加利亚列弗" : "BGN",
  "冰岛克朗" : "ISK",
  "丹麦克朗" : "DKK",
  "俄罗斯卢布" : "RUB",
  "菲律宾比索" : "PHP",
  "哥伦比亚比索" : "COP",
  "哥斯达黎加科朗" : "CRC",
  "捷克克朗" : "CZK",
  "柬埔寨瑞尔" : "KHR",
  "克罗地亚库纳" : "HRK",
  "卡塔尔里亚尔" : "QAR",
  "科威特第纳尔" : "KWD",
  "肯尼亚先令" : "KES",
  "老挝基普" : "LAK",
  "罗马尼亚列伊" : "RON",
  "黎巴嫩镑" : "LBP",
  "离岸人民币" : "CNH",
  "缅甸元" : "BUK",
  "马来西亚林吉特" : "MYR",
  "摩洛哥道拉姆" : "MAD",
  "墨西哥元" : "MXN",
  "挪威克朗" : "NOK",
  "南非兰特" : "ZAR",
  "瑞士法郎" : "CHF",
  "瑞典克朗" : "SEK",
  "沙特里亚尔" : "SAR",
  "斯里兰卡卢比" : "LKR",
  "塞尔维亚第纳尔" : "RSD",
  "泰铢" : "THB",
  "坦桑尼亚先令" : "TZS",
  "文莱元" : "BND",
  "乌干达先令" : "UGX",
  "新的赞比亚克瓦查" : "ZMK",
  "叙利亚镑" : "SYP",
  "新西兰元" : "NZD",
  "新土耳其里拉" : "TRY",
  "新加坡元" : "SGD",
  "新台币" : "TWD",
  "匈牙利福林" : "HUF",
  "约旦第纳尔" : "JOD",
  "伊拉克第纳尔" : "IQD",
  "越南盾" : "VND",
  "以色列新锡克尔" : "ILS",
  "印度卢比" : "INR",
  "印尼卢比" : "IDR",
  "智利比索" : "CLP",
  "以太币" : "ETH",
  "比特币" : "BTC",
  "莱特币" : "LTC",
  "比特现金" : "BCH",
  "经典以太": "ETC",
  "EOS币": "EOS",
}

const codeCurrencyObj = {
  "AED" : "阿联酋迪拉姆",
  "AUD" : "澳元",
  "MOP" : "澳门元",
  "DZD" : "阿尔及利亚第纳尔",
  "OMR" : "阿曼里亚尔",
  "EGP" : "埃及镑",
  "BYR" : "白俄罗斯卢布",
  "BRL" : "巴西雷亚尔",
  "PLN" : "波兰兹罗提",
  "BHD" : "巴林第纳尔",
  "BGN" : "保加利亚列弗",
  "ISK" : "冰岛克朗",
  "DKK" : "丹麦克朗",
  "RUB" : "俄罗斯卢布",
  "PHP" : "菲律宾比索",
  "HKD" : "港元",
  "COP" : "哥伦比亚比索",
  "CRC" : "哥斯达黎加科朗",
  "KRW" : "韩元",
  "CAD" : "加元",
  "CZK" : "捷克克朗",
  "KHR" : "柬埔寨瑞尔",
  "HRK" : "克罗地亚库纳",
  "QAR" : "卡塔尔里亚尔",
  "KWD" : "科威特第纳尔",
  "KES" : "肯尼亚先令",
  "LAK" : "老挝基普",
  "RON" : "罗马尼亚列伊",
  "LBP" : "黎巴嫩镑",
  "CNH" : "离岸人民币",
  "USD" : "美元",
  "BUK" : "缅甸元",
  "MYR" : "马来西亚林吉特",
  "MAD" : "摩洛哥道拉姆",
  "MXN" : "墨西哥元",
  "NOK" : "挪威克朗",
  "ZAR" : "南非兰特",
  "EUR" : "欧元",
  "CNY" : "人民币",
  "CHF" : "瑞士法郎",
  "JPY" : "日元",
  "SEK" : "瑞典克朗",
  "SAR" : "沙特里亚尔",
  "LKR" : "斯里兰卡卢比",
  "RSD" : "塞尔维亚第纳尔",
  "THB" : "泰铢",
  "TZS" : "坦桑尼亚先令",
  "BND" : "文莱元",
  "UGX" : "乌干达先令",
  "ZMK" : "新的赞比亚克瓦查",
  "SYP" : "叙利亚镑",
  "NZD" : "新西兰元",
  "TRY" : "新土耳其里拉",
  "SGD" : "新加坡元",
  "TWD" : "新台币",
  "HUF" : "匈牙利福林",
  "GBP" : "英镑",
  "JOD" : "约旦第纳尔",
  "IQD" : "伊拉克第纳尔",
  "VND" : "越南盾",
  "ILS" : "以色列新锡克尔",
  "INR" : "印度卢比",
  "IDR" : "印尼卢比",
  "CLP" : "智利比索",
  "ETH" : "以太币",
  "BTC" : "比特币",
  "LTC" : "莱特币",
  "BCH" : "比特现金",
  "ETC" : "经典以太",
  "EOS" : "EOS币",
}

/* 处理同名 */
const currencyToCodeSynonyms = str => {
  switch (str){
    case '港币':
      return currencyToCode('港元')
    case '台币':
      return currencyToCode('新台币')
    case '毛爷爷':
    case 'RMB':
    case 'rmb':
    case 'r':
      return currencyToCode('人民币')
    case '美金':
    case '刀':
    case '$':
      return currencyToCode('美元')
    case 'DMM':
    case 'dmm':
      return currencyToCode('日元')
    default:
      if(codeToCurrency(str.toUpperCase()))
        return str.toUpperCase()
      else
        return currencyToCode(str)
  }
}

const currencyToCode = str => currencyCodeObj[str]

const codeToCurrency = str => codeCurrencyObj[str]

