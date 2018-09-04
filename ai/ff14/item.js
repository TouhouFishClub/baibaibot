var https=require('https');
var http = require('http');
var fs = require('fs');
const phantom = require('phantom');



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


function searchFF14Item(content,UserName,callback){


  content = "16347";


  content=content.trim();
  var ci = parseInt(content);
  if(ci>0&&ci<100000){
    searchFF14ItemByID(content,UserName,callback);
    return;
  }


  var options = {
    host: 'cdn.huijiwiki.com',
    port: 80,
    path: '/ff14/api.php?format=json&action=parse&disablelimitreport=true&prop=text&title=ItemSearch&text=%7B%7BItemSearch%7Cname='+encodeURIComponent(content)+'%7C%7D%7D',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };


  console.log(options)
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
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

      }else{

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


function searchFF14ItemByID(itemid,username,callback){
  var options = {
    host: 'cdn.huijiwiki.com',
    port: 80,
    path: '/ff14/api.php?format=json&action=parse&disablelimitreport=true&prop=text&text=%7B%7BItemTooltip%7Cid='+itemid+'%7D%7D',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };


  console.log(options)
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      var text = data.parse.text['*'];
      // text=text.replace(/<div class="mw-parser-output">/g,'<div style="float:left" class="mw-parser-output">');
      text = '<div style="max-width:385px">'+text+'<br> </br></div>';
      var itemhtml = ita[0]+text+ita[1];
      var path = 'ff14/item/'+itemid+'.html'
      fs.writeFileSync('public/'+path,itemhtml);
      getPic(path,itemid,callback)

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
      return document.getElementsByTagName('div')[0].getBoundingClientRect();
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












module.exports={
  searchFF14Item,
  searchFF14ItemByID
}