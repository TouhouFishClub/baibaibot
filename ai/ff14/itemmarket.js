var request=require('request');
const {baiduocr} = require('../image/baiduocr');
var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../cq/sendImage');
const fs = require('fs'),
  path = require('path'),
//  {createCanvas, loadImage} = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage')

const GLOBAL_MARGIN = 20
const TABLE_WIDTH = [100, 100, 50, 150]
const TABLE_HEIGHT = 30
const ITEM_TITLE = 40
const TABLE_LABEL = 28
const SERVER_LIST = 25
const SERVER_PER_ROW = 3
const fontFamily = 'STXIHEI'
const titleHeight = 250
const chartHeight = 300


var cookiechocobo = '__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong; PHPSESSID=q4ljhu81j84gh5f13sen25eo6t; mogboard_server=LaNuoXiYa; _gat_gtag_UA_147847104_1=1';
var cookiemog = '__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong; PHPSESSID=q4ljhu81j84gh5f13sen25eo6t; mogboard_server=BaiYinXiang';
var cookiecat = '__Host-next-auth.csrf-token=c192ea3cb692b73ff88855cab54ea36ad66faa62beb875f8907e1f3c3bccfe63%7C2a2e75c503e449053ace75e76787abda6e55cc98843b2b3c9a308d493d8a2c36; __Secure-next-auth.callback-url=https%3A%2F%2Funiversalis.app; mogboard_language=chs; mogboard_timezone=Asia%2FShanghai; mogboard_leftnav=off; mogboard_homeworld=no; mogboard_server=%E9%9D%99%E8%AF%AD%E5%BA%84%E5%9B%AD';


var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongourl;
var udb;
initDB();
function initDB(){
    MongoClient.connect(mongourl, function(err, db) {
        udb=db;
    });
}

function getUserServer(qq,callback){
    var cl_ff14_server = udb.collection('cl_ff14_server');
    cl_ff14_server.findOne({'_id':qq}, function(err, data) {
        if(err){
            callback(3)
        }else {
            if (data) {
                callback(data.d);
            } else {
                callback(3);
            }
        }
    });
}

function saveUserServer(qq,server){
    var cl_ff14_server = udb.collection('cl_ff14_server');
    cl_ff14_server.save({'_id':qq,d:server})
}


function ff14MarketReply(content,qq,callback) {
    if (content.trim() == "") {
        var ret = "ff14物价查询器\n";
        ret = ret + "输入格式：【ffid】+【物品名/物品ID】\n【ffid】+【没有空格】+【1/2/3】+【空格】+【物品名/物品ID】\n"
        ret = ret + "输入【ffid1s/ffid2s/ffid3s】存储默认区服\n请注意数据并非实时，存在一定延迟\n";
        callback(ret.trim());
        return;
    }
    if (content.trim() == "1s") {
        saveUserServer(qq, 1);
        callback('已设定为1区');
        return;
    } else if (content.trim() == "2s") {
        saveUserServer(qq, 2);
        callback('已设定为2区');
        return;
    } else if (content.trim() == "3s") {
        saveUserServer(qq, 3);
        callback('已设定为3区');
        return;
    }

    var cookie;
    if (content.startsWith("1 ")) {
        cookie = cookiechocobo;
        content = content.substring(1);
        content = content.trim();
        ff14MarketReply0(content,qq,callback,cookie)
    } else if (content.startsWith("2 ")) {
        cookie = cookiemog;
        content = content.substring(1);
        content = content.trim();
        ff14MarketReply0(content,qq,callback,cookie)
    } else if (content.startsWith("3 ")) {
        cookie = cookiecat;
        content = content.substring(1);
        content = content.trim();
        ff14MarketReply0(content,qq,callback,cookie)
    } else {
        getUserServer(qq,function(server){
            if (server==1) {
                cookie = cookiechocobo;
                ff14MarketReply0(content,qq,callback,cookie)
            } else if (server==2) {
                cookie = cookiemog;
                ff14MarketReply0(content,qq,callback,cookie)
            } else {
                cookie = cookiecat;
                ff14MarketReply0(content, qq, callback, cookie)
            }
        })
    }


}
/*
    if (content.trim().endsWith("鸟")) {
        cookie = cookiechocobo;
        content = content.trim().substring(0, content.trim().length - 2)
    } else if (content.trim().endsWith("猪")) {
        cookie = cookiemog;
        content = content.trim().substring(0, content.trim().length - 2)
    } else if (content.trim().endsWith("猫")) {
        cookie = cookiecat;
        content = content.trim().substring(0, content.trim().length - 2)
    } else {
        cookie = cookiecat;
    }
*/

