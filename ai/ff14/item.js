var https=require('https');
var http = require('http');
var fs = require('fs');
const phantom = require('phantom');
const {baiduocr} = require('../image/baiduocr');


var basetime = 1536309600000;  //Sat Sep 06 2018 08:00:00 GMT+0800


var head = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
head = head + '<html xmlns="http://www.w3.org/1999/xhtml">';
head = head + '<head>';
head = head + '<link href="http://cha.17173.com/ff14/css/style.css?version=201512291400" rel="stylesheet" type="text/css" />';
head = head + '</head>';
head = head + '<body>';
head = head + '<div class="container">';
head = head + '<div class="wrap">';
head = head + '<div class="table prop lazyloadimg">';

var tail = '</div></div></div></body></html>';

var itemListTemplate = fs.readFileSync('ff14/item_list_template.html','utf-8')
var ila = itemListTemplate.split('~');

function searchFF14Item(content,UserName,callback){
  content=content.trim();
  if(content==""){
    var ret = "FF14物品查询器\n输入格式【ffiv+物品ID/名称】\n";
    ret = ret + "支持模糊查询\n绝对查询请在末尾加感叹号如【ffiv棉布！】\n"
    ret = ret + "支持图片文字识别,如【ffiv+图片】\n";
    ret = ret + "最新一周时尚品鉴【时尚品鉴】\n";
    ret = ret + "logs查询【fflog】【cnlog】\n";
    ret = ret + "优雷卡天气查询【常风天气】【恒冰天气】【涌火天气】【丰水天气】";

    callback(ret);
    return;
  }
  var n = content.indexOf('[CQ:image');
  if(n>=0){
    var s1 = content.substring(n+1);
    var n1 = s1.indexOf('https://');
    var s2 = s1.substring(n1+8);
    var n2 = s2.indexOf('?');
    var url = 'http://'+s2.substring(0,n2);
    var cb = function(ret){
      var rn = ret.split('\n');
      if(rn.length==1){
        var wd = rn[0];
        searchFF14Item_d(wd.trim(),UserName,callback);
      }else{
        var wd = rn[0];
        searchFF14Item_d(wd.trim(),UserName,callback);
      }
    }
    baiduocr(url,cb);
  }else{
    searchFF14Item_d(content,UserName,callback)
  }
}


