var request=require('request');
const phantom = require('phantom');
const {baiduocr} = require('../image/baiduocr');
var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../cq/sendImage');
const fs = require('fs'),
  path = require('path'),
  {createCanvas, loadImage} = require('canvas'),
  { sendImageMsgBuffer } = require('../../cq/sendImage')

const GLOBAL_MARGIN = 20
const TABLE_WIDTH = [200, 200, 200]
const TABLE_HEIGHT = 30
const fontFamily = 'STXIHEI'
const titleHeight = 250
const chartHeight = 300


var cookiechocobo = '__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong; PHPSESSID=q4ljhu81j84gh5f13sen25eo6t; mogboard_server=LaNuoXiYa; _gat_gtag_UA_147847104_1=1';
var cookiemog = '__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong; PHPSESSID=q4ljhu81j84gh5f13sen25eo6t; mogboard_server=BaiYinXiang';
var cookiecat = '__cfduid=d044f513cc4f89bcdf5f878ef8242396f1597646052; PHPSESSID=ct7bavo5162m76ighdia55d5hd; mogboard_leftnav=off; mogboard_homeworld=no; _ga=GA1.2.43986777.1597646056; _gid=GA1.2.606319622.1597646056; _gat_gtag_UA_147847104_1=1; mogboard_server=JingYuZhuangYuan; mogboard_language=chs; mogboard_timezone=Asia/Hong_Kong';