function ff14MarketReply0(content,qq,callback,cookie) {
    var n = content.indexOf('[CQ:image');
    if (n >= 0) {
        var s1 = content.substring(n + 1);
        var n1 = s1.indexOf('https://');
        var s2 = s1.substring(n1 + 8);
        if (n1 < 0) {
            n1 = s1.indexOf('http://');
            s2 = s1.substring(n1 + 7);
        }
        var n2 = s2.indexOf('?');
        var url = 'http://' + s2.substring(0, n2);
        var cb = function (ret) {
            var rn = ret.split('\n');
            if (rn.length == 1) {
                var wd = rn[0];
                ff14MarketReply1(wd.trim(), qq, callback, cookie);
            } else {
                var wd = rn[0];
                ff14MarketReply1(wd.trim(), qq, callback, cookie);
            }
        }
        baiduocr(url, cb);
    } else {
        ff14MarketReply1(content, qq, callback, cookie);
    }
}


function ff14MarketReply1(content,qq,callback,cookie){
  if(parseInt(content)>1000){
    itemMarket(parseInt(content),parseInt(content),callback,cookie);
  }else{
    searchID(content,callback,cookie);
  }
}

function searchID(str,callback,cookie){
  var url = 'https://cafemaker.wakingsands.com/search?indexes=item&string='+encodeURIComponent(str)+'&limit=15'
    request({
        url: url,
        method: "GET",
      proxy:'http://192.168.17.241:2346',
        headers:{
            'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
            'referer':'https://universalis.app/',
            'Cookie':cookie
        }
    }, function(error, response, body) {
        if (error && error.code) {
            console.log('pipe error catched!')
            console.log(error);
        } else {
          var data = JSON.parse(body);
          var results = data.Results;
          if(results.length==1){
            var itemid = results[0].ID;
            var itemname = results[0].Name;
            itemMarket(itemid,itemname,callback,cookie);
          }else{
            var ret = "请选择：\n";
            for(var i=0;i<results.length;i++){
              ret = ret + "ffid "+results[i].ID+"\t:\t"+results[i].Name+"\n";
            }
            callback(ret.trim())
          }
        }
    });
}

itemMarket(27874,'mmm',function(){},cookiecat);

function itemMarket(itemid,itemname,callback,cookie){
  if(!itemid){
    itemid=27874;
  }
  var url = 'https://universalis.app/market/'+itemid;
    request({
        url: url,
        method: "GET",
        proxy:'http://192.168.17.241:2346',
        headers:{
          'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
            'referer':'https://universalis.app/',
            'Cookie': cookie
        }
    }, function(error, response, body){
        if(error&&error.code){
            console.log('pipe error catched!')
            console.log(error);
        }else{


          const dom = new JSDOM(html);
          const tables = dom.window.document.querySelectorAll('div.product_table table');
          var pricelist = [];
          const data = [];
          var c=0
          tables.forEach(table => {
            c++;
            const rows = table.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td');
              const item = {
                s: cells[1].textContent.trim(),
                p: cells[5].textContent.trim(),
                n: cells[6].textContent.trim(),
                m: cells[9].textContent.trim()
              };
              if(c==1){
                pricelist.push(item)
              }
              data.push(item);
            }
          });


          renderImage(itemname, [], pricelist, [], [], [] ,false, function(r){callback(itemname+"\n"+r)})
          return
        }
    })
}