function searchFF14Item_d(content,UserName,callback){
  var ci = parseInt(content);
  if(ci>0&&ci<100000){
    searchFF14ItemByID(content,UserName,callback);
    return;
  }
  if(content.endsWith("!")||content.endsWith("！")){
    getAbsuloteItemDetail(content.substring(0,content.length-1),UserName,callback);
    return;
  }
  var showlist=false;
  if(content.endsWith("#")){
    showlist=true;
    content=content.substring(0,content.length-1);
  }
  var options = {
    host: 'cdn.huijiwiki.com',
    port: 80,
    path: '/ff14/api.php?format=json&action=parse&disablelimitreport=true&prop=text&title=ItemSearch&text=%7B%7BItemSearch%7Cname='+encodeURIComponent(content)+'%7C%7D%7D',
    method: 'GET',
    headers: {
      'referer': 'http://ff14.huijiwiki.com/wiki/ItemSearch?name='+encodeURIComponent(content),
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };
  console.log(options);
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
        
      
      
      data = eval('('+resdata+')');
      var text = data.parse.text['*'];

      var n1 = text.indexOf('共有 1 个符合条件的物品');
      var n2 = text.indexOf('没有找到符合条件的物品');

      if(n1>0){
        var n = text.indexOf('data-name="');
        if(n>0){
          var s1 = text.substring(n+11);
          var n0 = s1.indexOf('"');
          var id = s1.substring(0,n0);
          console.log('id:'+id);
          searchFF14ItemByID(id,UserName,callback)
        }else{
          console.log('err');
        }
      }else if(n2>0){
        callback('没有找到【'+content+'】的物品')
      }else{
        var hs = ''
        var s1 = text;
        var n = s1.indexOf('data-name="');
        var us = '';
        var c=0;
        var abitemid = 0;
        while(n>0){
          c++;
          hs = hs + s1.substring(0,n+5);
          s1 = s1.substring(n+5);
          var n4 = s1.indexOf('"');
          var s4 = s1.substring(n4+1);
          var n5 = s4.indexOf('"');
          var itemid = s4.substring(0,n5)
          var n6 = s1.indexOf('</a></div><div class="item-category"');
          var s6 = s1.substring(0,n6);
          var n7 = s6.lastIndexOf('>');
          var itemname = s6.substring(n7+1);
          if(itemname==content){
            abitemid = parseInt(itemid);
            if(showlist==false){
              break;
            }
          }
          if(c<15){
            us = us + 'ffiv'+itemid+':'+itemname+'\n';
          }
          var n1 = s1.indexOf('<div class="item-icon')
          var fs1 = s1.substring(0,n1);
          var es1 = s1.substring(n1);
          s1 = fs1+es1;
          n = s1.indexOf('data-name=');
        }
        // hs=hs+s1
        // hs = '<div style="float:left">'+hs+'</div>';
        // var uh = ila[0]+hs+ila[1];
        // var rd = new Date().getTime();
        // var path = 'ff14/item/'+rd+'.html'
        // fs.writeFileSync('public/'+path,uh);
        if(c>12){
          us = us + '精确查询请输如【ffiv'+content+'!】,帮助请输入【ffiv】,';
        }
        if(showlist==false&&abitemid>0){
          searchFF14ItemByID(abitemid,UserName,callback)
        }else{
          callback(us)
        }

      }



    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

var itemTemplate = fs.readFileSync('ff14/item_template.html','utf-8')
var ita = itemTemplate.split('~');


function searchFF14ItemByID(itemid,username,callback,detailresdata){
  var filename = "../coolq-data/cq/data/image/send/ff14/"+itemid+".png";
  var exist = fs.existsSync(filename);
  if(exist){
    var stat = fs.statSync(filename);
    var ctime = stat.ctime;
    var now = new Date();
    if(now.getTime()-ctime.getTime()<86400000*3){
      callback('[CQ:image,file=send/ff14/'+itemid+'.png]');
      return;
    }
  }
  var options = {
    host: 'cdn.huijiwiki.com',
    port: 80,
    path: '/ff14/api.php?format=json&action=parse&disablelimitreport=true&prop=text&text=%7B%7BItemTooltip%7Cid='+itemid+'%7D%7D',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
      'referer':'https://ff14.huijiwiki.com/wiki/ItemSearch'
    },
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      var text = data.parse.text['*'];
      var n1 = text.indexOf('tooltip-item--name-title');
      var s1 = text.substring(n1);
      var n2 = s1.indexOf('>');
      var s2 = s1.substring(n2+1);
      var n3 = s2.indexOf('<');
      var itemname = s2.substring(0,n3);
      console.log(itemname)
      if(text.indexOf('商店：')>0||text.indexOf('采集：')>0||text.indexOf('制造：')>0){
        getItemDetail(itemname,text,itemid,username,callback,detailresdata);
      }else{
        text = '<div class="ffiv-container" style="float:left">'+text+'</div>';
        var itemhtml = ita[0]+text+ita[1];
        var path = 'ff14/item/'+itemid+'.html'
        fs.writeFileSync('public/'+path,itemhtml);
        getPic(path,itemid,callback)
      }
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function getItemDetail(itemname,text,itemid,userName,callback,detailresdata){
  if(detailresdata){

  }else{

  }
  var options = {
    host: 'ff14.huijiwiki.com',
    port: 80,
    path: '/wiki/%E7%89%A9%E5%93%81:'+encodeURIComponent(itemname),
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var n1 = resdata.indexOf('该物品在商店购买的价格为');
      var hs = '';
      if(n1>0){
        var s1 = resdata.substring(n1);
        var n2 = s1.indexOf('<table');
        var s2 = s1.substring(n2);
        var n5 = s2.indexOf('/table>');
        var s3 = s2.substring(0,n5);
        var n3 = s3.indexOf('</tr>');
        var c=0;
        while(n3>0){
          c++;
          if(c>6){
            break;
          }
          hs = hs+s3.substring(0,n3+3);
          s3 = s3.substring(n3+3);
          n3 = s3.indexOf('</tr>');
        }
        hs=hs+'</table>';
      }


      var n7 = resdata.indexOf('本物品可以由');
      var cs = '';
      if(n7>0){
        var s7 = resdata.substring(n7+1);
        var n8 = s7.indexOf('<div>');
        var n9 = s7.indexOf('<h2>');
        var s8 = s7.substring(n8,n9);
        
        


        var n10 = s8.indexOf('<table');
        var s10 = s8.substring(n10+3);
        var n11 = s10.indexOf('colspan');
        var s11 = s10.substring(0,n11);
        var n12 = s11.lastIndexOf('</tr>');
        var n13 = s10.indexOf('<tr');
        var s14 = s10.substring(n12+5);
        var n14 = s14.indexOf('<div id="node');
        if(n14>0){
          s14 = s14.substring(0,n14);
        }
        
        var s13 = s8.substring(0,n10)+'<ta'+s10.substring(0,n13)+s14;
        cs = s13;

      }
      var cc=0;
      var nocache = false;
      while (true){
        cc++;
        if(cc>4){
          break;
        }
        var n01 = cs.indexOf('正在初始化');
        console.log("n01:"+n01)
        if(n01<0){
          break;
        }else{
          nocache = true;
          var s01 = cs.substring(n01+1);
          var n02 = s01.indexOf('艾')
          var s02 = s01.substring(n02+1);
          var n03 = s02.indexOf('<');
          var ff14time = s02.substring(0,n03).trim();
          var hour = parseInt(ff14time.split(':')[0]);
          var minute = parseInt(ff14time.split(':')[1]);
          var timeleft = getNearestLocaltimeByFF14time(hour,minute);
          var future = timeleft.ts;
          var hour = new Date(future).getHours();
          var minute = new Date(future).getMinutes();
          var second = new Date(future).getSeconds();
          var futurelocaltime = ''+(hour<9?'0'+hour:hour)+":"+(minute<9?'0'+minute:minute)+":"+(second<9?'0'+second:second)

          var leftms = timeleft.left;
          if(leftms>65*60000){
            leftms = leftms-65*60000;
            var min = Math.floor(leftms/60000);
            var sec = Math.floor(leftms/1000)-min*60;
            var leftstr = '出现中 '+(min<9?'0'+min:min)+":"+(sec<9?'0'+sec:sec)
          }else{
            var min = Math.floor(leftms/60000);
            var sec = Math.floor(leftms/1000)-min*60;
            var leftstr = '等待中 '+(min<9?'0'+min:min)+":"+(sec<9?'0'+sec:sec)
          }

          var n04 = s01.indexOf('本&#160;??:??');
          var s04 = s01.substring(n04);
          var n05 = s04.indexOf('<');
          var s05 = s04.substring(n05);


          var ucs = '';
          var n06 = s01.indexOf('<');
          ucs = cs.substring(0,n01)+leftstr+s01.substring(n06,n04)+futurelocaltime+s05
          cs = ucs
        }
      }


      var nc1 = resdata.indexOf('制作材料');
      var ch = '';
      if(nc1>0){
        var sc1 = resdata.substring(nc1+1);
        var nc2 = sc1.indexOf('<tr>');
        var sc2 = sc1.substring(nc2);
        var nc3 = sc2.indexOf('</tr>');
        ch = sc2.substring(0,nc3+5);
        ch = '<table class="wikitable item-craft-table filter-div--item">'+ch+'</table>';
      }
      if(ch!=''){
        if(hs.length>10){
          hs = '<div class="mw-parser-output"><div class="table-responsive">'+hs+cs+'</div></div>';
        }else{
          hs = '<div class="mw-parser-output"><div class="table-responsive">'+cs+ch+'</div></div>';
        }
      }else{
        hs = '<div class="mw-parser-output"><div class="table-responsive">'+hs+cs+ch+'</div></div>';
      }


      var itemhtml = '';
      itemhtml = ita[0]+'<div class="ffiv-container" style="float:left">'+text+hs+'</div>'+ita[1];
      var path = 'ff14/item/'+itemid+'.html'
      fs.writeFileSync('public/'+path,itemhtml);
      getPic(path,nocache?"nocache/"+itemid:itemid,callback)
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}

function getAbsuloteItemDetail(itemname,userName,callback){
  var options = {
    host: 'ff14.huijiwiki.com',
    port: 80,
    path: '/wiki/%E7%89%A9%E5%93%81:'+encodeURIComponent(itemname),
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var str = 'xivdb.com/item/';
      var n1 = resdata.indexOf('https://ff14.huijiwiki.com/p/');
      if(n1>0){
        var s1 = resdata.substring(n1+str.length);
        var n2 = s1.indexOf('"');
        var itemid = s1.substring(0,n2).trim();
        searchFF14ItemByID(itemid,userName,callback,resdata);
      }else{
        callback('没有找到【'+itemname+'】');
      }
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}



let getPic = async ( path,itemid ,callback) => {
  //url路径
  let url        = 'http://localhost:10086/'+path;
  console.log(url);
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

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

let lateTime = ( time ) =>{
  return new Promise( function(resolve,reject){
    setTimeout(function(){
      resolve();
    }, time );
  } );
}


function getNearestLocaltimeByFF14time(hour,minute){
  var now = new Date().getTime();
  var sub = now - basetime;
  var afterday = sub % 4200000;

  console.log(hour,minute,afterday)

  var ff14time = Math.floor((hour*60+minute)/1440*70*60000);
  var nextlocaltime = afterday>ff14time?(ff14time+4200000-afterday):(ff14time-afterday);
  return {left:nextlocaltime,ts:now+nextlocaltime,h:false};
}











module.exports={
  searchFF14Item,
  searchFF14ItemByID
}