function ff14MarketReply(content,qq,callback) {
    var cookie;
    if (content.startsWith("1 ")){
        cookie = cookiechocobo;
        content = content.substring(1);
    }else if (content.startsWith("2 ")){
        cookie = cookiemog;
        content = content.substring(1);
    }else if (content.startsWith("3 ")){
        cookie = cookiecat;
        content = content.substring(1);
    }else{
        cookie = cookiecat;
    }
    content = content.trim();
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



function itemMarket(itemid,itemname,callback,cookie){
  if(!itemid){
    itemid=29495;
  }
  var url = 'https://universalis.app/market/'+itemid;
    request({
        url: url,
        method: "GET",
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
          var x1 = body.indexOf('<title>');
          var y1 = body.substring(x1+1);
          var x2 = y1.indexOf('>');
          var y2 = y1.substring(x2+1);
          var x3 = y2.indexOf(' ');
          itemname = y2.substring(0,x3).trim();

          var m1 = body.indexOf('class="market_update_times"');
          var f1 = body.substring(m1+1);
          var m2 = f1.indexOf('<h4>');
          var updatelist = [];
          for(var i=0;i<10;i++){
            if(m2>100||m2==-1){
              break;
            }else{
              var f2 = f1.substring(m2+4);
              //console.log(f2.substring(0,200)+"\n\n111\n\n");
              var m3 = f2.indexOf('<');
              var server = f2.substring(0,m3);
              var f3 = f2.substring(m3+1);
              var m4 = f3.indexOf('<div>');
              var f4 = f3.substring(m4+5);
              var m5 = f4.indexOf('<');
              var updatetime = f4.substring(0,m5);
              f1 = f4.substring(m5+1);
              m2 = f1.indexOf('<h4>');
              updatelist.push({s:server,t:updatetime});
            }
          }
          var nq=false;
          var pricelist = [];
          var pricelistnq = [];


          var n1 = body.indexOf('<td class="price-num tac');
          var s1 = body.substring(n1+1);
          var ne = s1.indexOf('</table>');
          var sq = s1.substring(ne+1);
          var s2 = s1.substring(0,ne);
          var s3 = s2;
          var n0 = s3.indexOf('</tr>');

          while(n0>0){
            var s4 = s3.substring(0,n0);
            var n5 = s4.indexOf('class="price-server"');
            var s5 = s4.substring(n5+1);
            var n6 = s5.indexOf('<strong>');
            var s6 = s5.substring(n6+1);
            var n7 = s6.indexOf('<');
            var server = s6.substring(7,n7);
            var s7 = s6.substring(n7+1);
            var n8 = s7.indexOf('class="price-current"');
            var s8 = s7.substring(n8+1);
            var n9 = s8.indexOf('data-sort-value="');
            var s9 = s8.substring(n9+17);
            var n10 = s9.indexOf('"');
            var price = s9.substring(0,n10);
            var s10 = s9.substring(n10+1);
            var n11 = s10.indexOf('class="price-qty"');
            var s11 = s10.substring(n11+1);
            var n12 = s11.indexOf('data-sort-value="');
            var s12 = s11.substring(n12+17);
            var n13 = s12.indexOf('"');
            var num = s12.substring(0,n13);
            var s13 = s12.substring(n13+1);
            var n14 = s13.indexOf('class="price-retainer">');
            var s14 = s13.substring(n14+23);
            var n15 = s14.indexOf('<');
            var name = s14.substring(0,n15).trim();
            pricelist.push({s:server,p:price,n:num,m:name});
            s3 = s3.substring(n0+1);
            n0 = s3.indexOf('</tr>')
          }

          var m1 = sq.indexOf('<h6>NQ 价格');
          if(m1>0){
              nq = true;
              var n1 = sq.indexOf('<td class="price-num tac');
              var s1 = sq.substring(n1+1);
              var ne = s1.indexOf('</table>');
              var s2 = s1.substring(0,ne);
              var s3 = s2;
              var n0 = s3.indexOf('</tr>');

              while(n0>0){
                  var s4 = s3.substring(0,n0);
                  var n5 = s4.indexOf('class="price-server"');
                  var s5 = s4.substring(n5+1);
                  var n6 = s5.indexOf('<strong>');
                  var s6 = s5.substring(n6+1);
                  var n7 = s6.indexOf('<');
                  var server = s6.substring(7,n7);
                  var s7 = s6.substring(n7+1);
                  var n8 = s7.indexOf('class="price-current"');
                  var s8 = s7.substring(n8+1);
                  var n9 = s8.indexOf('data-sort-value="');
                  var s9 = s8.substring(n9+17);
                  var n10 = s9.indexOf('"');
                  var price = s9.substring(0,n10);
                  var s10 = s9.substring(n10+1);
                  var n11 = s10.indexOf('class="price-qty"');
                  var s11 = s10.substring(n11+1);
                  var n12 = s11.indexOf('data-sort-value="');
                  var s12 = s11.substring(n12+17);
                  var n13 = s12.indexOf('"');
                  var num = s12.substring(0,n13);
                  var s13 = s12.substring(n13+1);
                  var n14 = s13.indexOf('class="price-retainer">');
                  var s14 = s13.substring(n14+23);
                  var n15 = s14.indexOf('<');
                  var name = s14.substring(0,n15).trim();
                  pricelistnq.push({s:server,p:price,n:num,m:name,q:"NQ"});
                  s3 = s3.substring(n0+1);
                  n0 = s3.indexOf('</tr>')
              }
          }




          var ss1 = s1.substring(ne);
          var nn1 = ss1.indexOf('交易历史');
          var ss2 = ss1.substring(nn1+1);
          var nn22 = ss2.indexOf('<tbody>');
          var ss22 = ss2.substring(nn22+1);
          var nne = ss22.indexOf('</table>');
          var ssq = ss22.substring(nne+1);
          var ss3 = ss22.substring(0,nne);
          var nn0 = ss3.indexOf('</tr>');
          var his = [];
          var hisnq = [];


        while(nn0>0){
            var s4 = ss3.substring(0,nn0);
            var n5 = s4.indexOf('class="price-server"');
            var s5 = s4.substring(n5+1);
            var n6 = s5.indexOf('<strong>');
            var s6 = s5.substring(n6+1);
            var n7 = s6.indexOf('<');
            var server = s6.substring(7,n7);
            var s7 = s6.substring(n7+1);
            var n8 = s7.indexOf('class="price-current"');
            var s8 = s7.substring(n8+1);
            var n9 = s8.indexOf('data-sort-value="');
            var s9 = s8.substring(n9+17);
            var n10 = s9.indexOf('"');
            var price = s9.substring(0,n10);
            var s10 = s9.substring(n10+1);
            var n11 = s10.indexOf('class="price-qty"');
            var s11 = s10.substring(n11+1);
            var n12 = s11.indexOf('data-sort-value="');
            var s12 = s11.substring(n12+17);
            var n13 = s12.indexOf('"');
            var num = s12.substring(0,n13);
            var s13 = s12.substring(n13+1);
            var n14 = s13.indexOf('class="price-date"');
            var s14 = s13.substring(n14+17);
            var n15 = s14.indexOf('>');
            var s15 = s14.substring(n15+1);
            var n16 = s15.indexOf('<')
            var time = s15.substring(0,n16).trim();
            his.push({s:server,p:price,n:num,t:time});
            ss3 = ss3.substring(nn0+1);
            nn0 = ss3.indexOf('</tr>')
        }

            console.log("nq:"+nq)
        if(nq){

            var nn22 = ssq.indexOf('<tbody>');
            var ss22 = ssq.substring(nn22+1);
            var nne = ss22.indexOf('</table>');
            var ss3 = ss22.substring(0,nne);
            var nn0 = ss3.indexOf('</tr>');
            while(nn0>0){
                var s4 = ss3.substring(0,nn0);
                var n5 = s4.indexOf('class="price-server"');
                var s5 = s4.substring(n5+1);
                var n6 = s5.indexOf('<strong>');
                var s6 = s5.substring(n6+1);
                var n7 = s6.indexOf('<');
                var server = s6.substring(7,n7);
                var s7 = s6.substring(n7+1);
                var n8 = s7.indexOf('class="price-current"');
                var s8 = s7.substring(n8+1);
                var n9 = s8.indexOf('data-sort-value="');
                var s9 = s8.substring(n9+17);
                var n10 = s9.indexOf('"');
                var price = s9.substring(0,n10);
                var s10 = s9.substring(n10+1);
                var n11 = s10.indexOf('class="price-qty"');
                var s11 = s10.substring(n11+1);
                var n12 = s11.indexOf('data-sort-value="');
                var s12 = s11.substring(n12+17);
                var n13 = s12.indexOf('"');
                var num = s12.substring(0,n13);
                var s13 = s12.substring(n13+1);
                var n14 = s13.indexOf('class="price-date"');
                var s14 = s13.substring(n14+17);
                var n15 = s14.indexOf('>');
                var s15 = s14.substring(n15+1);
                var n16 = s15.indexOf('<')
                var time = s15.substring(0,n16).trim();
                hisnq.push({s:server,p:price,n:num,t:time,q:"NQ"});
                ss3 = ss3.substring(nn0+1);
                nn0 = ss3.indexOf('</tr>')
            }
        }
          renderImage(itemname, updatelist, pricelist, his, pricelistnq, hisnq, nq, callback)
          return
            drawMarketImage(updatelist,pricelist,his,itemname,callback,pricelistnq,hisnq,nq);


        }
    })
}