function renderImage(itemname, updatelist, pricelist, his, pricelistnq, hisnq, hasnq, callback) {
  let width = GLOBAL_MARGIN * 3 + TABLE_WIDTH.reduce((p, c) => p + c) * 2
  let height =
    GLOBAL_MARGIN * 2 +
    ITEM_TITLE + GLOBAL_MARGIN +
    Math.ceil(updatelist.length / SERVER_PER_ROW) * SERVER_LIST + GLOBAL_MARGIN +
    TABLE_HEIGHT + TABLE_LABEL +
    (hasnq ? (TABLE_HEIGHT + TABLE_LABEL) : 0) +
    (Math.max(pricelist.length, his.length) + Math.max(pricelistnq.length, hisnq.length)) * TABLE_HEIGHT +
    (hasnq ? GLOBAL_MARGIN : 0)
  
  // console.log('=========================')
  // console.log(updatelist)
  // console.log(pricelist)
  // console.log(his)
  // console.log(pricelistnq)
  // console.log(hisnq)
  // console.log(Math.max(pricelist.length, his.length) + Math.max(pricelistnq.length, hisnq.length))
  // console.log(width)
  // console.log(height)

  let canvas = createCanvas(width, height)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgb(28,28,28)'
  ctx.fillRect(0, 0, width, height)
  let offsetTop = GLOBAL_MARGIN
  /* TITLE */
  fillText(ctx, itemname, 30, ITEM_TITLE, GLOBAL_MARGIN, offsetTop, '#eee')
  fillText(ctx, '更新时间', 20, ITEM_TITLE, GLOBAL_MARGIN + ctx.measureText(itemname).width + GLOBAL_MARGIN, offsetTop, '#e6e6e6', 3)
  offsetTop += ITEM_TITLE
  offsetTop += GLOBAL_MARGIN
  updatelist.forEach((server, index) => {
    let left = GLOBAL_MARGIN + (width - 2 * GLOBAL_MARGIN) / SERVER_PER_ROW * (index % SERVER_PER_ROW)
    fillText(
      ctx,
      server.s,
      20,
      SERVER_LIST,
      left,
      offsetTop + parseInt(index / SERVER_PER_ROW) * SERVER_LIST,
      '#555'
    )
    left += ctx.measureText(server.s).width + GLOBAL_MARGIN
    fillText(
      ctx,
      server.t,
      20,
      SERVER_LIST,
      left,
      offsetTop + parseInt(index / SERVER_PER_ROW) * SERVER_LIST,
      '#fff'
    )
  })
  offsetTop += (Math.ceil(updatelist.length / SERVER_PER_ROW) * SERVER_LIST + GLOBAL_MARGIN)
  renderTable(
    ctx,
    `${hasnq ? 'HQ ': ''}当前价格`,
    [
      {
        text: '服务器',
      },
      {
        text: '价格'
      },
      {
        text: '数量'
      },
      {
        text: '出售者'
      },
    ],
    pricelist.map(item => {
      return [
        {
          text: `${item.s}`
        },
        {
          text: `${item.p}`,
          option: {
            color: '#dddc87'
          }
        },
        {
          text: `${item.n}`,
          option: {
            color: '#aaa'
          }
        },
        {
          text: `${item.m}`
        }
      ]
    }),
    GLOBAL_MARGIN,
    offsetTop
  )
  renderTable(
    ctx,
    `${hasnq ? 'HQ ': ''}交易历史`,
    [
      {
        text: '服务器'
      },
      {
        text: '价格'
      },
      {
        text: '数量'
      },
      {
        text: '日期'
      },
    ],
    his.map(item => {
      return [
        {
          text: `${item.s}`
        },
        {
          text: `${item.p}`,
          option: {
            color: '#dddc87'
          }
        },
        {
          text: `${item.n}`,
          option: {
            color: '#aaa'
          }
        },
        {
          text: `${item.t}`
        }
      ]
    }),
    GLOBAL_MARGIN * 2 + TABLE_WIDTH.reduce((p, e) => p + e),
    offsetTop
  )
  offsetTop += GLOBAL_MARGIN + TABLE_LABEL
  if(hasnq){
    offsetTop += (Math.max(pricelist.length, his.length) + 1) * TABLE_HEIGHT

    renderTable(
      ctx,
      `NQ 当前价格`,
      [
        {
          text: '服务器'
        },
        {
          text: '价格'
        },
        {
          text: '数量'
        },
        {
          text: '出售者'
        },
      ],
      pricelistnq.map(item => {
        return [
          {
            text: `${item.s}`
          },
          {
            text: `${item.p}`,
            option: {
              color: '#dddc87'
            }
          },
          {
            text: `${item.n}`,
            option: {
              color: '#aaa'
            }
          },
          {
            text: `${item.m}`
          }
        ]
      }),
      GLOBAL_MARGIN,
      offsetTop
    )
    renderTable(
      ctx,
      `NQ 交易历史`,
      [
        {
          text: '服务器'
        },
        {
          text: '价格'
        },
        {
          text: '数量'
        },
        {
          text: '日期'
        },
      ],
      hisnq.map(item => {
        return [
          {
            text: `${item.s}`
          },
          {
            text: `${item.p}`,
            option: {
              color: '#dddc87'
            }
          },
          {
            text: `${item.n}`,
            option: {
              color: '#aaa'
            }
          },
          {
            text: `${item.t}`
          }
        ]
      }),
      GLOBAL_MARGIN * 2 + TABLE_WIDTH.reduce((p, e) => p + e),
      offsetTop
    )
  }












  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  sendImageMsgBuffer(dataBuffer, `${new Date().getTime()}_${itemname}`, 'ff14/market', msg => {
    callback(msg)
  })

  // fs.writeFile(path.join(__dirname, `${itemname}.png`), dataBuffer, function(err) {
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log("保存成功！");
  //   }
  // });

}

