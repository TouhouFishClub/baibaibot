const fs = require('fs'),
  path = require('path'),
  { sendImageMsgBuffer } = require(path.join(__dirname, '../../cq/sendImage.js'))
var http = require('http');
var request = require('request');
const { createCanvas, Canvas } = require('canvas')
// const gm = require('gm')
// let imageMagick = gm.subClass({ imageMagick : true });

const checkMaxWidth = (ctx, str, maxWidth) => {
  let start = 0, splitArr = []
  for(let i = 1; i < str.length; i++){
    if(ctx.measureText(str.substring(start, i)).width > maxWidth){
      splitArr.push(str.substring(start, i - 1))
      start = i - 1
    }
  }
  splitArr.push(str.substring(start))
  return splitArr
}
const renderText = (ctx, textArr, topMargin, leftMargin, lineHeight,color) => {
  textArr.forEach((text, index) => {
    if(color){
      ctx.fillStyle = color[index]
    }else{
      ctx.fillStyle = 'rgba(255,255,0,1)'
    }
    ctx.fillText(text, leftMargin, topMargin + lineHeight * (index + 1))
  })
}

const renderTextBox = (ctx, left, top, width, height, radius, title) => {
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(204,204,204,1)'
  ctx.lineWidth = 1
  ctx.moveTo(left + radius, top)
  ctx.lineTo(left + width - radius, top)
  ctx.arcTo(left + width, top, left + width, top + radius, radius)
  ctx.lineTo(left + width, top + height - radius)
  ctx.arcTo(left + width, top + height, left + width - radius, top + height, radius)
  ctx.lineTo(left + radius, top + height)
  ctx.arcTo(left, top + height, left, top + height - radius, radius)
  ctx.lineTo(left, top + radius)
  ctx.arcTo(left, top, left + radius, top, radius)

  ctx.stroke()
  let titleWidth = ctx.measureText(title).width
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fillRect(left + radius + 5, top - 14, titleWidth + 8, 28)
  ctx.fillStyle = 'rgba(238,78,7,1)'
  ctx.fillText(title, left + radius + 9, top + 6)
}

const MAX_WIDTH=350;

var cm=function(callback){
  getCoinMarket(data => {
    drawImg(data,callback);
  }, false, true)
}

function combine(callback){
  getCoinMarket(function(data1){
    // getHT(function(data2){
    //   getOKB(function(data3){
    //     var data = data1.concat(data2).concat(data3);
    //
    //   })
    // })
    drawImg(data1,callback);
  },false,true)
}

module.exports={
  cm,
  combine,
  renderText,
  renderTextBox
}











var https = require('https');
var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://192.168.17.52:2020';
var agent = new HttpsProxyAgent(proxy);
var failed = 0;
var USDCNYRATE = 6.3;

function getCoinMarket(callback,withproxy, isInterface = false){
  var now = new Date();
  console.log('will get conmarket:'+withproxy);
  var options = {
    hostname: "pro-api.coinmarketcap.com",
    port: 443,
    path: '/v1/cryptocurrency/listings/latest?start=1&limit=30&convert=USD',
    headers: {
      'X-CMC_PRO_API_KEY': 'c49890a2-7390-4c64-8c92-54872366b94e',
      'Accept':'application/json',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  console.log(options);
  var body = '';
  if(withproxy){
    options.agent=agent;
  }
  //options.agent=agent;
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    console.log(code);
    if(code==200){
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        failed = 0;
        var ddata = eval('('+resdata+')');
        var data=ddata.data;
        console.log(data);
        var ret = "数字货币行情(CoinMarket)："+now.toLocaleString()+"\n";
        var n={"btc":1,"ltc":1,"eth":1,"etc":1,"xrp":1,"eos":1,"bch":1,"fil":1,"dot":1,"doge":1,
          "dash":1,"neo":1,"ada":1,"bsv":1,"ht":1,"okb":1}
        if(isInterface){
          ret = []
        }
        for(var i=0;i<data.length;i++){
          var pd = data[i];
          var symbol=pd.symbol;
          if(n[symbol.toLowerCase()]){
            var pdd = data[i].quote.USD
            var price_usd=parseFloat(pdd.price);
            var price_cny=parseFloat(pdd.price)*6.56;
            USDCNYRATE = price_cny/price_usd;
            if(isInterface){
              ret.push({
                type: symbol,
                usd: price_usd.toFixed(2),
                cny: price_cny.toFixed(2),
                c1h: pdd.percent_change_1h,
                c1d: pdd.percent_change_24h
              })
            } else {
              ret = ret + symbol + ":$"+price_usd.toFixed(2)+"   \t￥"+price_cny.toFixed(2)+"\n";
            }
          }
        }
        callback(ret);
      });
      res.on('error',function(){

      })
    }
  });
  req.write(body);
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
    failed = failed + 1;
    if(failed>3){
      if(isInterface){
        callback([])
      }else{
        callback('CoinMarket BOOM!');
      }
    }else{
      getCoinMarket(callback,false,isInterface);
    }
  });
  req.setTimeout(8000,function(){
    failed = failed + 1;
    if(failed>2){
      callback('CoinMarket BOOM!');
    }else{
      getCoinMarket(callback,false,isInterface);
    }
  });
  req.end();
}


