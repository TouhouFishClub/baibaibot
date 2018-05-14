var http = require('http');
var https = require('https');
var fs = require('fs');
const phantom = require('phantom');

function getShip(content,callback){
  var options = {
    host: 'zh.moegirl.org',
    port: 443,
    path: '/%E8%88%B0%E9%98%9FCollection:%E5%90%B9%E9%9B%AA',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(resdata);
      var n1 = resdata.indexOf('<table class="wikitable"');
      var s1 = resdata.substring(n1);
      var n2 = s1.indexOf('</table>');
      var tb = s1.substring(0,n2+8);
      var htb = '<div id="content" class="mw-body" role="main"><div id="bodyContent" class="mw-body-content"><div id="mw-content-text" lang="zh-Hans" dir="ltr" class="mw-content-ltr"><div class="mw-parser-output">';
      var etb = '</div></div></div></div>';
      var hn1 = res
      var head = '<link rel="stylesheet" href="https://zh.moegirl.org/load.php?debug=false&lang=zh-hans&modules=ext.cite.styles%7Cmediawiki.legacy.commonPrint%2Cshared%7Cmediawiki.sectionAnchor%7Cmediawiki.skinning.interface%7Cskins.vector.styles&only=styles&skin=vector">';
      var html = '<html><head>'+head+'</head><body><div id="kkkk">'+tb+'</div></body></html>';
      var path = "/fh/"+new Date().getTime()+".html";
      fs.writeFileSync("public/"+path,html,"utf-8");
      getPic(path,"table",callback)
    });
  });
  req.on('error', function(err) {
    console.log('req err:');
    console.log(err);
  });
  req.end();
}



let getPic = async ( path,tag ,callback) => {
  //url路径
  let url        = 'http://localhost:10086'+path;
  //创建一个实例
  const instance = await phantom.create();
  //创建一个页面
  const page     = await instance.createPage();
  //设置页面参数
  await page.property( 'viewportSize' , { width : 1800 , height : 1600 } );

  const tagName = tag;
  //打开url，返回状态（url有转码，解决中文问题）
  const status = await page.open( url);
  if(status=='success'){
    const bb = await page.evaluate(function () {
      return document.getElementsByTagName('table')[0].getBoundingClientRect();
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
    await lateTime( 500 );
    //输出页面到当前目录下
    var now = new Date();
    var filename = "../coolq-data/cq/data/image/send/ship/"+now.getTime()+".png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();

    callback('[CQ:image,file=send/'+now.getTime()+'.png]');
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
  getShip
}