const fillText = (ctx, text, fontSize, lineHeight, offsetLeft, offsetTop, color = '#000', lineDown = 0) => {
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  // ctx.strokeStyle = '#f00'
  // ctx.strokeRect(offsetLeft, offsetTop, ctx.measureText(text).width, lineHeight)
  ctx.fillText(text, offsetLeft, offsetTop + lineHeight - (lineHeight - fontSize) / 2 + lineDown)
}

const renderTable = (ctx, label, thead, tbody, offsetLeft, offsetTop) => {
  fillText(
    ctx,
    label,
    20,
    TABLE_LABEL,
    offsetLeft,
    offsetTop,
    '#666d81',
    -10
  )
  let rowDown = 0
  if(thead.length) {
    thead.forEach((th, index) => {
      let option = th.option || {}, defaultOption = Object.assign({
        bgColor: '#434857'
      }, option)
      renderTd(
        ctx,
        offsetLeft + TABLE_WIDTH.slice(0, index).reduce((p, e) => p + e, 0),
        offsetTop + TABLE_LABEL,
        TABLE_WIDTH[index],
        th.text,
        defaultOption
      )
    })
    rowDown = 1
  }
  tbody.forEach((tr, row) => {
    tr.forEach((td, col) => {
      renderTd(
        ctx,
        offsetLeft + TABLE_WIDTH.slice(0, col).reduce((p, e) => p + e, 0),
        offsetTop + (row + rowDown) * TABLE_HEIGHT + TABLE_LABEL,
        TABLE_WIDTH[col],
        td.text,
        td.option || {}
      )
    })
  })

}

const renderTd = (ctx, offsetLeft, offsetTop, twidth, msg, options) => {
  let option = Object.assign({
    bold: false,
    size: 16,
    color: '#fff',
    bgColor: '#21242c',
    borderColor: '#393e4a',
    ignoreBorder: false,
    colspan: 0,
    textAlign: 'left'
  }, options)
  ctx.fillStyle = option.bgColor
  ctx.fillRect(offsetLeft, offsetTop, twidth, TABLE_HEIGHT)
  ctx.font = `${option.bold ? 'normal' : 'bold'} ${option.size}px ${fontFamily}`
  ctx.fillStyle = option.color
  let tw = ctx.measureText(msg).width
  switch (option.textAlign) {
    case 'center':
      ctx.fillText(msg, offsetLeft + (twidth - tw) / 2, offsetTop + (TABLE_HEIGHT - option.size) / 2 + option.size)
      break;
    case 'left':
      ctx.fillText(msg, offsetLeft + 10, offsetTop + (TABLE_HEIGHT - option.size) / 2 + option.size)
      break;
    case 'right':
      ctx.fillText(msg, offsetLeft + twidth - tw - 10, offsetTop + (TABLE_HEIGHT - option.size) / 2 + option.size)
      break;
  }
  if(!option.ignoreBorder) {
    ctx.beginPath()
    ctx.strokeStyle = option.borderColor
    // console.log('=====')
    // console.log(offsetLeft)
    ctx.moveTo(offsetLeft, offsetTop + TABLE_HEIGHT)
    ctx.lineTo(offsetLeft + twidth, offsetTop + TABLE_HEIGHT)
    ctx.stroke()
  }
}