function getHT(callback){
  console.log('will get ht');
  var options = {
    hostname: "api-aws.huobi.pro",
    port: 443,
    path: '/market/history/kline?period=60min&size=1&symbol=htusdt',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  options.agent=agent;
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      failed=0;
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        try{
          var ret=[];
          var data = eval('('+resdata+')');
          var d0=data.data[0];
          var open=d0.open;
          var close=d0.close;
          var sub = (close-open)/open;
          ret.push({
            type: "HT",
            usd: close.toFixed(2),
            cny: (close*USDCNYRATE).toFixed(2),
            c1h: (sub*100).toFixed(2),
            c1d: (sub*100).toFixed(2)
          })
          callback(ret);
        }catch(e){
          console.log(e);
          callback([]);
        }
      });
    }else{
      failed = failed + 1;
      if(failed>2){
        callback([]);
      }else{
        getHT(callback);
      }
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
    callback([]);
  });
  req.end();
}


function getOKB(callback){
  console.log('will get okb');
  var options = {
    hostname: "www.okex.com",
    port: 443,
    path: '/api/v1/kline.do?symbol=okb_usdt&type=1hour&size=1',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'GET'
  };
  options.agent=agent;
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var code = res.statusCode;
    if(code==200){
      failed=0;
      var resdata = '';
      res.on('data', function (chunk) {
        resdata = resdata + chunk;
      });
      res.on('end', function () {
        try{
          var ret=[];
          var data = eval('('+resdata+')');
          console.log(data);
          var d0=data[0];
          var open=d0[1];
          var close=d0[4];
          var sub = (close-open)/open;
          ret.push({
            type: "OKB",
            usd: parseFloat(close).toFixed(2),
            cny: (close*USDCNYRATE).toFixed(2),
            c1h: (sub*100).toFixed(2),
            c1d: (sub*100).toFixed(2)
          })
          callback(ret);
        }catch(e){
          console.log(e);
          callback([]);
        }
      });
    }else{
      failed = failed + 1;
      if(failed>2){
        callback([]);
      }else{
        getOKB(callback);
      }
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
    callback([]);
  });
  req.end();
}






function drawImg(data,callback){
  console.log(data);
  if(data.length==0){
    callback('coinmarket BOOM!')
  }else{
    let canvasTmp = createCanvas(400, 2000)
      , ctxTmp = canvasTmp.getContext('2d');
    let fontFamily = 'STXIHEI'
    ctxTmp.font = `20px ${fontFamily}`;
    /* 预处理币种，美元，人民币 */
    let typeMaxWidth = 0, usdMaxWidth = 0, cnyMaxWidth = 0 ,c1hMaxWidth=0,c1dMaxWidth=0
    data.forEach(val => {
      if(ctxTmp.measureText(val.type).width > typeMaxWidth){
        typeMaxWidth = ctxTmp.measureText(val.type).width
      }
      if(ctxTmp.measureText(val.usd).width > usdMaxWidth){
        usdMaxWidth = ctxTmp.measureText(`$ ${val.usd}`).width
      }
      if(ctxTmp.measureText(val.cny).width > cnyMaxWidth){
        cnyMaxWidth = ctxTmp.measureText(`￥ ${val.cny}`).width
      }
      if(ctxTmp.measureText(val.c1h).width > c1hMaxWidth){
        c1hMaxWidth = ctxTmp.measureText(`￥ ${val.c1h}`).width
      }
      if(ctxTmp.measureText(val.c1d).width > c1dMaxWidth){
        c1dMaxWidth = ctxTmp.measureText(`￥ ${val.c1d}`).width
      }

    })
    let canvasWidth = typeMaxWidth + usdMaxWidth + cnyMaxWidth + c1hMaxWidth + 120
    console.log(canvasWidth)
    let cavasHeight = data.length * 25 + 80

    let canvas = createCanvas(canvasWidth, cavasHeight)
      , ctx = canvas.getContext('2d')

    ctx.font = `20px ${fontFamily}`
    ctx.fillStyle = 'rgba(0,0,20,0.9)'
    ctx.fillRect(0, 0, canvasWidth, cavasHeight)

    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'

    var colorArr = data.map(val => parseFloat(val.c1h)>0?'red':'aqua');


    renderTextBox(ctx, 15, 20, canvasWidth-30, cavasHeight-50, 10, new Date().toLocaleString()+"(CoinMarket)")
    renderText(ctx, data.map(val => val.type), 20, 20, 25)
    renderText(ctx, data.map(val => `$${val.usd}`), 20, 40 + typeMaxWidth, 25)
    renderText(ctx, data.map(val => `￥${val.cny}`), 20, 60 + typeMaxWidth + usdMaxWidth, 25)
    renderText(ctx, data.map(val => " "+(parseFloat(val.c1h)>0?"+":"")+`${val.c1h}%`),
      20, 80 + typeMaxWidth + usdMaxWidth + cnyMaxWidth, 25,colorArr)
    //renderText(ctx, data.map(val => ` ${val.c1d}%`), 20, 100 + typeMaxWidth + usdMaxWidth + cnyMaxWidth + c1dMaxWidth, 25)


    let imgData = canvas.toDataURL()
    let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
    let dataBuffer = new Buffer(base64Data, 'base64')


    if(true){
      sendImageMsgBuffer(dataBuffer, 'coin_'+new Date().getTime(), 'coin', msg => {
        callback(msg)
      })
    }else{
      fs.writeFile(path.join(__dirname, '../../test/image.png'), dataBuffer, function(err) {
        if(err){
          console.log(err)
        }else{
          console.log("保存成功！");
        }
      });
    }
  }
}





