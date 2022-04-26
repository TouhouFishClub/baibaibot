const fs = require('fs'),
  path = require('path'),
  { sendImageMsgBuffer } = require(path.join(__dirname, '../../cq/sendImage.js'))
const { createCanvas, Canvas } = require('canvas')
var https = require('https');
var http = require('http');
var iconv = require("iconv-lite");

const {renderText,renderTextBox} = require('./market')

function getStock(callback){
  var url = "http://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sz399300,int_hangseng,int_dji,int_nasdaq,int_sp500,int_nikkei";
  var options = {
    hostname: 'hq.sinajs.cn',
    port: 80,
    path: '/list=s_sh000001,s_sz399001,s_sz399300,int_hangseng,int_dji,int_nasdaq,int_sp500,int_nikkei',
    headers:{
      'Referer':'https://finance.sina.com.cn',
      'User-Agent':'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Mobile Safari/537.36'
    }
    method: 'GET',
  };
  options['Accept-Language']='zh-CN,zh;q=0.9';
  console.log(options);
  var req = http.request(options, function (res) {
    //res.setEncoding('utf8');
    var code = res.statusCode;
    console.log(code);
    if(code==200){
      var resdata = '';
      res.on('data', function (chunk) {
        var decodedchunk =  iconv.decode(chunk, 'GBK');
        resdata = resdata + decodedchunk;
      });
      res.on('end', function () {
        var ra = resdata.split('\n');
        var ret = [];
        for(var i=0;i<ra.length;i++){
          var line = ra[i];
          var n = line.indexOf('="');
          var s1 = line.substring(n+2);
          var n1 = s1.indexOf('"');
          var ss = s1.substring(0,n1);
          console.log(ss);
          var ssa = ss.split(',');
          if(ssa.length<2){
            continue;
          }
          var name = ssa[0];
          var nowprice = ssa[1];
          var sub = ssa[2];
          var subrate = ssa[3];
          var ns = subrate.indexOf('%');
          if(ns>0){
            subrate=subrate.substring(0,ns);
          }
          if(name.length>1){
            ret.push({
              n: name,
              d: nowprice,
              s: subrate
            })
          }
        }
        console.log(ret);
        drawImg(ret,callback);
      });
    }
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function drawImg(data,callback){
  if(data.length==0){
    callback('sinastock BOOM!')
  }else{
    let canvasTmp = createCanvas(400, 2000)
      , ctxTmp = canvasTmp.getContext('2d');
    let fontFamily = 'STXIHEI'
    ctxTmp.font = `20px ${fontFamily}`;
    /* 预处理币种，美元，人民币 */
    let typeMaxWidth = 0, usdMaxWidth = 0, cnyMaxWidth = 0 ,c1hMaxWidth=0,c1dMaxWidth=0
    data.forEach(val => {
      if(ctxTmp.measureText(val.n).width > typeMaxWidth){
        typeMaxWidth = ctxTmp.measureText(val.n).width
      }
      if(ctxTmp.measureText(val.d).width > usdMaxWidth){
        usdMaxWidth = ctxTmp.measureText(` ${val.d}`).width
      }
      if(ctxTmp.measureText(val.s).width > cnyMaxWidth){
        cnyMaxWidth = ctxTmp.measureText(` ${val.s}%`).width
      }
    })
    let canvasWidth = typeMaxWidth + usdMaxWidth + cnyMaxWidth + 100
    console.log(canvasWidth)
    let cavasHeight = data.length * 25 + 80

    let canvas = createCanvas(canvasWidth, cavasHeight)
      , ctx = canvas.getContext('2d')

    ctx.font = `20px ${fontFamily}`
    ctx.fillStyle = 'rgba(0,0,20,0.9)'
    ctx.fillRect(0, 0, canvasWidth, cavasHeight)

    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'

    var colorArr = data.map(val => parseFloat(val.s)>0?'red':'aqua');
    var nameColorArr = data.map(val => '#FFCCFF')

    renderTextBox(ctx, 15, 20, canvasWidth-30, cavasHeight-50, 10, new Date().toLocaleString()+"")
    renderText(ctx, data.map(val => val.n), 20, 20, 25,nameColorArr)
    renderText(ctx, data.map(val => `${val.d}`), 20, 40 + typeMaxWidth, 25)
    renderText(ctx, data.map(val => " "+(parseFloat(val.s)>0?"+":"")+`${val.s}%`),
      20, 60 + typeMaxWidth + usdMaxWidth , 25,colorArr)
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












module.exports={
  getStock
}

