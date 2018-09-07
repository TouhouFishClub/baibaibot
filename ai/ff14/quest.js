var https=require('https');
var http = require('http');
var fs = require('fs');
const phantom = require('phantom');

var itemTemplate = fs.readFileSync('ff14/item_template.html','utf-8')
var ita = itemTemplate.split('~');


function getQuestDetail(questName,userName,callback){
  var options = {
    host: 'ff14.huijiwiki.com',
    port: 80,
    path: '/wiki/%E4%BB%BB%E5%8A%A1:'+encodeURIComponent(questName),
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
      var n1 = resdata.indexOf('<div class="quest-quick-fact');
      var n2 = resdata.indexOf('<div class="ff14-content-box-block--title">各语言名称');
      var s1 = resdata.substring(n1,n2);
      s1 = s1 + '</div>';
      var hs = ita[0]+'<div class="ffiv-container" style="float:left">'+s1+'</div>'+ita[1]
      var path = "123.html";
      fs.writeFileSync('public/'+path,hs);
      getPic(path,100,callback)
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
    var filename = "../coolq-data/cq/data/image/send/ff14/quest/"+itemid+".png";
    //filename="1.png";
    console.log(filename);
    await page.render(filename);
    //销毁实例
    await instance.exit();
    callback('[CQ:image,file=send/ff14/quest/'+itemid+'.png]');
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
  getQuestDetail
}





