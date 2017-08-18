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
      res = `输入格式为\`c[数字][币种/币种代码]，如10239.23日元，默认转换为人民币；\n如果只输入币种，则显示汇率信息；\n输入“\`c币种”，可查看支持转换的币种；`
      callback(res)
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
        formatData(currencyToCodeSynonyms(currency), money, callback)
      } else {
        /* 未输入数字 */
        formatData(currencyToCodeSynonyms(content), null, callback)
      }
  }
}

const wait = time => new Promise(resolve => setTimeout(() => resolve(), time))


const formatData = async (code, money, callback) => {
  let response = ''
  if(code){
    if(money){
      /* 输入币值，则进行转换 */
      let YQLdata = await getYQLData(`${code}CNY`)
      let rateObj = YQLdata.query.results.rate
      if(rateObj.Rate !== 'N/A'){
        response = `${rateObj.Date} ${rateObj.Time}\n${money}${codeToCurrency(rateObj.Name.split('/')[0])} = ${(money*rateObj.Rate).toFixed(4)}${codeToCurrency(rateObj.Name.split('/')[1])}`
      } else {
        response = '币种代码错误'
      }
    } else {
      /* 未输入币值，则输出当前汇率 */
      let YQLdata = await getYQLData(`${code}CNY`)
      let YQLdataCNY = await getYQLData(`CNY${code}`)
      let rateObj = YQLdata.query.results.rate
      let rateObjCNY = YQLdataCNY.query.results.rate
      if(rateObj.Rate !== 'N/A' && rateObjCNY.Rate !== 'N/A'){
        response = `${rateObj.Date} ${rateObj.Time}\n1${codeToCurrency(rateObj.Name.split('/')[0])} = ${(1*rateObj.Rate).toFixed(4)}${codeToCurrency(rateObj.Name.split('/')[1])}\n${rateObjCNY.Date} ${rateObjCNY.Time}\n1${codeToCurrency(rateObjCNY.Name.split('/')[0])} = ${(1*rateObjCNY.Rate).toFixed(4)}${codeToCurrency(rateObjCNY.Name.split('/')[1])}`
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
    /* 发起查询请求 */
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