function renderImage(itemname, updatelist, pricelist, his, pricelistnq, hisnq, hasnq, callback) {
  let width = GLOBAL_MARGIN * 3 + TABLE_WIDTH.reduce((p, c) => p + c) * 2
  let height = GLOBAL_MARGIN * 2
    + (Math.max(pricelist.length, his.length) + Math.max(pricelistnq.length, hisnq.length)) * TABLE_HEIGHT
    + (hasnq ? GLOBAL_MARGIN : 0)
  
  console.log('=========================')
  console.log(pricelist)
  console.log(his)
  console.log(pricelistnq)
  console.log(hisnq)
  console.log(Math.max(pricelist.length, his.length) + Math.max(pricelistnq.length, hisnq.length))
  console.log(width)
  console.log(height)

  let canvas = createCanvas(width, height)
    , ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(0, 0, width, height)
  let offsetTop = GLOBAL_MARGIN




  let imgData = canvas.toDataURL()
  let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
  let dataBuffer = new Buffer(base64Data, 'base64')

  // sendImageMsgBuffer(dataBuffer, `${itemname}`, 'other', msg => {
  //   callback(msg)
  // })

  fs.writeFile(path.join(__dirname, `${itemname}.png`), dataBuffer, function(err) {
    if(err){
      console.log(err)
    }else{
      console.log("保存成功！");
    }
  });

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
    img1.resize(1250,height,'!') //加('!')强行把图片缩放成对应尺寸150*150！
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
            img1.drawText(180*i+25,60,updatelist[i].s,'NorthWest');
    }
    for(var i=0;i<updatelist.length;i++){
        img1.drawText(180*i+25,95,updatelist[i].t,'NorthWest');
    }
    if(nq){
        img1.drawText(25,135,'当前价格HQ','NorthWest');
        img1.drawText(25+550,135,'成交记录HQ','NorthWest');
    }else{
        img1.drawText(25,135,'当前价格','NorthWest');
        img1.drawText(25+550,135,'成交记录','NorthWest');
    }


    for(var i=0;i<pricelist.length;i++){
        img1.drawText(25,180+40*i,pricelist[i].p+"*"+pricelist[i].n,'NorthWest');
        img1.drawText(200,180+40*i,pricelist[i].s,'NorthWest');
        img1.drawText(350,180+40*i,pricelist[i].m,'NorthWest');
    }

    for(var i=0;i<his.length;i++){
        img1.drawText(25+550,180+40*i,his[i].p+"*"+his[i].n,'NorthWest');
        img1.drawText(200+550,180+40*i,his[i].s,'NorthWest');
        img1.drawText(350+550,180+40*i,his[i].t,'NorthWest');
    }
    if(nq){
        img1.drawText(25,600,itemname+"NQ",'NorthWest');
        img1.drawText(25,635,'当前价格NQ','NorthWest');
        img1.drawText(25+550,635,'成交记录NQ','NorthWest');
        for(var i=0;i<pricelistnq.length;i++){
            img1.drawText(25,680+40*i,pricelistnq[i].p+"*"+pricelistnq[i].n,'NorthWest');
            img1.drawText(200,680+40*i,pricelistnq[i].s,'NorthWest');
            img1.drawText(350,680+40*i,pricelistnq[i].m,'NorthWest');
        }

        for(var i=0;i<hisnq.length;i++){
            img1.drawText(25+550,680+40*i,hisnq[i].p+"*"+hisnq[i].n,'NorthWest');
            img1.drawText(200+550,680+40*i,hisnq[i].s,'NorthWest');
            img1.drawText(350+550,680+40*i,hisnq[i].t,'NorthWest');
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