function drawMarketImage(updatelist,pricelist,his,itemname,callback,pricelistnq,hisnq,nq){

    console.log(updatelist);
    console.log(pricelist);
    console.log(his);
    console.log(pricelistnq);
    console.log(hisnq)

    var img1 = new imageMagick("static/blank.png");
    var height = 600;
    if(nq){
        height = 1100;
    }
    img1.resize(1000,height,'!') //加('!')强行把图片缩放成对应尺寸150*150！
        .autoOrient()
        .fontSize(20)
        .fill('blue')
        /*
         dfgw.ttf 默认 华康少女字体
         STXIHEI.TTF 华文细黑
         */
        .font('./static/dfgw.ttf')
     //   .drawText(0,0,"aaaa",'NorthWest');
    img1.drawText(25,15,itemname+"      更新时间",'NorthWest');
    for(var i=0;i<updatelist.length;i++){
            img1.drawText(25,60+15*i,updatelist[i].s,'NorthWest');
            img1.drawText(205,60+15*i,updatelist[i].t,'NorthWest');
            if(i<updatelist.length-1){
                i=i+1;
                img1.drawText(425,60+15*(i-1),updatelist[i].s,'NorthWest');
                img1.drawText(605,60+15*(i-1),updatelist[i].t,'NorthWest');
            }
    }
    var updateheight = Math.ceil(updatelist.length/2)*30;

    if(nq){
        img1.drawText(25,75+updateheight,'当前价格HQ','NorthWest');
        img1.drawText(25+500,75+updateheight,'成交记录HQ','NorthWest');
    }else{
        img1.drawText(25,75+updateheight,'当前价格','NorthWest');
        img1.drawText(25+500,75+updateheight,'成交记录','NorthWest');
    }


    for(var i=0;i<pricelist.length;i++){
        img1.drawText(25,120+updateheight+40*i,pricelist[i].p+"*"+pricelist[i].n,'NorthWest');
        img1.drawText(200,120+updateheight+40*i,pricelist[i].s,'NorthWest');
        img1.drawText(350,120+updateheight+40*i,pricelist[i].m,'NorthWest');
    }

    for(var i=0;i<his.length;i++){
        img1.drawText(25+500,120+updateheight+40*i,his[i].p+"*"+his[i].n,'NorthWest');
        img1.drawText(200+500,120+updateheight+40*i,his[i].s,'NorthWest');
        img1.drawText(350+500,120+updateheight+40*i,his[i].t,'NorthWest');
    }
    if(nq){
        img1.drawText(25,520+updateheight,'当前价格NQ','NorthWest');
        img1.drawText(25+500,520+updateheight,'成交记录NQ','NorthWest');
        for(var i=0;i<pricelistnq.length;i++){
            img1.drawText(25,560+updateheight+40*i,pricelistnq[i].p+"*"+pricelistnq[i].n,'NorthWest');
            img1.drawText(200,560+updateheight+40*i,pricelistnq[i].s,'NorthWest');
            img1.drawText(350,560+updateheight+40*i,pricelistnq[i].m,'NorthWest');
        }
        for(var i=0;i<hisnq.length;i++){
            img1.drawText(25+500,560+updateheight+40*i,hisnq[i].p+"*"+hisnq[i].n,'NorthWest');
            img1.drawText(200+500,560+updateheight+40*i,hisnq[i].s,'NorthWest');
            img1.drawText(350+500,560+updateheight+40*i,hisnq[i].t,'NorthWest');
        }
    }
    //img1.write("1.png",function(err){})

    sendGmImage(img1,itemname,callback);
}




let getPic = async ( itemid ,callback) => {
    //url路径
    let url        = 'https://universalis.app/market/'+itemid;
    console.log(url);
    //创建一个实例
    const instance = await phantom.create();
    //创建一个页面
    const page     = await instance.createPage();
    //设置页面参数
    await page.property( 'viewportSize' , { width : 1200 , height : 2400 } );

    //打开url，返回状态（url有转码，解决中文问题）
    const status = await page.open( url);
    if(status=='success'){
        const bb = await page.evaluate(function () {
            return document.getElementsByClassName('ffiv-container')[0].getBoundingClientRect();
        });
        //page.clipRect = { top: 0, left: 0, width: 1024, height: 768 };
        await page.property('clipRect', {
            top:    bb.top,
            left:   bb.left,
            width:  bb.width,
            height: bb.height
        })
        // 按照实际页面的高度，设定渲染的宽高
        //延时等待页面js执行完成（phantomjs只是等待页面上全部资源加载完毕，不包含页面js执行时间，所以需延时一段时间等待js）
        await lateTime( 1000 );
        //输出页面到当前目录下
        var now = new Date();
        var filename = "../coolq-data/cq/data/image/send/ff14/"+itemid+".png";
        //filename="1.png";
        console.log(filename);
        await page.render(filename);
        //销毁实例
        await instance.exit();
        callback('[CQ:image,file=send/ff14/'+itemid+'.png]');
    }
};



module.exports={
    ff14MarketReply,
    itemMarket
}